import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("ARM64 preparation resolves a dependency installed only in the server workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "thinkrail-workspace-"));
  try {
    const packageRoot = join(root, "packages/server/node_modules/bun-pty");
    await mkdir(join(packageRoot, "src"), { recursive: true });
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({
        name: "bun-pty",
        version: "0.4.10",
        main: "src/index.ts",
      }),
    );
    await writeFile(join(packageRoot, "src/index.ts"), "export {};\n");
    const script = await Bun.file(
      new URL("../scripts/build-arm64.ps1", import.meta.url),
    ).text();
    const expression = script.match(/^\$ptyRoot = & bun -e '([^']+)'$/m)?.[1];
    expect(expression).toBeDefined();
    if (!expression) throw new Error("PTY resolver expression missing");
    const result = Bun.spawnSync([process.execPath, "-e", expression], {
      cwd: root,
    });
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    expect(await realpath(result.stdout.toString().trim())).toBe(
      await realpath(packageRoot),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
