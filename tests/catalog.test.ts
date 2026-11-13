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
  await writeFile(
    join(artifacts, "sharprail-windows-x64.zip"),
    "sharprail-windows-x64.zip",
  );
  return {
    artifacts,
    repository: "CommanderTvis/winget",
    version: "0.0.0-nightly.20260918170000",
  };
}

test("generates the x64 SharpRail package from the mirrored zip", async () => {
  const options = await fixture();
  const catalog = await generateCatalog(options);
  expect(catalog.map((p) => p.PackageIdentifier)).toEqual([
    "CommanderTvis.SharpRail",
  ]);
  expect(catalog[0]?.Versions[0]?.PackageVersion).toBe(options.version);
  expect(catalog[0]?.Versions[0]?.Installers).toMatchObject([
    {
      Architecture: "x64",
      InstallerType: "zip",
      NestedInstallerType: "portable",
      NestedInstallerFiles: [{ RelativeFilePath: "client\\SharpRail.UI.exe" }],
      InstallerSha256: createHash("sha256")
        .update("sharprail-windows-x64.zip")
        .digest("hex")
        .toUpperCase(),
      InstallerUrl: `https://github.com/${options.repository}/releases/download/v${options.version}/sharprail-windows-x64.zip`,
    },
  ]);
});

test("CLI output matches the catalog and repository formatting", async () => {
  const options = await fixture();
  const output = join(options.artifacts, "catalog.json");
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
  await rm(join(options.artifacts, "sharprail-windows-x64.zip"));
  await expect(generateCatalog(options)).rejects.toThrow();
});

test("rejects unsafe release identity", async () => {
  const options = await fixture();
  for (const overrides of [{ version: "latest" }, { repository: "../evil" }]) {
    await expect(
      generateCatalog({ ...options, ...overrides }),
    ).rejects.toThrow();
  }
});
