# WinGet source for ThinkRail and SharpRail builds

Install Windows builds through one WinGet source. Packages are grouped below.

| Package | Author | Id | Architectures |
| --- | --- | --- | --- |
| [ThinkRail CLI (fork nightly)](https://github.com/CommanderTvis/thinkrail) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.ThinkRail` | x64, ARM64 |
| [ThinkRail Desktop (fork nightly)](https://github.com/CommanderTvis/thinkrail) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.ThinkRail.Desktop` | x64 |
| [ThinkRail CLI (JetBrains stable)](https://github.com/JetBrains/thinkrail/releases/latest) | [JetBrains](https://github.com/JetBrains) | `CommanderTvis.JetBrainsThinkRail` | x64 |
| [ThinkRail Desktop (JetBrains stable)](https://github.com/JetBrains/thinkrail/releases/latest) | [JetBrains](https://github.com/JetBrains) | `CommanderTvis.JetBrainsThinkRail.Desktop` | x64 |
| [SharpRail (nightly)](https://github.com/CommanderTvis/sharprail) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.SharpRail` | x64 |

## Add the source

Use a current version of WinGet (App Installer). Add the source once from an administrator terminal:

```powershell
winget source add --name thinkrail --arg https://winget-thinkrail.vercel.app --type Microsoft.Rest
```

If you previously added this source with a different URL, remove it with
`winget source remove --name thinkrail`, then add the source above. Installed
packages remain installed.

## ThinkRail fork nightly

Nightly builds of the [CommanderTvis ThinkRail fork](https://github.com/CommanderTvis/thinkrail), branch `claude-code-integration-plugin-api`. Checked daily at 03:00 UTC and published when the fork changes. The CLI is available as `thinkrail`; the desktop requires Windows 11 or later.

```powershell
# CLI — WinGet selects your native architecture
winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail

# Desktop — x64 only; follow the installer prompts
winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail
```

Open a new terminal after installing the CLI if `thinkrail` is not yet on PATH. Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork's nightly feed.

## ThinkRail from JetBrains (stable)

Unmodified stable releases of [JetBrains/thinkrail](https://github.com/JetBrains/thinkrail), linked from their GitHub release with its published checksums. Windows x64 only; JetBrains publishes no Windows ARM64 build. The CLI is available as `jetbrains-thinkrail` so it does not collide with the fork's `thinkrail`. The package version is the JetBrains release version and advances when a new stable release is published.

```powershell
# CLI
winget install --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail

# Desktop — follow the installer prompts
winget install --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail --scope user --interactive
winget upgrade --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail --interactive
winget uninstall --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail
```

### Verify the downloads

The JetBrains packages link directly to JetBrains' GitHub release; this source only supplies metadata. To check that the file and the hash this source advertises are exactly what JetBrains published, run this in PowerShell (Windows PowerShell 5.1 or PowerShell 7):

```powershell
$id = 'CommanderTvis.JetBrainsThinkRail'   # or CommanderTvis.JetBrainsThinkRail.Desktop
$version = (Invoke-RestMethod "https://winget-thinkrail.vercel.app/packageManifests/$id").Data.Versions[0]
$installer = $version.Installers[0]
$file = Split-Path $installer.InstallerUrl -Leaf
if (-not $installer.InstallerUrl.StartsWith('https://github.com/JetBrains/thinkrail/releases/download/')) { throw 'Not a JetBrains download URL' }
$path = Join-Path $env:TEMP $file
Invoke-WebRequest $installer.InstallerUrl -OutFile $path
$actual = (Get-FileHash $path -Algorithm SHA256).Hash
$release = Invoke-RestMethod "https://api.github.com/repos/JetBrains/thinkrail/releases/tags/v$($version.PackageVersion)"
$official = ($release.assets | Where-Object name -eq $file).digest -replace '^sha256:', ''
"Downloaded:     $actual"
"Source says:    $($installer.InstallerSha256)"
"JetBrains says: $official"
if ($actual -eq $installer.InstallerSha256 -and $actual -eq $official) { 'OK: matches JetBrains' } else { 'MISMATCH: do not install' }
```

The three hashes must agree. The comparison is case-insensitive in PowerShell. The same SHA256SUMS used for the manifest is attached to each nightly release here as `jetbrains.sha256`. JetBrains does not publish signatures or build attestations, so this proves the bytes match their release, not who built them.

## SharpRail (nightly)

The [CommanderTvis SharpRail](https://github.com/CommanderTvis/sharprail) Avalonia prototype, Windows x64 only, mirrored from its `nightly` release. No command alias is added; launch `client\SharpRail.UI.exe` from the install folder. This package is not installation-tested on Windows runners by this repository, and its WinGet portable-zip install is unverified.

```powershell
winget install --id CommanderTvis.SharpRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.SharpRail --exact --source thinkrail
winget uninstall --id CommanderTvis.SharpRail --exact --source thinkrail
```

## Remove the source

```powershell
winget source remove --name thinkrail
```

Removing the source alone does not uninstall any package or disable desktop in-app updates.

## Before installing

These are unofficial, unsigned builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.

Desktop installation is interactive; silent installation is not supported. Do not pass `--quiet` to a desktop setup executable: it is an uninstall command.

The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching distributions; do not expect them to coexist side by side.
