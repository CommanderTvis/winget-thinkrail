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
