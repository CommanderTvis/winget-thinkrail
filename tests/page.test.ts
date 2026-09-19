import { expect, test } from "bun:test";
import type { PackageManifest } from "../src/catalog";
import worker from "../src/index";
import { createSource } from "../src/source";

test("Worker root serves an installation page while REST stays JSON", async () => {
  const response = await worker.fetch(new Request("https://source/"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  const html = await response.text();
  expect(html).toContain('<html lang="en">');
  expect(html).toContain("winget source add --name thinkrail");
  expect(html).toContain("--scope user --interactive");
  const info = await worker.fetch(new Request("https://source/information"));
  expect(info.headers.get("Content-Type")).toContain("application/json");
  expect((await info.json()).Data.SourceIdentifier).toBe(
    "CommanderTvis.ThinkRail.Nightly",
  );
});

test("page availability follows each bundled package and escapes version text", async () => {
  const catalog: PackageManifest[] = [
    {
      PackageIdentifier: "CommanderTvis.ThinkRail",
      Versions: [
        {
          PackageVersion: 'nightly.<script>"&',
          DefaultLocale: {
            PackageLocale: "en-US",
            Publisher: "CommanderTvis",
            PackageName: "ThinkRail",
            License: "MIT",
            ShortDescription: "ThinkRail CLI",
          },
          Installers: [],
        },
      ],
    },
  ];
  const page = async (packages: PackageManifest[]) =>
    (await createSource(packages).fetch(new Request("https://source/"))).text();
  const empty = await page([]);
  expect(empty.match(/Awaiting the first verified nightly/g)).toHaveLength(2);
  expect(empty).not.toContain("Available ·");
  const published = await page(catalog);
  expect(published).toContain("Available · nightly.&#60;script&#62;&#34;&#38;");
  expect(published).not.toContain("<script>");
  expect(published.match(/Awaiting the first verified nightly/g)).toHaveLength(
    1,
  );
});

test("root supports HEAD, rejects writes, and keeps unknown paths as 404", async () => {
  const source = createSource([]);
  const get = (path: string, method = "GET") =>
    source.fetch(new Request(`https://source${path}`, { method }));
  const head = await get("/", "HEAD");
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  expect(head.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  const post = await get("/", "POST");
  expect(post.status).toBe(405);
  expect(post.headers.get("Allow")).toBe("GET, HEAD");
  expect((await get("/missing")).status).toBe(404);
});
