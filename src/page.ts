import type { PackageManifest } from "./catalog";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return `&#${character.charCodeAt(0)};`;
  });
}

interface Row {
  id: string;
  name: string;
  link: string;
  author: string;
  authorLink: string;
  architectures: string;
}

const fork = "https://github.com/CommanderTvis/thinkrail";
const jetbrains = "https://github.com/JetBrains/thinkrail/releases/latest";
const rows: Row[] = [
  {
    id: "CommanderTvis.ThinkRail",
    name: "ThinkRail CLI (fork nightly)",
    link: fork,
    author: "CommanderTvis",
    authorLink: "https://github.com/CommanderTvis",
    architectures: "x64, ARM64",
  },
  {
    id: "CommanderTvis.ThinkRail.Desktop",
    name: "ThinkRail Desktop (fork nightly)",
    link: fork,
    author: "CommanderTvis",
    authorLink: "https://github.com/CommanderTvis",
    architectures: "x64",
  },
  {
    id: "CommanderTvis.JetBrainsThinkRail",
    name: "ThinkRail CLI (JetBrains stable)",
    link: jetbrains,
    author: "JetBrains",
    authorLink: "https://github.com/JetBrains",
    architectures: "x64",
  },
  {
    id: "CommanderTvis.JetBrainsThinkRail.Desktop",
    name: "ThinkRail Desktop (JetBrains stable)",
    link: jetbrains,
    author: "JetBrains",
    authorLink: "https://github.com/JetBrains",
    architectures: "x64",
  },
  {
    id: "CommanderTvis.SharpRail",
    name: "SharpRail (nightly)",
    link: "https://github.com/CommanderTvis/sharprail",
    author: "CommanderTvis",
    authorLink: "https://github.com/CommanderTvis",
    architectures: "x64",
  },
];

export function renderPage(catalog: PackageManifest[]): string {
  const version = (id: string) => {
    const current = catalog.find((pkg) => pkg.PackageIdentifier === id)
      ?.Versions[0]?.PackageVersion;
    return current
      ? `Available · ${escapeHtml(current)}`
      : "Awaiting the first verified nightly";
  };
  const table = rows
    .map(
      (row) => `        <tr>
          <td><a href="${row.link}">${row.name}</a></td>
          <td><a href="${row.authorLink}">${row.author}</a></td>
          <td><code>${row.id}</code></td>
          <td>${row.architectures}</td>
          <td>${version(row.id)}</td>
        </tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="WinGet source for ThinkRail fork nightlies, unmodified JetBrains ThinkRail stable releases, and SharpRail nightlies on Windows.">
  <title>ThinkRail and SharpRail for Windows</title>
  <style>
    pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    code { overflow-wrap: anywhere; }
    .table { overflow-x: auto; }
  </style>
</head>
<body>
  <main>
    <h1>WinGet source for ThinkRail and SharpRail builds</h1>
    <p>Install Windows builds through one WinGet source. Packages are grouped below; the catalogue shows the exact version currently published.</p>
    <section aria-labelledby="catalogue-heading">
      <h2 id="catalogue-heading">Catalogue</h2>
      <div class="table" role="region" aria-label="Package catalogue" tabindex="0">
      <table>
        <thead>
          <tr><th>Package</th><th>Author</th><th>Id</th><th>Architectures</th><th>Version</th></tr>
        </thead>
        <tbody>
${table}
        </tbody>
      </table>
      </div>
    </section>
    <section aria-labelledby="source-heading">
      <h2 id="source-heading">Add the source</h2>
      <p>Use a current version of WinGet (App Installer). Add the source once from an administrator terminal.</p>
      <pre tabindex="0" aria-label="Add the WinGet source"><code>winget source add --name thinkrail --arg https://winget-thinkrail.vercel.app --type Microsoft.Rest</code></pre>
      <p>If you previously added this source with a different URL, remove it with <code>winget source remove --name thinkrail</code>, then add the source above. Installed packages remain installed. Packages become installable once their verified build is available above.</p>
    </section>
    <section aria-labelledby="fork-heading">
      <h2 id="fork-heading">ThinkRail fork nightly</h2>
      <p>Nightly builds of the <a href="${fork}">CommanderTvis ThinkRail fork</a>, branch <code>claude-code-integration-plugin-api</code>. Checked daily at 03:00 UTC and published when the fork changes. The CLI is available as <code>thinkrail</code>; the desktop requires Windows 11 or later.</p>
      <pre tabindex="0" aria-label="ThinkRail fork commands"><code># CLI — WinGet selects your native architecture
winget install --id CommanderTvis.ThinkRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.ThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.ThinkRail --exact --source thinkrail

# Desktop — x64 only; follow the installer prompts
winget install --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --scope user --interactive
winget upgrade --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail --interactive
winget uninstall --id CommanderTvis.ThinkRail.Desktop --exact --source thinkrail</code></pre>
      <p>Open a new terminal after installing the CLI if <code>thinkrail</code> is not yet on PATH. Update the CLI through WinGet, not its built-in self-update command. The desktop also supports in-app updates from this fork’s nightly feed.</p>
    </section>
    <section aria-labelledby="jetbrains-heading">
      <h2 id="jetbrains-heading">ThinkRail from JetBrains (stable)</h2>
      <p>Unmodified stable releases of <a href="https://github.com/JetBrains/thinkrail">JetBrains/thinkrail</a>, linked from their GitHub release with its published checksums. Windows x64 only; JetBrains publishes no Windows ARM64 build. The CLI is available as <code>jetbrains-thinkrail</code> so it does not collide with the fork’s <code>thinkrail</code>. The package version is the JetBrains release version.</p>
      <pre tabindex="0" aria-label="JetBrains ThinkRail commands"><code># CLI
winget install --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail
winget uninstall --id CommanderTvis.JetBrainsThinkRail --exact --source thinkrail

# Desktop — follow the installer prompts
winget install --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail --scope user --interactive
winget upgrade --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail --interactive
winget uninstall --id CommanderTvis.JetBrainsThinkRail.Desktop --exact --source thinkrail</code></pre>
    </section>
    <section aria-labelledby="sharprail-heading">
      <h2 id="sharprail-heading">SharpRail (nightly)</h2>
      <p>The <a href="https://github.com/CommanderTvis/sharprail">CommanderTvis SharpRail</a> Avalonia prototype, Windows x64 only, mirrored from its <code>nightly</code> release. No command alias is added; launch <code>client\\SharpRail.UI.exe</code> from the install folder. This package is not installation-tested on Windows runners, and its WinGet portable-zip install is unverified.</p>
      <pre tabindex="0" aria-label="SharpRail commands"><code>winget install --id CommanderTvis.SharpRail --exact --source thinkrail --scope user
winget upgrade --id CommanderTvis.SharpRail --exact --source thinkrail
winget uninstall --id CommanderTvis.SharpRail --exact --source thinkrail</code></pre>
    </section>
    <section aria-labelledby="remove-heading">
      <h2 id="remove-heading">Remove the source</h2>
      <pre tabindex="0" aria-label="Remove the WinGet source"><code>winget source remove --name thinkrail</code></pre>
      <p>Removing the source alone does not uninstall any package or disable desktop in-app updates.</p>
    </section>
    <section aria-labelledby="notice-heading">
      <h2 id="notice-heading">Before installing</h2>
      <p>These are unofficial, unsigned builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.</p>
      <p>Desktop installation is interactive; silent installation is not supported. Do not pass <code>--quiet</code> to a desktop setup executable: it is an uninstall command.</p>
      <p>The desktop shares its canary installation identity with other ThinkRail canary distributions. Back up your data before switching distributions; do not expect them to coexist side by side.</p>
    </section>
  </main>
  <footer>CommanderTvis fork · <a href="https://github.com/CommanderTvis/winget-thinkrail/releases">Release archives</a> · <a href="https://github.com/CommanderTvis/winget-thinkrail#readme">Installation guide</a></footer>
</body>
</html>`;
}
