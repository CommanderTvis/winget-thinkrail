param([Parameter(Mandatory)][string]$Version, [Parameter(Mandatory)][string]$PtySource)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
if ((& bun -p 'process.platform + "-" + process.arch') -ne 'win32-arm64') {
    throw 'This build requires native Windows ARM64 Bun'
}
if ($Version -notmatch '^0\.0\.0-nightly\.\d{14}$') { throw 'Invalid nightly version' }
$PtySource = (Resolve-Path $PtySource).Path
$ptyRoot = & bun -e 'import { dirname, resolve } from "node:path"; console.log(resolve(dirname(Bun.resolveSync("bun-pty", resolve("packages/server"))), ".."))'
$ptyPackage = Get-Content (Join-Path $ptyRoot 'package.json') -Raw | ConvertFrom-Json
if ($ptyPackage.version -ne '0.5.1') { throw 'Review the native PTY build before changing bun-pty versions' }
$ptyCommit = & git -C $PtySource rev-parse HEAD
if ($ptyCommit -ne '14ac2cabec8484d0f02234ef300b2b46c4b908fe') { throw 'Unexpected bun-pty source revision' }
& rustup toolchain install 1.94.0 --profile minimal --target aarch64-pc-windows-msvc
& cargo +1.94.0 build --manifest-path (Join-Path $PtySource 'rust-pty/Cargo.toml') --release --locked --target aarch64-pc-windows-msvc
$dll = Join-Path $PtySource 'rust-pty/target/aarch64-pc-windows-msvc/release/rust_pty.dll'
# bun-pty 0.5+ loads rust_pty_arm64.dll before rust_pty.dll on ARM64; replace both.
foreach ($name in 'rust_pty_arm64.dll', 'rust_pty.dll') {
    Copy-Item $dll (Join-Path $ptyRoot "rust-pty/target/release/$name") -Force
}
$commit = & git rev-parse --short HEAD
@"
export const version = "$Version";
export const channel = "nightly";
export const commit = "$commit";
export const posthogProjectKey = "";
"@ | Set-Content packages/shared/src/version.ts -Encoding utf8NoBOM
& bun run build:web
& bun apps/cli/scripts/build-binary.ts --target=bun-windows-arm64
& bun run smoke:binary apps/cli/dist/thinkrail-windows-arm64.exe
