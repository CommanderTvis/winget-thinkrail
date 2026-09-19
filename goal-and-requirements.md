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
`desktop-updates` feed, installation verification before adoption, automated
metadata commits, and cleanup of unadopted releases. Windows-specific packaging
and security behavior must be documented rather than copying macOS quarantine steps.

## Done conditions

A user can add the HTTPS source, discover both packages, install the native CLI
on each supported architecture, install the desktop on x64, and upgrade to the next
nightly. The desktop updater targets this distribution repository, not JetBrains
or the Homebrew tap. Unchanged source commits do not rebuild. Failed builds and
installation checks do not advance the published catalog or `nightly.sha`.

Local checks cover protocol behavior, manifest generation, and strict typing.
GitHub Windows runners perform actual installation checks, which cannot be claimed
as locally verified on macOS.

## Operational scope

The distribution is published from the public `CommanderTvis/winget-thinkrail`
repository. GitHub Releases host binaries; Cloudflare serves only WinGet metadata.
Fork build adjustments remain confined to disposable CI checkouts, not sibling
working repositories.
