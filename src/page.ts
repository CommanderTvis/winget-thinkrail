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

const rows: Row[] = [
  {
    id: "CommanderTvis.Tereditor",
    name: "Tereditor (nightly)",
    link: "https://github.com/CommanderTvis/tereditor",
    author: "CommanderTvis",
    authorLink: "https://github.com/CommanderTvis",
    architectures: "x64, ARM64",
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
  <meta name="description" content="WinGet source for Tereditor nightlies on Windows.">
  <title>Tereditor for Windows</title>
  <style>
    pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    code { overflow-wrap: anywhere; }
    .table { overflow-x: auto; }
  </style>
</head>
<body>
  <main>
    <h1>WinGet source for Tereditor builds</h1>
    <p>Install Windows builds through one WinGet source. The catalogue shows the exact version currently published.</p>
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
      <pre tabindex="0" aria-label="Add the WinGet source"><code>winget source add --name commandertvis --arg https://commandertvis-winget.vercel.app --type Microsoft.Rest</code></pre>
      <p>If you previously added this source as <code>thinkrail</code>, remove it with <code>winget source remove --name thinkrail</code>, then add the source above. Installed packages remain installed. Packages become installable once their verified build is available above.</p>
    </section>
    <section aria-labelledby="tereditor-heading">
      <h2 id="tereditor-heading">Tereditor (nightly)</h2>
      <p>The <a href="https://github.com/CommanderTvis/tereditor">CommanderTvis Tereditor</a> Avalonia prototype for Windows x64 and ARM64, mirrored from its <code>nightly</code> release and published when that build changes. WinGet selects your native architecture. No command alias is added; launch <code>client\\tereditor.exe</code> from the install folder. Publication checks its WinGet metadata on a Windows x64 runner, but its WinGet portable-zip install is not tested there.</p>
      <pre tabindex="0" aria-label="Tereditor commands"><code>winget install --id CommanderTvis.Tereditor --exact --source commandertvis --scope user
winget upgrade --id CommanderTvis.Tereditor --exact --source commandertvis
winget uninstall --id CommanderTvis.Tereditor --exact --source commandertvis</code></pre>
    </section>
    <section aria-labelledby="remove-heading">
      <h2 id="remove-heading">Remove the source</h2>
      <pre tabindex="0" aria-label="Remove the WinGet source"><code>winget source remove --name commandertvis</code></pre>
      <p>Removing the source alone does not uninstall any package.</p>
    </section>
    <section aria-labelledby="notice-heading">
      <h2 id="notice-heading">Before installing</h2>
      <p>These are unofficial, unsigned builds. Windows SmartScreen or organizational policy may block them. Download checksums verify integrity, not publisher identity; this distribution does not disable Windows security protections.</p>
    </section>
  </main>
  <footer>CommanderTvis · <a href="https://github.com/CommanderTvis/winget/releases">Release archives</a> · <a href="https://github.com/CommanderTvis/winget#readme">Installation guide</a></footer>
</body>
</html>`;
}
