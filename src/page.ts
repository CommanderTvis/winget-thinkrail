import type { PackageManifest } from "./catalog";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return `&#${character.charCodeAt(0)};`;
  });
}

export function renderPage(catalog: PackageManifest[]): string {
  const version = (id: string) => {
    const current = catalog.find((pkg) => pkg.PackageIdentifier === id)
      ?.Versions[0]?.PackageVersion;
    return current
      ? `Available · ${escapeHtml(current)}`
      : "Awaiting the first verified nightly";
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Install CommanderTvis ThinkRail fork nightlies for Windows with WinGet. Native x64 and ARM64 CLI, and x64 desktop.">
  <title>ThinkRail nightlies for Windows</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #101512; color: #edf2ec; line-height: 1.6; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main, header, footer { width: min(960px, 100% - 40px); margin-inline: auto; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-block: 28px; border-bottom: 1px solid #344139; }
    a { color: #b8ed9e; text-underline-offset: 4px; }
    a:hover { color: #e2ffd5; }
    a:focus-visible, summary:focus-visible, pre:focus-visible { outline: 2px solid #b8ed9e; outline-offset: 5px; }
    .brand { color: #edf2ec; font-weight: 700; text-decoration: none; letter-spacing: -.04em; font-size: 22px; }
    .hero { padding-block: 64px 36px; max-width: 740px; }
    .eyebrow, .step { color: #b8ed9e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; }
    h1 { font-size: clamp(40px, 7vw, 68px); line-height: 1.08; letter-spacing: -.055em; margin: 16px 0 24px; }
    h2 { font-size: 26px; letter-spacing: -.025em; margin: 8px 0 12px; }
    h3 { font-size: 20px; margin: 0 0 6px; }
    p { margin: 10px 0 18px; }
    .intro { color: #b9c5bc; font-size: 19px; overflow-wrap: anywhere; }
    .packages { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 48px; }
    .package { border: 1px solid #344139; border-radius: 12px; padding: 24px; background: #19221c; min-width: 0; }
    .package p { color: #b9c5bc; margin: 0 0 16px; }
    .status { color: #b8ed9e; font-size: 13px; overflow-wrap: anywhere; }
    section { margin-bottom: 40px; }
    pre { background: #080d09; border: 1px solid #344139; border-radius: 8px; padding: 18px; overflow-x: auto; font-size: 13px; line-height: 1.8; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .note { color: #b9c5bc; font-size: 14px; }
    .notice { border-left: 3px solid #d9b975; padding: 4px 0 4px 20px; }
    .notice h2 { font-size: 20px; }
    details { border-top: 1px solid #344139; padding-block: 20px; }
    summary { cursor: pointer; font-weight: 600; }
    footer { border-top: 1px solid #344139; padding-block: 24px 40px; color: #b9c5bc; font-size: 13px; }
    @media (max-width: 600px) { .packages { grid-template-columns: 1fr; } .hero { padding-top: 40px; } header { font-size: 14px; } }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">ThinkRail<span aria-hidden="true"> ↗</span></a>
    <a href="https://github.com/CommanderTvis/winget-thinkrail">View on GitHub</a>
  </header>
  <main>
    <div class="hero">
      <div class="eyebrow">Windows / WinGet / Nightly</div>
      <h1>A fresh track<br>for ThinkRail.</h1>
      <p class="intro">Install nightly builds of the <a href="https://github.com/CommanderTvis/thinkrail">CommanderTvis ThinkRail fork</a> with WinGet. These builds follow the <code>claude-code-integration-plugin-api</code> branch, not JetBrains releases.</p>
    </div>
    <div class="packages" aria-label="Package availability">
      <article class="package">
        <h2>CLI</h2>
        <p>Native Windows x64 + ARM64<br>Available in your terminal as <code>thinkrail</code>.</p>
        <div class="status">${version("CommanderTvis.ThinkRail")}</div>
      </article>
      <article class="package">
        <h2>Desktop</h2>
        <p>Windows 11 or later · x64 only<br>Interactive setup with an in-app updater.</p>
        <div class="status">${version("CommanderTvis.ThinkRail.Desktop")}</div>
      </article>
    </div>
    <section aria-labelledby="source-heading">
      <div class="step">01 / Connect</div>
      <h2 id="source-heading">Add the source once</h2>
      <p>Use a current version of WinGet (App Installer). Run this command in an administrator terminal.</p>
      <pre tabindex="0" aria-label="Add the WinGet source"><code>winget source add --name thinkrail --arg https://winget-thinkrail.commandertvis.workers.dev --type Microsoft.Rest</code></pre>
      <p class="note">Packages become installable once their verified nightly is available above.</p>
    </section>
    <section aria-labelledby="install-heading">
      <div class="step">02 / Install</div>
      <h2 id="install-heading">Choose your workspace</h2>
      <p>Install either package from a normal terminal.</p>
      <h3>CLI</h3>
      <pre tabindex="0" aria-label="Install the CLI"><code>winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user</code></pre>
      <p class="note">WinGet selects your native architecture. Open a new terminal if <code>thinkrail</code> is not yet on PATH.</p>
      <h3>Desktop</h3>
      <pre tabindex="0" aria-label="Install the desktop"><code>winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive</code></pre>
      <p class="note">Follow the installer prompts. Silent installation is not supported.</p>
    </section>
    <section aria-labelledby="update-heading">
      <div class="step">03 / Keep moving</div>
      <h2 id="update-heading">Stay on the nightly track</h2>
      <p>New builds are checked for daily at 03:00 UTC and published when the fork changes.</p>
      <pre tabindex="0" aria-label="Upgrade packages"><code>winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive</code></pre>
      <p class="note">Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork’s nightly feed.</p>
    </section>
    <section class="notice" aria-labelledby="notice-heading">
      <h2 id="notice-heading">Before installing</h2>
      <p>These are unofficial, unsigned nightly builds. Windows SmartScreen or organizational policy may block them. Checksums verify download integrity, not publisher identity.</p>
      <p>The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching; do not expect them to coexist side by side.</p>
      <p>Do not pass <code>--quiet</code> to the desktop setup executable: it is an uninstall command.</p>
    </section>
    <details>
      <summary>Uninstall packages or remove the source</summary>
      <pre tabindex="0" aria-label="Uninstall packages"><code>winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail</code></pre>
      <p>To remove the source, use an administrator terminal:</p>
      <pre tabindex="0" aria-label="Remove the WinGet source"><code>winget source remove --name thinkrail</code></pre>
      <p class="note">Removing the source alone does not uninstall either package or disable desktop in-app updates.</p>
    </details>
  </main>
  <footer>CommanderTvis fork · <a href="https://github.com/CommanderTvis/winget-thinkrail/releases">Release archives</a> · <a href="https://github.com/CommanderTvis/winget-thinkrail#readme">Installation guide</a></footer>
</body>
</html>`;
}
