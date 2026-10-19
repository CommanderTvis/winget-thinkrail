import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Installer, PackageManifest } from "../src/catalog";

interface Options {
  repository: string;
  version: string;
  artifacts: string;
  desktopSetupPath: string;
  /** Stable JetBrains release, linked in place: `0.2.0` plus its `SHA256SUMS` text. */
  jetbrains: { version: string; checksums: string };
}

export async function generateCatalog(
  options: Options,
): Promise<PackageManifest[]> {
  const { repository, version, artifacts, desktopSetupPath, jetbrains } =
    options;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    repository.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error("Expected owner/repository");
  }
  if (!/^0\.0\.0-nightly\.\d{14}$/.test(version)) {
    throw new Error("Expected 0.0.0-nightly.<UTC YYYYMMDDHHmmss>");
  }
  if (!/^[\w .-]+\.exe$/.test(desktopSetupPath)) {
    throw new Error("Expected a root-level desktop setup executable");
  }
  const homepage = "https://github.com/CommanderTvis/thinkrail";
  const base = `https://github.com/${repository}/releases/download/v${version}`;
  async function download(name: string) {
    return {
      InstallerUrl: `${base}/${name}`,
      InstallerSha256: createHash("sha256")
        .update(await readFile(join(artifacts, name)))
        .digest("hex")
        .toUpperCase(),
    };
  }
  const cli: Installer[] = await Promise.all(
    (["x64", "arm64"] as const).map(async (Architecture) => ({
      Architecture,
      InstallerType: "portable",
      Scope: "user",
      Commands: ["thinkrail"],
      UpgradeBehavior: "install",
      MinimumOSVersion: "10.0.17763.0",
      ...(await download(`thinkrail-windows-${Architecture}.exe`)),
    })),
  );
  const desktop: Installer = {
    Architecture: "x64",
    InstallerType: "zip",
    NestedInstallerType: "exe",
    NestedInstallerFiles: [{ RelativeFilePath: desktopSetupPath }],
    Scope: "user",
    InstallModes: ["interactive"],
    UpgradeBehavior: "install",
    MinimumOSVersion: "10.0.22000.0",
    ProductCode: "ai.thinkrail.app.canary",
    AppsAndFeaturesEntries: [
      {
        DisplayName: "ThinkRail (Canary)",
        DisplayVersion: version,
        ProductCode: "ai.thinkrail.app.canary",
        InstallerType: "exe",
      },
    ],
    ...(await download("thinkrail-desktop-windows-x64.zip")),
  };
  if (!/^\d+\.\d+\.\d+$/.test(jetbrains.version)) {
    throw new Error("Expected a stable JetBrains version");
  }
  const jetbrainsBase = `https://github.com/JetBrains/thinkrail/releases/download/v${jetbrains.version}`;
  function jetbrainsDownload(name: string) {
    const line = jetbrains.checksums
      .split("\n")
      .map((entry) => entry.trim().split(/\s+/))
      .find(([, file]) => file === name);
    const digest = line?.[0];
    if (!digest || !/^[0-9a-f]{64}$/i.test(digest)) {
      throw new Error(`Missing JetBrains checksum for ${name}`);
    }
    return {
      InstallerUrl: `${jetbrainsBase}/${name}`,
      InstallerSha256: digest.toUpperCase(),
    };
  }
  const jetbrainsCli: Installer = {
    Architecture: "x64",
    InstallerType: "portable",
    Scope: "user",
    Commands: ["jetbrains-thinkrail"],
    UpgradeBehavior: "install",
    MinimumOSVersion: "10.0.17763.0",
    ...jetbrainsDownload("thinkrail-windows-x64.exe"),
  };
  const jetbrainsDesktop: Installer = {
    Architecture: "x64",
    InstallerType: "zip",
    NestedInstallerType: "exe",
    NestedInstallerFiles: [{ RelativeFilePath: "ThinkRail-Setup.exe" }],
    Scope: "user",
    InstallModes: ["interactive"],
    UpgradeBehavior: "install",
    MinimumOSVersion: "10.0.22000.0",
    ...jetbrainsDownload("thinkrail-desktop-windows-x64.zip"),
  };
  const sharprail: Installer = {
    Architecture: "x64",
    InstallerType: "zip",
    NestedInstallerType: "portable",
    NestedInstallerFiles: [{ RelativeFilePath: "client\\SharpRail.UI.exe" }],
    Scope: "user",
    UpgradeBehavior: "install",
    MinimumOSVersion: "10.0.17763.0",
    ...(await download("sharprail-windows-x64.zip")),
  };
  const thinkrail = {
    url: homepage,
    license: "Apache-2.0",
    description: "Unsigned nightly build of the CommanderTvis ThinkRail fork",
    tags: ["thinkrail", "nightly", "ai"],
  };
  const jetbrainsMeta = {
    version: jetbrains.version,
    url: "https://github.com/JetBrains/thinkrail",
    license: "Unknown",
    description: "Unmodified stable JetBrains ThinkRail release",
    tags: ["thinkrail", "jetbrains", "ai"],
  };
  const packages = [
    {
      id: "CommanderTvis.ThinkRail",
      name: "ThinkRail CLI (CommanderTvis nightly)",
      moniker: "thinkrail",
      installers: cli,
      ...thinkrail,
    },
    {
      id: "CommanderTvis.ThinkRail.Desktop",
      name: "ThinkRail Desktop (CommanderTvis nightly)",
      moniker: "thinkrail-desktop",
      installers: [desktop],
      ...thinkrail,
    },
    {
      id: "CommanderTvis.JetBrainsThinkRail",
      name: "ThinkRail CLI (JetBrains stable)",
      moniker: "jetbrains-thinkrail",
      installers: [jetbrainsCli],
      ...jetbrainsMeta,
    },
    {
      id: "CommanderTvis.JetBrainsThinkRail.Desktop",
      name: "ThinkRail Desktop (JetBrains stable)",
      moniker: "jetbrains-thinkrail-desktop",
      installers: [jetbrainsDesktop],
      ...jetbrainsMeta,
    },
    {
      id: "CommanderTvis.SharpRail",
      name: "SharpRail (CommanderTvis nightly)",
      moniker: "sharprail",
      installers: [sharprail],
      url: "https://github.com/CommanderTvis/sharprail",
      license: "Unknown",
      description: "Unsigned nightly build of CommanderTvis SharpRail",
      tags: ["sharprail", "nightly", "ai"],
    },
  ];
  return packages.map(
    ({
      id,
      name,
      moniker,
      installers,
      url,
      license,
      description,
      tags,
      ...rest
    }) => ({
      PackageIdentifier: id,
      Versions: [
        {
          PackageVersion: "version" in rest ? rest.version : version,
          DefaultLocale: {
            PackageLocale: "en-US",
            Publisher: id.includes("JetBrains") ? "JetBrains" : "CommanderTvis",
            PublisherUrl: id.includes("JetBrains")
              ? "https://github.com/JetBrains"
              : "https://github.com/CommanderTvis",
            PackageName: name,
            PackageUrl: url,
            License: license,
            ShortDescription: description,
            Moniker: moniker,
            Tags: tags,
          },
          Installers: installers,
        },
      ],
    }),
  );
}

if (import.meta.main) {
  const [repository, version, artifacts, output = "catalog.json"] =
    process.argv.slice(2);
  if (!repository || !version || !artifacts)
    throw new Error(
      "Usage: bun scripts/catalog.ts owner/repo version artifacts [output]",
    );
  const catalog = await generateCatalog({
    repository,
    version,
    artifacts,
    desktopSetupPath: "ThinkRail-Setup-canary.exe",
    jetbrains: {
      version: (
        await readFile(join(artifacts, "jetbrains.version"), "utf8")
      ).trim(),
      checksums: await readFile(join(artifacts, "jetbrains.sha256"), "utf8"),
    },
  });
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
