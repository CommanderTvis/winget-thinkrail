import { expect, test } from "bun:test";
import { createSource } from "../src/source";

test("empty source advertises REST 1.4 and no fake packages", async () => {
  const source = createSource([]);
  expect(
    await (
      await source.fetch(new Request("https://source/information"))
    ).json(),
  ).toEqual({
    Data: {
      SourceIdentifier: "CommanderTvis.ThinkRail.Nightly",
      ServerSupportedVersions: ["1.4.0"],
      UnsupportedPackageMatchFields: [
        "NormalizedPackageNameAndPublisher",
        "Market",
      ],
      UnsupportedQueryParameters: ["Market"],
    },
  });
  expect(
    await (
      await source.fetch(
        new Request("https://source/manifestSearch", {
          method: "POST",
          body: '{"FetchAllManifests":true}',
        }),
      )
    ).json(),
  ).toEqual({ Data: [] });
});

import type { PackageManifest } from "../src/catalog";

const catalog: PackageManifest[] = [
  {
    PackageIdentifier: "Example.CLI",
    Versions: [
      {
        PackageVersion: "1.0",
        DefaultLocale: {
          PackageLocale: "en-US",
          Publisher: "Example",
          PackageName: "Example CLI",
          License: "MIT",
          ShortDescription: "Example CLI package",
          Moniker: "example",
          Tags: ["terminal"],
        },
        Installers: [
          {
            Architecture: "x64",
            InstallerType: "portable",
            InstallerUrl: "https://example.com/cli.exe",
            InstallerSha256: "a".repeat(64),
            Commands: ["example"],
            ProductCode: "direct-code",
            AppsAndFeaturesEntries: [{ ProductCode: "arp-code" }],
          },
        ],
      },
      {
        PackageVersion: "0.9",
        Channel: "beta",
        DefaultLocale: {
          PackageLocale: "en-US",
          Publisher: "Example",
          PackageName: "Example CLI",
          License: "MIT",
          ShortDescription: "Old version",
        },
        Installers: [],
      },
    ],
  },
  {
    PackageIdentifier: "Example.Desktop",
    Versions: [
      {
        PackageVersion: "1.0",
        DefaultLocale: {
          PackageLocale: "en-US",
          Publisher: "Example",
          PackageName: "Example Desktop",
          License: "MIT",
          ShortDescription: "Desktop package",
        },
        Installers: [
          {
            Architecture: "x64",
            InstallerType: "zip",
            NestedInstallerType: "exe",
            NestedInstallerFiles: [{ RelativeFilePath: "setup.exe" }],
            InstallerUrl: "https://example.com/desktop.zip",
            InstallerSha256: "b".repeat(64),
          },
        ],
      },
    ],
  },
];
const source = createSource(catalog);
const get = (path: string, init?: RequestInit) =>
  source.fetch(new Request(`https://source${path}`, init));
const search = (body: unknown) =>
  get("/manifestSearch", { method: "POST", body: JSON.stringify(body) });
const filter = (field: string, keyword: string, type = "CaseInsensitive") => ({
  PackageMatchField: field,
  RequestMatch: { KeyWord: keyword, MatchType: type },
});

test("manifest lookup uses identity, version and channel; preserves installers", async () => {
  const response = await get("/packageManifests/example.desktop?Version=1.0");
  expect(await response.json()).toEqual({ Data: catalog[1] });
  expect(
    await (
      await get("/packageManifests/EXAMPLE.CLI?Version=0.9&Channel=BETA")
    ).json(),
  ).toEqual({
    Data: {
      PackageIdentifier: "Example.CLI",
      Versions: [catalog[0]?.Versions[1]],
    },
  });
  for (const path of [
    "/packageManifests/missing",
    "/packageManifests/Example.CLI?Version=absent",
  ])
    expect(await (await get(path)).json()).toEqual({ Data: null });
});

test("search fields, official match types and correlation envelope", async () => {
  for (const [field, keyword] of [
    ["PackageIdentifier", "example.cli"],
    ["PackageName", "example cli"],
    ["Moniker", "example"],
    ["Tag", "terminal"],
    ["Command", "example"],
    ["ProductCode", "ARP-CODE"],
  ]) {
    const data = await (
      await search({ Filters: [filter(field ?? "", keyword ?? "")] })
    ).json();
    expect(
      data.Data.map((p: { PackageIdentifier: string }) => p.PackageIdentifier),
    ).toEqual(["Example.CLI"]);
    expect(data.Data[0].Versions[0].ProductCodes).toEqual([
      "direct-code",
      "arp-code",
    ]);
  }
  for (const [type, keyword, count] of [
    ["Exact", "example.cli", 0],
    ["Exact", "Example.CLI", 1],
    ["StartsWith", "EXAMPLE.", 2],
    ["Substring", "desktop", 1],
  ] as const) {
    expect(
      (
        await (
          await search({
            Filters: [filter("PackageIdentifier", keyword, type)],
          })
        ).json()
      ).Data,
    ).toHaveLength(count);
  }
});

test("query and inclusions form a union, filters intersect; maximum results", async () => {
  const body = {
    Query: { KeyWord: "desktop", MatchType: "Substring" },
    Inclusions: [filter("Command", "example")],
    Filters: [filter("Tag", "terminal")],
  };
  expect((await (await search(body)).json()).Data).toHaveLength(1);
  expect(
    (await (await search({ ...body, Filters: [] })).json()).Data,
  ).toHaveLength(2);
  expect(
    (await (await search({ MaximumResults: 1 })).json()).Data,
  ).toHaveLength(1);
  expect(
    (await (await search({ MaximumResults: 0 })).json()).Data,
  ).toHaveLength(2);
});

test("invalid external JSON and unsupported constraints never broaden search", async () => {
  for (const body of [
    null,
    [],
    42,
    { Filters: {} },
    { Filters: [filter("Unknown", "x")] },
    { Filters: [filter("Market", "US")] },
    { Query: { KeyWord: 3, MatchType: "Exact" } },
    { Query: { KeyWord: "x", MatchType: "Fuzzy" } },
    { MaximumResults: -1 },
    { MaximumResults: 1.5 },
    { FetchAllManifests: "yes" },
    { Unknown: true },
    { Filters: [{}] },
    { Query: { KeyWord: "x".repeat(256), MatchType: "Exact" } },
  ])
    expect((await search(body)).status).toBe(400);
  expect(
    (await get("/manifestSearch", { method: "POST", body: "{" })).status,
  ).toBe(400);
  expect((await get("/manifestSearch", { method: "POST" })).status).toBe(400);
});

test("protocol version negotiation, routing and query validation", async () => {
  expect(
    (await get("/information", { headers: { Version: "1.4.0" } })).status,
  ).toBe(200);
  expect(
    (await get("/information", { headers: { Version: "1.6.0" } })).status,
  ).toBe(400);
  expect((await get("/packages")).status).toBe(404);
  const wrongMethod = await get("/manifestSearch");
  expect(wrongMethod.status).toBe(405);
  expect(wrongMethod.headers.get("Allow")).toBe("POST");
  expect((await get("/information", { method: "DELETE" })).status).toBe(405);
  for (const path of [
    "/packageManifests/%FF",
    "/packageManifests/Example.CLI?Other=x",
    "/packageManifests/Example.CLI?Version=1&Version=2",
  ])
    expect((await get(path)).status).toBe(400);
  expect(
    (
      await get("/manifestSearch", {
        method: "POST",
        headers: { ContinuationToken: "x" },
        body: "{}",
      })
    ).status,
  ).toBe(400);
});

test("streaming byte limit works without or with misleading Content-Length", async () => {
  for (const headers of [
    new Headers(),
    new Headers({ "Content-Length": "1" }),
  ]) {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ < 10) controller.enqueue(new Uint8Array(8192).fill(32));
        else controller.close();
      },
    });
    expect(
      (await get("/manifestSearch", { method: "POST", headers, body })).status,
    ).toBe(413);
  }
  expect(
    (
      await get("/manifestSearch", {
        method: "POST",
        headers: { "Content-Length": "65537" },
        body: "{}",
      })
    ).status,
  ).toBe(413);
  expect(
    (
      await get("/manifestSearch", {
        method: "POST",
        body: `{}${" ".repeat(65534)}`,
      })
    ).status,
  ).toBe(200);
});
