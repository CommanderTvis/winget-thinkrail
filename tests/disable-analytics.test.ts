import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { disableReleaseAnalytics } from "../scripts/disable-analytics";

const action = `inputs:
  posthog-project-key:
    description: "Public PostHog project key baked into release analytics; never committed"
    required: true
runs:
  using: composite
  steps:
    - name: Stamp shared release identity
      run: |
        set -eu
        case "$POSTHOG_PROJECT_KEY" in
          phc_?*) ;;
          *) echo "::error::posthog-project-key must be a phc_ project key"; exit 1 ;;
        esac
        cat > packages/shared/src/version.ts <<EOF
        export const posthogProjectKey = "\${POSTHOG_PROJECT_KEY}";
        EOF
    - name: Smoke native installer
      run: bun run smoke:desktop:installer
`;

test("release stamping cannot enable analytics even with an inherited key", async () => {
  const patched = disableReleaseAnalytics(action);
  const root = await mkdtemp(join(tmpdir(), "thinkrail-no-analytics-"));
  try {
    await mkdir(join(root, "packages/shared/src"), { recursive: true });
    const stamp = patched.split("      run: |\n")[1]?.split("    - name:")[0];
    if (!stamp) throw new Error("Stamping step missing");
    const command = stamp.replace(/^ {8}/gm, "");
    for (const key of ["", "phc_fixture"]) {
      const result = Bun.spawnSync(["bash", "-c", command], {
        cwd: root,
        env: { ...process.env, POSTHOG_PROJECT_KEY: key },
      });
      expect(result.exitCode).toBe(0);
      const identity = await Bun.file(
        join(root, "packages/shared/src/version.ts"),
      ).text();
      expect(identity).toBe('export const posthogProjectKey = "";\n');
    }
    expect(patched).toContain("run: bun run smoke:desktop:installer");
    expect(patched).toContain("required: false");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unexpected upstream analytics contracts fail before patching", () => {
  expect(() =>
    disableReleaseAnalytics(action.replace("phc_?*", "phc_*")),
  ).toThrow("Upstream release analytics contract changed");
  expect(() => disableReleaseAnalytics(action + action)).toThrow(
    "Upstream release analytics contract changed",
  );
});

test("the failed nightly's optional-key action stamps analytics off", async () => {
  const upstream = await Bun.file(
    new URL("./fixtures/build-binary-281bda9.yml", import.meta.url),
  ).text();
  const patched = disableReleaseAnalytics(upstream);
  const root = await mkdtemp(join(tmpdir(), "thinkrail-optional-analytics-"));
  try {
    await mkdir(join(root, "packages/shared/src"), { recursive: true });
    const stamp = patched.split("      run: |\n")[1]?.split("    - name:")[0];
    if (!stamp) throw new Error("Stamping step missing");
    for (const key of ["", "phc_fixture", "invalid-inherited-key"]) {
      const result = Bun.spawnSync(
        ["bash", "-c", stamp.replace(/^ {8}/gm, "")],
        {
          cwd: root,
          env: {
            ...process.env,
            GIT_DIR: join(process.cwd(), ".git"),
            VERSION: "0.0.0-nightly.fixture",
            CHANNEL: "nightly",
            POSTHOG_PROJECT_KEY: key,
          },
        },
      );
      expect(result.exitCode).toBe(0);
      expect(
        await Bun.file(join(root, "packages/shared/src/version.ts")).text(),
      ).toContain('export const posthogProjectKey = "";');
    }
    expect(patched.split("    - name: Build web UI")[1]).toBe(
      upstream.split("    - name: Build web UI")[1],
    );
    expect(() =>
      disableReleaseAnalytics(upstream.replace('""|phc_?*', '""|phc_*')),
    ).toThrow("Upstream release analytics contract changed");
    expect(() => disableReleaseAnalytics(upstream + upstream)).toThrow(
      "Upstream release analytics contract changed",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
