# Gotchas

- A SmartScreen prompt blocks unattended desktop installation, not necessarily a user's interactive install. Keep desktop WinGet installation manual and non-blocking for publication; retain mandatory CLI installation and desktop build/smoke checks without changing Windows security.

- Confirm the full public hostname before deployment. The workers.dev account subdomain is shared by all Workers; changing only the Worker name does not change that suffix. The approved account subdomain is commandertvis.

- Keep README.md user-facing. Deployment, credentials, CI operations, recovery, and maintainer verification belong in specs, not the README.

- This source distributes the CommanderTvis ThinkRail fork, not upstream JetBrains builds. Keep the fork identity explicit in package metadata, documentation, and build configuration.
- The confirmed architecture scope is CLI x64 + ARM64, desktop x64 only. Do not add an ARM64 desktop package or substitute an emulated desktop package for it.
- Runtime target support alone does not prove application support. Inspect native dependencies and require native smoke tests before claiming ARM64 compatibility.
