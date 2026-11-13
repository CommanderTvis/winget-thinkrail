# winget

This repository distributes a WinGet source with one package, `CommanderTvis.Tereditor`,
mirrored from the `tereditor-nightly-win-x64.zip` and `tereditor-nightly-win-arm64.zip`
assets of `CommanderTvis/tereditor`'s `nightly` release. Nothing is built here. The ThinkRail fork and JetBrains packages are
no longer published.

Before changing build targets, installer behavior, source identity, or publication ordering,
read `goal-and-requirements.md` and `architecture.md`. Deployment and recovery instructions
live in `architecture.md`. Keep `README.md` user-facing: installation, updates,
uninstallation, and user-visible limitations.

`catalog.json` is an ignored local build input. Nightly catalogs and source digests live
in GitHub Releases; the `publication-state` release identifies the adopted nightly.
Nightly publication must never commit or push to Git. Unchanged Tereditor zips skip
the nightly; a manual dispatch with `force=true` republishes anyway. Do not push to `main`
while a nightly runs: publication refuses a moved `main`. Edit `scripts/catalog.ts` for
manifest changes; keep its tests aligned. The README and `src/page.ts` list the same
packages, grouped per package, and must change together. Download adopted state with
`bun run catalog:adopted` before deploying; empty catalogs are only for local checks.
The source identifier is persistent installation state, not a display label.

Use `bun run check` and `bun run build` for local verification. Workflow and PowerShell
changes also require actionlint and PSScriptAnalyzer, as configured in `Check` CI.
Native Windows success requires the hosted WinGet metadata gate; macOS verification is
not a substitute. Run `scripts/test-install.ps1` only on disposable hosted runners.

Keep changes inside this repository. Tereditor build changes belong in
`CommanderTvis/tereditor`, not here.
Never add credentials to files or weaken signing, branch protection, or Windows security
to make publication pass.
