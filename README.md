# ThinkRail nightlies for Windows

Install nightly builds of the [CommanderTvis ThinkRail fork](https://github.com/CommanderTvis/thinkrail) through WinGet. These builds track the `claude-code-integration-plugin-api` branch, not JetBrains releases.

- CLI: native Windows x64 and ARM64, available as `thinkrail`.
- Desktop: Windows x64 only, requiring Windows 11 or later.
- SharpRail: the [CommanderTvis SharpRail](https://github.com/CommanderTvis/sharprail) Avalonia prototype, Windows x64 only, mirrored from its `nightly` release.

## Install

Use a current version of WinGet (App Installer).

Add the source once from an administrator terminal:

```powershell
winget source add --name thinkrail --arg https://winget-thinkrail.vercel.app --type Microsoft.Rest
```

If you previously added this source with a different URL, remove it with
`winget source remove --name thinkrail`, then add the source above. Installed
packages remain installed.

Then install either package from a normal terminal:

```powershell
# CLI — WinGet selects your native architecture
winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user

# Desktop — x64 only; follow the installer prompts
winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive
```

```powershell
# SharpRail — x64 only; no command alias is added, launch client\SharpRail.UI.exe from the install folder
winget install --id CommanderTvis.SharpRail --exact --source thinkrail --scope user
```

Open a new terminal after installing the CLI if `thinkrail` is not yet on PATH.

## Updates

New builds are checked for daily at 03:00 UTC and published when the fork changes.

```powershell
winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive
winget upgrade --id CommanderTvis.SharpRail --exact --source thinkrail
```

Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork's nightly feed.

## Uninstall

```powershell
winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail
winget uninstall --id CommanderTvis.SharpRail --exact --source thinkrail
```

To remove the source, run this from an administrator terminal:

```powershell
winget source remove --name thinkrail
```

Removing the source alone does not uninstall either package or disable desktop in-app updates.

## Before installing

SharpRail's package is not installation-tested on Windows runners by this repository; its WinGet portable-zip install is unverified. The SharpRail release carries no license metadata, so the package lists the license as unknown.

These are unofficial, unsigned nightly builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.

Desktop installation is interactive; silent installation is not supported. Do not pass `--quiet` to the desktop setup executable: it is an uninstall command.

The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching distributions; do not expect them to coexist side by side.
