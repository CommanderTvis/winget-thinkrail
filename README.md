# WinGet source for SharpRail builds

Install Windows builds through one WinGet source.

| Package | Author | Id | Architectures |
| --- | --- | --- | --- |
| [SharpRail (nightly)](https://github.com/CommanderTvis/tereditor) | [CommanderTvis](https://github.com/CommanderTvis) | `CommanderTvis.SharpRail` | x64 |

## Add the source

Use a current version of WinGet (App Installer). Add the source once from an administrator terminal:

```powershell
winget source add --name thinkrail --arg https://winget-thinkrail.vercel.app --type Microsoft.Rest
```

If you previously added this source with a different URL, remove it with
`winget source remove --name thinkrail`, then add the source above. Installed
packages remain installed.

## SharpRail (nightly)

The [CommanderTvis SharpRail](https://github.com/CommanderTvis/tereditor) Avalonia prototype, Windows x64 only, mirrored from its `nightly` release and published when that build changes. No command alias is added; launch `client\SharpRail.UI.exe` from the install folder. Publication checks its WinGet metadata on a Windows runner, but its WinGet portable-zip install is not tested there.

```powershell
winget install --id CommanderTvis.SharpRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.SharpRail --exact --source thinkrail
winget uninstall --id CommanderTvis.SharpRail --exact --source thinkrail
```

## Remove the source

```powershell
winget source remove --name thinkrail
```

Removing the source alone does not uninstall any package.

## Before installing

These are unofficial, unsigned builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.
