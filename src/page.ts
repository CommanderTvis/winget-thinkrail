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
    pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    code { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>ThinkRail nightlies for Windows</h1>
    <p>Install nightly builds of the <a href="https://github.com/CommanderTvis/thinkrail">CommanderTvis ThinkRail fork</a> with WinGet. These builds follow the <code>claude-code-integration-plugin-api</code> branch, not JetBrains releases.</p>
    <div aria-label="Package availability">
      <article>
        <h2>CLI</h2>
        <p>Native Windows x64 + ARM64<br>Available in your terminal as <code>thinkrail</code>.</p>
        <div>${version("CommanderTvis.ThinkRail")}</div>
      </article>
      <article>
        <h2>Desktop</h2>
        <p>Windows 11 or later · x64 only<br>Interactive setup with an in-app updater.</p>
        <div>${version("CommanderTvis.ThinkRail.Desktop")}</div>
      </article>
    </div>
    <section aria-labelledby="source-heading">
      <h2 id="source-heading">Add the source once</h2>
      <p>Use a current version of WinGet (App Installer). Run this command in an administrator terminal.</p>
      <pre tabindex="0" aria-label="Add the WinGet source"><code>winget source add --name thinkrail --arg https://winget-thinkrail.vercel.app --type Microsoft.Rest</code></pre>
      <p>Packages become installable once their verified nightly is available above.</p>
    </section>
    <section aria-labelledby="install-heading">
      <h2 id="install-heading">Install packages</h2>
      <p>Install either package from a normal terminal.</p>
      <h3>CLI</h3>
      <pre tabindex="0" aria-label="Install the CLI"><code>winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user</code></pre>
      <p>WinGet selects your native architecture. Open a new terminal if <code>thinkrail</code> is not yet on PATH.</p>
      <h3>Desktop</h3>
      <pre tabindex="0" aria-label="Install the desktop"><code>winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive</code></pre>
      <p>Follow the installer prompts. Silent installation is not supported.</p>
    </section>
    <section aria-labelledby="update-heading">
      <h2 id="update-heading">Update packages</h2>
      <p>New builds are checked for daily at 03:00 UTC and published when the fork changes.</p>
      <pre tabindex="0" aria-label="Upgrade packages"><code>winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive</code></pre>
      <p>Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork’s nightly feed.</p>
    </section>
    <section aria-labelledby="notice-heading">
      <h2 id="notice-heading">Before installing</h2>
      <p>These are unofficial, unsigned nightly builds. Windows SmartScreen or organizational policy may block them. Checksums verify download integrity, not publisher identity.</p>
      <p>The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching; do not expect them to coexist side by side.</p>
      <p>Do not pass <code>--quiet</code> to the desktop setup executable: it is an uninstall command.</p>
    </section>
    <section>
      <h2>Uninstall packages or remove the source</h2>
      <pre tabindex="0" aria-label="Uninstall packages"><code>winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail</code></pre>
      <p>To remove the source, use an administrator terminal:</p>
      <pre tabindex="0" aria-label="Remove the WinGet source"><code>winget source remove --name thinkrail</code></pre>
      <p>Removing the source alone does not uninstall either package or disable desktop in-app updates.</p>
    </section>
  </main>
  <footer>CommanderTvis fork · <a href="https://github.com/CommanderTvis/winget-thinkrail/releases">Release archives</a> · <a href="https://github.com/CommanderTvis/winget-thinkrail#readme">Installation guide</a></footer>
</body>
</html>`;
}
