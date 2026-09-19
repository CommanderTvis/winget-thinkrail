import { expect, test } from "bun:test";

test("WinGet module and CLI release use their independent version formats", async () => {
  const script = await Bun.file(
    new URL("../scripts/test-install.ps1", import.meta.url),
  ).text();
  const moduleVersion = script.match(
    /Install-Module Microsoft\.WinGet\.Client -RequiredVersion '([^']+)'/,
  )?.[1];
  const releaseTag = script.match(
    /Repair-WinGetPackageManager -Version '([^']+)'/,
  )?.[1];
  expect(moduleVersion).toMatch(/^\d+\.\d+\.\d+$/);
  expect(releaseTag).toMatch(/^v\d+\.\d+\.\d+$/);
  expect(script).toContain(
    `Import-Module Microsoft.WinGet.Client -RequiredVersion '${moduleVersion}'`,
  );
});

test("desktop verification stops after metadata without running setup", async () => {
  const script = await Bun.file(
    new URL("../scripts/test-install.ps1", import.meta.url),
  ).text();
  const gate = script.slice(
    script.indexOf("function Test-Package"),
    script.indexOf("\n$cert ="),
  );
  const metadata = gate.indexOf("@('show'");
  const skip = gate.indexOf("if ($id.EndsWith('.Desktop')) { continue }");
  const installation = gate.indexOf("$arguments =");
  expect(metadata).toBeGreaterThanOrEqual(0);
  expect(skip).toBeGreaterThan(metadata);
  expect(installation).toBeGreaterThan(skip);
  expect(gate).toContain("Invoke-Native $winget $arguments");
  expect(script.includes("$desktopKey")).toBe(false);
  expect(script.includes("Stop-Desktop")).toBe(false);
});

test("local source URLs and certificate match the server's IPv4 listener", async () => {
  const script = await Bun.file(
    new URL("../scripts/test-install.ps1", import.meta.url),
  ).text();
  const server = await Bun.file(
    new URL("../scripts/serve-source.ts", import.meta.url),
  ).text();
  expect(server).toContain('hostname: "127.0.0.1"');
  expect(script).toContain("https://127.0.0.1:8443/information");
  expect(script).toContain("'--arg', 'https://127.0.0.1:8443'");
  expect(script).toContain("IPAddress=127.0.0.1");
  expect(script).not.toContain("-SkipCertificateCheck");
});
