# ThinkRail nightlies for Windows

Install nightly builds of the [CommanderTvis ThinkRail fork](https://github.com/CommanderTvis/thinkrail) through WinGet. These builds track the `claude-code-integration-plugin-api` branch, not JetBrains releases.

- CLI: native Windows x64 and ARM64, available as `thinkrail`.
- Desktop: Windows x64 only, requiring Windows 11 or later.

## Install

Use a current version of WinGet (App Installer).

The source is online; packages will become available after the first verified nightly is published.

Add the source once from an administrator terminal:

```powershell
winget source add --name thinkrail --arg https://winget-thinkrail.commandertvis.workers.dev --type Microsoft.Rest
```

Then install either package from a normal terminal:

```powershell
# CLI — WinGet selects your native architecture
winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user

# Desktop — x64 only; follow the installer prompts
winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive
```

Open a new terminal after installing the CLI if `thinkrail` is not yet on PATH.

## Updates

New builds are checked for daily at 03:00 UTC and published when the fork changes.

```powershell
winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive
```

Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork's nightly feed.

## Uninstall

```powershell
winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail
```

To remove the source, run this from an administrator terminal:

```powershell
winget source remove --name thinkrail
```

Removing the source alone does not uninstall either package or disable desktop in-app updates.

## Before installing

These are unofficial, unsigned nightly builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.

Desktop installation is interactive; silent installation is not supported. Do not pass `--quiet` to the desktop setup executable: it is an uninstall command.

The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching distributions; do not expect them to coexist side by side.
