import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCatalog } from "../scripts/catalog";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixture() {
  const artifacts = await mkdtemp(join(tmpdir(), "thinkrail-catalog-"));
  directories.push(artifacts);
  for (const name of [
    "thinkrail-windows-x64.exe",
    "thinkrail-windows-arm64.exe",
    "thinkrail-desktop-windows-x64.zip",
    "sharprail-windows-x64.zip",
  ]) {
    await writeFile(join(artifacts, name), name);
  }
  return {
    artifacts,
    repository: "CommanderTvis/winget-thinkrail",
    version: "0.0.0-nightly.20260918170000",
    desktopSetupPath: "ThinkRail-Setup-canary.exe",
    jetbrains: {
      version: "0.2.0",
      checksums: `${"a".repeat(64)}  thinkrail-windows-x64.exe\n${"b".repeat(64)}  thinkrail-desktop-windows-x64.zip\n`,
    },
  };
}

test("generates one native dual-architecture CLI and one x64-only desktop", async () => {
  const options = await fixture();
  const catalog = await generateCatalog(options);
  expect(catalog.map((p) => p.PackageIdentifier)).toEqual([
    "CommanderTvis.ThinkRail",
    "CommanderTvis.ThinkRail.Desktop",
    "CommanderTvis.JetBrainsThinkRail",
    "CommanderTvis.JetBrainsThinkRail.Desktop",
    "CommanderTvis.SharpRail",
  ]);
  const cli = catalog[0]?.Versions[0];
  const desktop = catalog[1]?.Versions[0];
  expect(cli?.PackageVersion).toBe(options.version);
  expect(cli?.Installers.map((i) => i.Architecture)).toEqual(["x64", "arm64"]);
  expect(cli?.Installers[0]).toMatchObject({
    InstallerType: "portable",
    Commands: ["thinkrail"],
    InstallerSha256: createHash("sha256")
      .update("thinkrail-windows-x64.exe")
      .digest("hex")
      .toUpperCase(),
    InstallerUrl: `https://github.com/${options.repository}/releases/download/v${options.version}/thinkrail-windows-x64.exe`,
  });
  expect(desktop?.Installers).toHaveLength(1);
  expect(desktop?.Installers[0]).toMatchObject({
    Architecture: "x64",
    InstallerType: "zip",
    NestedInstallerType: "exe",
    NestedInstallerFiles: [{ RelativeFilePath: options.desktopSetupPath }],
  });
  expect(catalog[4]?.Versions[0]?.Installers).toMatchObject([
    {
      Architecture: "x64",
      InstallerType: "zip",
      NestedInstallerType: "portable",
      NestedInstallerFiles: [{ RelativeFilePath: "client\\SharpRail.UI.exe" }],
      InstallerUrl: `https://github.com/${options.repository}/releases/download/v${options.version}/sharprail-windows-x64.zip`,
    },
  ]);
  expect(catalog[2]?.Versions[0]).toMatchObject({
    PackageVersion: "0.2.0",
    Installers: [
      {
        Commands: ["jetbrains-thinkrail"],
        InstallerSha256: "A".repeat(64),
        InstallerUrl:
          "https://github.com/JetBrains/thinkrail/releases/download/v0.2.0/thinkrail-windows-x64.exe",
      },
    ],
  });
  expect(catalog[3]?.Versions[0]?.Installers[0]).toMatchObject({
    NestedInstallerFiles: [{ RelativeFilePath: "ThinkRail-Setup.exe" }],
    InstallerSha256: "B".repeat(64),
  });
});

test("CLI output matches the catalog and repository formatting", async () => {
  const options = await fixture();
  const output = join(options.artifacts, "catalog.json");
  await writeFile(
    join(options.artifacts, "jetbrains.version"),
    `${options.jetbrains.version}\n`,
  );
  await writeFile(
    join(options.artifacts, "jetbrains.sha256"),
    options.jetbrains.checksums,
  );
  execFileSync(process.execPath, [
    fileURLToPath(new URL("../scripts/catalog.ts", import.meta.url)),
    options.repository,
    options.version,
    options.artifacts,
    output,
  ]);
  const text = await readFile(output, "utf8");
  expect(JSON.parse(text)).toEqual(await generateCatalog(options));
  const formatted = execFileSync(
    process.execPath,
    [
      "x",
      "--no-install",
      "biome",
      "format",
      "--stdin-file-path",
      "manifest.json",
    ],
    { input: text, encoding: "utf8" },
  );
  expect(text).toBe(formatted);
});

test("refuses missing artifacts instead of advertising a partial nightly", async () => {
  const options = await fixture();
  await rm(join(options.artifacts, "thinkrail-windows-arm64.exe"));
  await expect(generateCatalog(options)).rejects.toThrow();
});

test("rejects unsafe release identity and nested paths", async () => {
  const options = await fixture();
  for (const overrides of [
    { version: "latest" },
    { repository: "../evil" },
    { desktopSetupPath: "../setup.exe" },
    { desktopSetupPath: "C:\\setup.exe" },
    { desktopSetupPath: "setup.exe\n--bad" },
  ]) {
    await expect(
      generateCatalog({ ...options, ...overrides }),
    ).rejects.toThrow();
  }
});
