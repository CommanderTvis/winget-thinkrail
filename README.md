# WinGet source for ThinkRail and SharpRail builds

Install Windows builds through one WinGet source. Packages are grouped below.

| Package | Author | Id | Architectures |
| --- | --- | --- | --- |
| [ThinkRail CLI (fork nightly)](https://github.com/CommanderTvis/thinkrail) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.ThinkRail` | x64, ARM64 |
| [ThinkRail Desktop (fork nightly)](https://github.com/CommanderTvis/thinkrail) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.ThinkRail.Desktop` | x64 |
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

This source no longer carries JetBrains' stable releases. The CLI is in the default `winget` source as `JetBrains.ThinkRailCLI`. If you installed `CommanderTvis.JetBrainsThinkRail` or `CommanderTvis.JetBrainsThinkRail.Desktop` from here, they will not receive updates; uninstall them and switch:

```powershell
winget uninstall --id CommanderTvis.JetBrainsThinkRail --exact
winget uninstall --id CommanderTvis.JetBrainsThinkRail.Desktop --exact
winget install --id JetBrains.ThinkRailCLI --exact --source winget
```

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
