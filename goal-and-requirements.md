---
id: winget-nightlies
type: goal-and-requirements
status: draft
title: ThinkRail fork Windows nightlies
---

## Goal

Install and upgrade nightly Windows builds of `CommanderTvis/thinkrail`, branch
`claude-code-integration-plugin-api`, through a dedicated WinGet source hosted on
Cloudflare Free using its provided hostname, without a personal domain.

## Scope

Publish native x64 and ARM64 CLI packages and an x64-only desktop package. Do not
publish an ARM64 desktop installer or label an x64 binary as ARM64.

Mirror `~/homebrew-thinkrail`: daily 03:00 UTC and manual builds, source-commit
comparison against `nightly.sha`, timestamped nightly versions, reuse of the fork's
build tooling, GitHub prereleases with checksummed installers, the desktop's own
`desktop-updates` feed, required qualification before adoption, automated
metadata commits, and cleanup of unadopted releases. Windows-specific packaging
and security behavior must be documented rather than copying macOS quarantine steps.

## Done conditions

A user can add the HTTPS source, discover both packages, install the native CLI
on each supported architecture, install the desktop on x64, and upgrade to the next
nightly. The desktop updater targets this distribution repository, not JetBrains
or the Homebrew tap. Unchanged source commits do not rebuild. Failed builds and
required qualification checks do not advance the published catalog or `nightly.sha`.

CLI WinGet installation and upgrade checks on native x64 and ARM64 runners remain
hard publication gates. Desktop x64 qualification requires the upstream composite
build/native installer smoke and WinGet metadata/search/show validation as hard
gates. Both packages publish when these gates pass.

Automated verification must not attempt desktop WinGet installation or upgrade or
launch desktop setup through WinGet: unsigned setup triggers SmartScreen requiring user interaction.
Do not bypass Windows security or simulate clicking “Run anyway”. Manual desktop
WinGet installation/upgrade verification remains unverified and non-blocking; desktop
build/native installer smoke and metadata checks do not establish that success.

Local checks cover protocol behavior, manifest generation, and strict typing.
GitHub Windows runners perform actual CLI WinGet installation and upgrade checks,
which cannot be claimed as locally verified on macOS.

## Operational scope

The distribution is published from the public `CommanderTvis/winget-thinkrail`
repository. GitHub Releases host binaries; Cloudflare serves only WinGet metadata.
Fork build adjustments remain confined to disposable CI checkouts, not sibling
working repositories.
