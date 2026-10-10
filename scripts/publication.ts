import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import type { PackageManifest } from "../src/catalog";

export interface Publication {
  version: string;
  sourceSha: string;
}

export function parsePublication(value: unknown): Publication {
  const state = value as Publication | null;
  if (
    !state ||
    !/^0\.0\.0-nightly\.\d{14}$/.test(state.version) ||
    !/^[0-9a-f]{40}$/.test(state.sourceSha)
  ) {
    throw new Error("Invalid publication state");
  }
  return { version: state.version, sourceSha: state.sourceSha };
}

export function validateCatalog(value: unknown, version: string) {
  const catalog = value as PackageManifest[];
  if (
    !Array.isArray(catalog) ||
    catalog.length !== 2 ||
    !["CommanderTvis.ThinkRail", "CommanderTvis.ThinkRail.Desktop"].every(
      (id) =>
        catalog.filter((pkg) => pkg.PackageIdentifier === id).length === 1,
    ) ||
    catalog.some(
      (pkg) =>
        pkg.Versions.length !== 1 ||
        pkg.Versions[0]?.PackageVersion !== version,
    )
  ) {
    throw new Error("Catalog does not match the adopted nightly");
  }
  return catalog;
}

export async function readPublication(
  repository: string,
  request: (url: string) => Promise<Response>,
): Promise<Publication | null> {
  const response = await request(
    `https://api.github.com/repos/${repository}/releases/tags/publication-state`,
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Publication lookup failed (${response.status})`);
  const release = await response.json();
  return parsePublication(JSON.parse(release.body));
}

function gh(args: string[]) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

if (import.meta.main) {
  const [
    command,
    repository = "CommanderTvis/winget-thinkrail",
    version,
    sourceSha,
  ] = process.argv.slice(2);
  const request = (url: string) =>
    fetch(url, {
      headers: process.env.GH_TOKEN
        ? { Authorization: `Bearer ${process.env.GH_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(30_000),
    });
  if (command === "init") {
    if (!(await Bun.file("catalog.json").exists()))
      await writeFile("catalog.json", "[]\n");
  } else if (command === "require-catalog") {
    const catalog = await Bun.file("catalog.json").json();
    validateCatalog(catalog, catalog[0]?.Versions[0]?.PackageVersion ?? "");
  } else if (command === "migrate") {
    await mkdir("artifacts", { recursive: true });
    if (!(await readPublication(repository, request))) {
      const ref = "03b9ebf1ca8170b199278de4dcd9ed5f60a72dcb";
      const legacy = (path: string) =>
        Buffer.from(
          JSON.parse(
            gh(["api", `repos/${repository}/contents/${path}?ref=${ref}`]),
          ).content,
          "base64",
        ).toString("utf8");
      const catalog = JSON.parse(legacy("catalog.json"));
      const state = parsePublication({
        version: catalog[0]?.Versions[0]?.PackageVersion,
        sourceSha: legacy("nightly.sha").trim(),
      });
      validateCatalog(catalog, state.version);
      await writeFile("catalog.json", `${JSON.stringify(catalog, null, 2)}\n`);
      await writeFile("artifacts/source.sha", `${state.sourceSha}\n`);
      const release = JSON.parse(
        gh([
          "release",
          "view",
          `v${state.version}`,
          "--repo",
          repository,
          "--json",
          "assets",
        ]),
      );
      for (const name of ["catalog.json", "source.sha"]) {
        if (
          !release.assets.some((asset: { name: string }) => asset.name === name)
        ) {
          gh([
            "release",
            "upload",
            `v${state.version}`,
            "--repo",
            repository,
            name === "catalog.json" ? name : `artifacts/${name}`,
          ]);
        }
      }
      execFileSync(
        process.execPath,
        [import.meta.path, "adopt", repository, state.version, state.sourceSha],
        { stdio: "inherit" },
      );
    }
  } else if (command === "adopt") {
    const state = parsePublication({ version, sourceSha });
    validateCatalog(await Bun.file("catalog.json").json(), state.version);
    const published = JSON.parse(
      gh([
        "release",
        "download",
        `v${state.version}`,
        "--repo",
        repository,
        "--pattern",
        "catalog.json",
        "--output",
        "-",
      ]),
    );
    validateCatalog(published, state.version);
    if (
      JSON.stringify(published) !==
      JSON.stringify(await Bun.file("catalog.json").json())
    )
      throw new Error("Released catalog differs from the verified catalog");
    const publishedSha = gh([
      "release",
      "download",
      `v${state.version}`,
      "--repo",
      repository,
      "--pattern",
      "source.sha",
      "--output",
      "-",
    ]).trim();
    if (publishedSha !== state.sourceSha)
      throw new Error("Released source SHA differs from adoption state");
    const existing = await readPublication(repository, request);
    await mkdir("artifacts", { recursive: true });
    await writeFile(
      "artifacts/publication.json",
      `${JSON.stringify({ ...state, generatedBy: "🤖 Codex:" }, null, 2)}\n`,
    );
    if (!existing) {
      gh([
        "release",
        "create",
        "publication-state",
        "--repo",
        repository,
        "--prerelease",
        "--title",
        "Publication state",
        "--notes-file",
        "artifacts/publication.json",
      ]);
    } else {
      gh([
        "release",
        "edit",
        "publication-state",
        "--repo",
        repository,
        "--notes-file",
        "artifacts/publication.json",
      ]);
    }
  } else if (command === "sha" || command === "load") {
    const state = await readPublication(repository, request);
    if (!state)
      throw new Error(
        "No adopted publication; seed publication-state before running nightlies or deploying",
      );
    if (command === "sha") console.log(state.sourceSha);
    else {
      const text = gh([
        "release",
        "download",
        `v${state.version}`,
        "--repo",
        repository,
        "--pattern",
        "catalog.json",
        "--output",
        "-",
      ]);
      const catalog = validateCatalog(JSON.parse(text), state.version);
      await writeFile("catalog.json", `${JSON.stringify(catalog, null, 2)}\n`);
    }
  } else {
    throw new Error(
      "Usage: publication.ts <init|require-catalog|sha|load|adopt|migrate> [owner/repo] [version sourceSha]",
    );
  }
}
