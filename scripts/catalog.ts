import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Installer, PackageManifest } from "../src/catalog";

interface Options {
  repository: string;
  version: string;
  artifacts: string;
}

export async function generateCatalog(
  options: Options,
): Promise<PackageManifest[]> {
  const { repository, version, artifacts } = options;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    repository.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error("Expected owner/repository");
  }
  if (!/^0\.0\.0-nightly\.\d{14}$/.test(version)) {
    throw new Error("Expected 0.0.0-nightly.<UTC YYYYMMDDHHmmss>");
  }
  const name = "sharprail-windows-x64.zip";
  const sharprail: Installer = {
    Architecture: "x64",
    InstallerType: "zip",
    NestedInstallerType: "portable",
    NestedInstallerFiles: [{ RelativeFilePath: "client\\SharpRail.UI.exe" }],
    Scope: "user",
    UpgradeBehavior: "install",
    MinimumOSVersion: "10.0.17763.0",
    InstallerUrl: `https://github.com/${repository}/releases/download/v${version}/${name}`,
    InstallerSha256: createHash("sha256")
      .update(await readFile(join(artifacts, name)))
      .digest("hex")
      .toUpperCase(),
  };
  return [
    {
      PackageIdentifier: "CommanderTvis.SharpRail",
      Versions: [
        {
          PackageVersion: version,
          DefaultLocale: {
            PackageLocale: "en-US",
            Publisher: "CommanderTvis",
            PublisherUrl: "https://github.com/CommanderTvis",
            PackageName: "SharpRail (CommanderTvis nightly)",
            PackageUrl: "https://github.com/CommanderTvis/tereditor",
            License: "Unknown",
            ShortDescription:
              "Unsigned nightly build of CommanderTvis SharpRail",
            Moniker: "sharprail",
            Tags: ["sharprail", "nightly", "ai"],
          },
          Installers: [sharprail],
        },
      ],
    },
  ];
}

if (import.meta.main) {
  const [repository, version, artifacts, output = "catalog.json"] =
    process.argv.slice(2);
  if (!repository || !version || !artifacts)
    throw new Error(
      "Usage: bun scripts/catalog.ts owner/repo version artifacts [output]",
    );
  const catalog = await generateCatalog({ repository, version, artifacts });
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
    { input: JSON.stringify(catalog), encoding: "utf8" },
  );
  await writeFile(output, formatted);
}
