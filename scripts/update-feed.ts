import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function prepareFeed(directory: string, version: string) {
  if (!/^0\.0\.0-nightly\.\d{14}$/.test(version))
    throw new Error("Invalid version");
  const manifestPath = join(directory, "canary-win-x64-update.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const original = "canary-win-x64-ThinkRail-canary.tar.zst";
  if (manifest.version !== version || manifest.artifact?.file !== original) {
    throw new Error("Unexpected Electrobun update identity");
  }
  const archiveName = `canary-win-x64-ThinkRail-canary-${version}.tar.zst`;
  await copyFile(join(directory, original), join(directory, archiveName));
  manifest.artifact.file = archiveName;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, archivePath: join(directory, archiveName) };
}

if (import.meta.main) {
  const [directory, version] = process.argv.slice(2);
  if (!directory || !version)
    throw new Error("Usage: bun scripts/update-feed.ts artifacts version");
  await prepareFeed(directory, version);
}
