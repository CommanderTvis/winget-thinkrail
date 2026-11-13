# Requires PowerShell 7 on a disposable, elevated GitHub-hosted Windows runner.
# Trusts a throwaway localhost certificate and adds a temporary WinGet source.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Version,
    [string]$CandidateCatalog = 'artifacts/catalog.json'
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
$ids = @('CommanderTvis.Tereditor')
foreach ($id in $ids) {
    $packages = @($candidate | Where-Object PackageIdentifier -EQ $id)
    if ($packages.Count -ne 1 -or @($packages[0].Versions).Count -ne 1) { throw "Expected one version of $id" }
    if ([string]$packages[0].Versions[0].PackageVersion -ne $Version) { throw "Candidate $id does not match $Version" }
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
function Test-Package {
    foreach ($id in $ids) {
        Invoke-Native $winget @('search', '--id', $id, '--exact', '--source', 'thinkrail-ci', '--accept-source-agreements', '--disable-interactivity')
        Invoke-Native $winget @('show', '--id', $id, '--exact', '--source', 'thinkrail-ci', '--accept-source-agreements', '--disable-interactivity')
    }
}
$cert = $null
$server = $null
$sourceAttempted = $false
$failure = $null
$cleanupErrors = [Collections.Generic.List[string]]::new()
function Cleanup([scriptblock]$Action) {
    try { & $Action } catch { $cleanupErrors.Add($_.ToString()); Write-Warning "Cleanup: $_" }
}
try {
    New-Item $smoke -ItemType Directory | Out-Null
    $active = Join-Path $smoke 'catalog.json'
    Copy-Item (Resolve-RepoPath $CandidateCatalog) $active
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
    $notice = 'Tereditor WinGet installation is not automated: this gate covers WinGet metadata, search, and show only.'
    Write-Output $notice
    Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value $notice
    Test-Package
} catch { $failure = $_ }
finally {
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
Write-Output "WinGet metadata smoke passed for $Version"
