import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareFeed } from "../scripts/update-feed";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
const version = "0.0.0-nightly.20260918170000";
const original = "canary-win-x64-ThinkRail-canary.tar.zst";
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "thinkrail-feed-"));
  directories.push(directory);
  const manifest = {
    version,
    artifact: { file: original, hash: "framework-hash", size: 7 },
    channel: "canary",
  };
  await writeFile(
    join(directory, "canary-win-x64-update.json"),
    JSON.stringify(manifest),
  );
  await writeFile(join(directory, original), "archive");
  return { directory, manifest };
}

test("qualifies the archive name without changing archive bytes or framework metadata", async () => {
  const { directory, manifest } = await fixture();
  const result = await prepareFeed(directory, version);
  expect(await readFile(result.archivePath, "utf8")).toBe("archive");
  const updated = JSON.parse(await readFile(result.manifestPath, "utf8"));
  expect(updated).toEqual({
    ...manifest,
    artifact: {
      ...manifest.artifact,
      file: `canary-win-x64-ThinkRail-canary-${version}.tar.zst`,
    },
  });
});

test("refuses another version and leaves the manifest untouched", async () => {
  const { directory, manifest } = await fixture();
  await expect(
    prepareFeed(directory, "0.0.0-nightly.20260919000000"),
  ).rejects.toThrow();
  expect(
    JSON.parse(
      await readFile(join(directory, "canary-win-x64-update.json"), "utf8"),
    ),
  ).toEqual(manifest);
});
