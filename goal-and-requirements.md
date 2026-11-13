---
id: winget-nightlies
type: goal-and-requirements
status: draft
title: Tereditor Windows nightlies
---

## Goal

Install and upgrade nightly Windows builds of Tereditor, published by
`CommanderTvis/tereditor` in its `nightly` release, through a dedicated WinGet source
hosted on Vercel Hobby using its provided hostname, without a personal domain.

## Scope

Publish one package, `CommanderTvis.Tereditor`, with x64 and ARM64 installers mirrored
from the `SharpRail-nightly-win-x64.zip` and `SharpRail-nightly-win-arm64.zip` assets.
This repository builds nothing.

Run daily 03:00 UTC and manual checks, comparison of those assets' SHA256 digests against
the adopted marker in GitHub Releases, timestamped nightly versions, GitHub prereleases
holding immutable copies of the zips with their checksums, required qualification before
adoption, release-held publication state, and cleanup of unadopted releases.

The ThinkRail fork packages (`CommanderTvis.ThinkRail`, `CommanderTvis.ThinkRail.Desktop`)
and the JetBrains stable packages are no longer published. Their last adopted catalog
stays loadable until a Tereditor-only nightly replaces it. The fork desktop's
`desktop-updates` release is left frozen: installed desktops receive no further updates.

## Done conditions

A user can add the HTTPS source, discover and install Tereditor on x64 or ARM64, and upgrade to
the next nightly. Unchanged Tereditor zips do not republish. Failed downloads,
checksum mismatches, and required qualification checks do not advance the published
catalog or adopted release pointer.

The x64 WinGet metadata/search/show validation against the candidate catalog is a hard
publication gate. Tereditor WinGet installation is not automated and remains unverified
on both architectures; ARM64 has no runner gate.
Do not bypass Windows security or simulate clicking “Run anyway”.

Local checks cover protocol behavior, manifest generation, and strict typing.
GitHub Windows runners perform the WinGet metadata gate, which cannot be claimed as
locally verified on macOS.

## Operational scope

The distribution is published from the public `CommanderTvis/winget`
repository. GitHub Releases host the mirrored zips, immutable nightly catalogs and
source digests, and the adopted-release pointer. Nightly publication never commits or
pushes to Git. Vercel serves WinGet metadata and the installation page.
