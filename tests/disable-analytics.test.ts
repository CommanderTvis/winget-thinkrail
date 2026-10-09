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
