# Requires PowerShell 7 on a disposable, elevated GitHub-hosted Windows runner.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Version,
    [Parameter(Mandatory)][ValidateSet('x64', 'arm64')][string]$Architecture,
    [string]$CandidateCatalog = 'artifacts/catalog.json',
    [string]$PreviousCatalog = 'catalog.json'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or !$IsWindows) {
    throw 'This destructive smoke test is restricted to disposable GitHub-hosted Windows runners.'
}
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 is required for .NET PEM exports.' }
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'An elevated runner is required.' }
$repo = Split-Path $PSScriptRoot -Parent
function Resolve-RepoPath([string]$Path) {
    if ([IO.Path]::IsPathRooted($Path)) { return [IO.Path]::GetFullPath($Path) }
    return [IO.Path]::GetFullPath((Join-Path $repo $Path))
}
function Invoke-Native([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$File $($Arguments -join ' ') failed ($LASTEXITCODE)" }
}
$candidate = @(Get-Content -Raw (Resolve-RepoPath $CandidateCatalog) | ConvertFrom-Json)
$previous = @()
if ($PreviousCatalog) { $previous = @(Get-Content -Raw (Resolve-RepoPath $PreviousCatalog) | ConvertFrom-Json) }
$ids = @('CommanderTvis.ThinkRail')
if ($Architecture -eq 'x64') { $ids += 'CommanderTvis.ThinkRail.Desktop' }
function Get-CatalogVersion($Catalog, [string]$Id) {
    $packages = @($Catalog | Where-Object PackageIdentifier -EQ $Id)
    if ($packages.Count -ne 1 -or @($packages[0].Versions).Count -ne 1) { throw "Expected one version of $Id" }
    return [string]$packages[0].Versions[0].PackageVersion
}
foreach ($id in $ids) {
    if ((Get-CatalogVersion $candidate $id) -ne $Version) { throw "Candidate $id does not match $Version" }
    if ($previous.Count -and (Get-CatalogVersion $previous $id) -eq $Version) { throw 'Baseline must differ from candidate to prove an upgrade.' }
}
$bun = (Get-Command bun -CommandType Application -ErrorAction Stop).Source
$winget = $null
$command = Get-Command winget -CommandType Application -ErrorAction SilentlyContinue
if ($command) {
    & $command.Source --version
    if ($LASTEXITCODE -eq 0) { $winget = $command.Source }
}
if (!$winget) {
    Install-Module Microsoft.WinGet.Client -RequiredVersion '1.29.280' -Scope CurrentUser -Force -Repository PSGallery
    Import-Module Microsoft.WinGet.Client -RequiredVersion '1.29.280'
    Repair-WinGetPackageManager -Version 'v1.29.290' -Verbose
    $command = Get-Command winget -CommandType Application -ErrorAction SilentlyContinue
    if ($command) { $winget = $command.Source }
    else {
        $package = Get-AppxPackage Microsoft.DesktopAppInstaller | Sort-Object Version -Descending | Select-Object -First 1
        if (!$package) { throw 'Repair did not register DesktopAppInstaller.' }
        $winget = (Resolve-Path (Join-Path $package.InstallLocation 'winget.exe')).Path
    }
    Invoke-Native $winget @('--version')
}
$smoke = Join-Path $repo '.smoke'
if (Test-Path $smoke) { throw "$smoke already exists; refusing to overwrite it." }
$cliLink = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\thinkrail.exe'
if (Test-Path $cliLink) { throw 'Runner already has ThinkRail CLI installed.' }
function Test-Installation([string]$Expected) {
    $exe = (Get-Item $cliLink -ErrorAction Stop).FullName
    $output = Invoke-Native $exe @('--version') | Out-String
    if (!$output.Contains($Expected)) { throw "CLI version mismatch: $output (expected $Expected)" }
    $stream = [IO.File]::OpenRead($exe)
    $reader = [IO.BinaryReader]::new($stream)
    try {
        if ($reader.ReadUInt16() -ne 0x5A4D) { throw 'CLI lacks DOS header' }
        $stream.Position = 0x3C
        $offset = $reader.ReadInt32()
        $stream.Position = $offset
        if ($reader.ReadUInt32() -ne 0x4550) { throw 'CLI lacks PE header' }
        $machine = $reader.ReadUInt16()
        $expectedMachine = if ($Architecture -eq 'x64') { 0x8664 } else { 0xAA64 }
        if ($machine -ne $expectedMachine) { throw "CLI machine $machine is not $Architecture" }
    } finally { $reader.Dispose(); $stream.Dispose() }
}
function Test-Package([string]$Action, $Catalog) {
    foreach ($id in $ids) {
        Invoke-Native $winget @('search', '--id', $id, '--exact', '--source', 'thinkrail-ci', '--accept-source-agreements', '--disable-interactivity')
        Invoke-Native $winget @('show', '--id', $id, '--exact', '--source', 'thinkrail-ci', '--accept-source-agreements', '--disable-interactivity')
        if ($id.EndsWith('.Desktop')) { continue }
        $arguments = @($Action, '--id', $id, '--exact', '--source', 'thinkrail-ci', '--architecture', $Architecture, '--scope', 'user', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity')
        # Do not pin --version: upgrade must correlate the installed baseline itself.
        Invoke-Native $winget $arguments
    }
    Test-Installation (Get-CatalogVersion $Catalog 'CommanderTvis.ThinkRail')
}
$cert = $null
$server = $null
$sourceAttempted = $false
$installAttempted = $false
$failure = $null
$cleanupErrors = [Collections.Generic.List[string]]::new()
function Cleanup([scriptblock]$Action) {
    try { & $Action } catch { $cleanupErrors.Add($_.ToString()); Write-Warning "Cleanup: $_" }
}
try {
    New-Item $smoke -ItemType Directory | Out-Null
    $active = Join-Path $smoke 'catalog.json'
    $initial = if ($previous.Count) { Resolve-RepoPath $PreviousCatalog } else { Resolve-RepoPath $CandidateCatalog }
    Copy-Item $initial $active
    $cert = New-SelfSignedCertificate -Subject 'CN=localhost' -TextExtension @('2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1') -CertStoreLocation 'Cert:\LocalMachine\My' -KeyAlgorithm RSA -KeyLength 2048 -KeyExportPolicy Exportable -NotAfter (Get-Date).AddDays(1) -Type SSLServerAuthentication
    $certPath = Join-Path $smoke 'localhost.pem'
    $keyPath = Join-Path $smoke 'localhost-key.pem'
    [IO.File]::WriteAllText($certPath, $cert.ExportCertificatePem())
    $key = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    try { [IO.File]::WriteAllText($keyPath, $key.ExportPkcs8PrivateKeyPem()) } finally { $key.Dispose() }
    $store = [Security.Cryptography.X509Certificates.X509Store]::new('Root', 'LocalMachine')
    try { $store.Open('ReadWrite'); $store.Add($cert) } finally { $store.Dispose() }
    $serverArguments = @((Join-Path $PSScriptRoot 'serve-source.ts'), $certPath, $keyPath, $active) | ForEach-Object { '"' + $_ + '"' }
    $server = Start-Process $bun -ArgumentList $serverArguments -WorkingDirectory $repo -PassThru -RedirectStandardOutput (Join-Path $smoke 'server.log') -RedirectStandardError (Join-Path $smoke 'server.err')
    $ready = $false
    $readinessError = 'No response received'
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($server.HasExited) { throw "Source server exited ($($server.ExitCode)): $(Get-Content (Join-Path $smoke 'server.err') -Raw)" }
        try {
            $info = Invoke-RestMethod 'https://127.0.0.1:8443/information' -TimeoutSec 2
            if ($info.Data.SourceIdentifier -ne 'CommanderTvis.ThinkRail.Nightly') { throw 'Unexpected source' }
            $ready = $true
            break
        } catch {
            $readinessError = $_.Exception.ToString()
            Start-Sleep -Seconds 1
        }
    }
    if (!$ready) { throw "Trusted HTTPS source did not become ready: $readinessError" }
    $sourceAttempted = $true
    Invoke-Native $winget @('source', 'add', '--name', 'thinkrail-ci', '--arg', 'https://127.0.0.1:8443', '--type', 'Microsoft.Rest', '--accept-source-agreements', '--disable-interactivity')
    if ($Architecture -eq 'x64') {
        $notice = 'Desktop WinGet install/upgrade is manual-only: unsigned setup may require SmartScreen approval. Automated checks cover its build smoke and WinGet metadata, not installation.'
        Write-Output $notice
        Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value $notice
    }
    $installAttempted = $true
    if ($previous.Count) {
        Test-Package 'install' $previous
        # Rename on the same volume prevents a request observing a partial catalog.
        Copy-Item (Resolve-RepoPath $CandidateCatalog) "$active.next"
        Move-Item "$active.next" $active -Force
        Invoke-Native $winget @('source', 'update', '--name', 'thinkrail-ci', '--disable-interactivity')
        Test-Package 'upgrade' $candidate
    } else { Test-Package 'install' $candidate }
} catch { $failure = $_ }
finally {
    if ($installAttempted -and (Test-Path $cliLink)) {
        Cleanup { Invoke-Native $winget @('uninstall', '--id', 'CommanderTvis.ThinkRail', '--exact', '--source', 'thinkrail-ci', '--scope', 'user', '--disable-interactivity') }
    }
    if ($sourceAttempted) { Cleanup { Invoke-Native $winget @('source', 'remove', '--name', 'thinkrail-ci', '--disable-interactivity') } }
    if ($server -and !$server.HasExited) { Cleanup { Stop-Process -Id $server.Id -Force; $server.WaitForExit() } }
    if ($cert) {
        Cleanup { Remove-Item "Cert:\LocalMachine\Root\$($cert.Thumbprint)" -ErrorAction Stop }
        Cleanup { Remove-Item "Cert:\LocalMachine\My\$($cert.Thumbprint)" -DeleteKey -ErrorAction Stop }
    }
    Cleanup {
        if (Test-Path $smoke) {
            Get-ChildItem $smoke -File | Where-Object Extension -NotIn '.log', '.err' | Remove-Item -Force
            if (!$failure -and !$cleanupErrors.Count) { Remove-Item $smoke -Recurse -Force }
        }
    }
}
if ($failure) { throw $failure }
if ($cleanupErrors.Count) { throw "Smoke passed but cleanup failed: $($cleanupErrors -join '; ')" }
Write-Output "Native $Architecture CLI install/upgrade smoke passed for $Version"
