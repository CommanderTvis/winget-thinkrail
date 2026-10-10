import { expect, test } from "bun:test";
import {
  parsePublication,
  readPublication,
  validateCatalog,
} from "../scripts/publication";

const state = {
  version: "0.0.0-nightly.20261006095947",
  sourceSha: "d79997723f486c534587048d99dafe4e2c76799d",
};

test("adoption uses the dedicated release rather than the newest candidate", async () => {
  const publication = await readPublication("owner/repo", async (url) => {
    expect(url).toEndWith("/releases/tags/publication-state");
    return Response.json({ body: JSON.stringify(state) });
  });
  expect(publication).toEqual(state);
});

test("missing state is distinct from API failures and corrupt adoption state", async () => {
  expect(
    await readPublication(
      "owner/repo",
      async () => new Response(null, { status: 404 }),
    ),
  ).toBeNull();
  for (const status of [401, 403, 500]) {
    await expect(
      readPublication("owner/repo", async () => new Response(null, { status })),
    ).rejects.toThrow("lookup failed");
  }
  await expect(
    readPublication("owner/repo", async () =>
      Response.json({ body: "broken" }),
    ),
  ).rejects.toThrow();
  expect(() => parsePublication({ ...state, version: "latest" })).toThrow();
  expect(() => parsePublication({ ...state, sourceSha: "bad" })).toThrow();
});

test("deployment refuses empty, mixed-version, and duplicate-package catalogs", () => {
  const catalog = [
    "CommanderTvis.ThinkRail",
    "CommanderTvis.ThinkRail.Desktop",
  ].map((PackageIdentifier) => ({
    PackageIdentifier,
    Versions: [
      {
        PackageVersion: state.version,
        DefaultLocale: {
          PackageLocale: "en-US",
          Publisher: "CommanderTvis",
          PackageName: "ThinkRail",
          License: "Apache-2.0",
          ShortDescription: "Nightly",
        },
        Installers: [],
      },
    ],
  }));
  expect(validateCatalog(catalog, state.version)).toEqual(catalog);
  expect(() => validateCatalog([], state.version)).toThrow();
  expect(() =>
    validateCatalog([catalog[0], catalog[0]], state.version),
  ).toThrow();
  expect(() =>
    validateCatalog(catalog, "0.0.0-nightly.20261007000000"),
  ).toThrow();
});

test("publication advances only after verification and feed publication without Git writes", async () => {
  const workflow = await Bun.file(
    new URL("../.github/workflows/nightly.yml", import.meta.url),
  ).text();
  expect(workflow.indexOf("publication.ts adopt")).toBeGreaterThan(
    workflow.indexOf("--clobber artifacts/canary-win-x64-update.json"),
  );
  expect(
    workflow.indexOf("Verify the public source before adoption"),
  ).toBeLessThan(workflow.indexOf("publication.ts adopt"));
  expect(workflow).not.toMatch(/git (?:add|commit|push)|nightly\.sha/);
  expect(workflow).toContain('publication.ts load "$env:GITHUB_REPOSITORY"');
  expect(workflow).toContain("artifacts/catalog.json artifacts/source.sha");
});
