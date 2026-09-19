# winget-thinkrail

This repository distributes the CommanderTvis ThinkRail fork, not JetBrains releases.

Before changing build targets, installer behavior, source identity, or publication ordering,
read `goal-and-requirements.md` and `architecture.md`. Deployment and recovery instructions
live in `architecture.md`. Keep `README.md` user-facing: installation, updates,
uninstallation, and user-visible limitations. Review `gotchas.md` before changing
architecture support.

`catalog.json` and `nightly.sha` are workflow-owned output. Edit `scripts/catalog.ts`
for manifest changes; keep its tests aligned. The empty bootstrap catalog is intentional.
The source identifier is persistent installation state, not a display label.

Use `bun run check` and `bun run build` for local verification. Workflow and PowerShell
changes also require actionlint and PSScriptAnalyzer, as configured in `Check` CI.
Native Windows success requires the hosted installation gates; macOS verification is
not a substitute. Run the destructive installation script only on disposable hosted runners.

Keep changes inside this repository. Fork build adjustments belong in disposable CI
checkouts unless the user separately authorizes changes to their ThinkRail repository.
Never add credentials to files or weaken signing, branch protection, or Windows security
to make publication pass.
