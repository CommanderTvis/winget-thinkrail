import assert from "node:assert/strict";
import catalog from "../catalog.json";

const [endpoint, ...extra] = Bun.argv.slice(2);
if (!endpoint || extra.length) throw new Error("Usage: verify-source.ts <url>");
const base = new URL(endpoint);
assert.equal(base.protocol, "https:");

async function request(path: string, status = 200, init?: RequestInit) {
  const response = await fetch(new URL(path, base), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, status, `${init?.method ?? "GET"} ${path}`);
  return response;
}

const page = await request("/");
assert.match(page.headers.get("content-type") ?? "", /text\/html/);
assert.equal(page.headers.get("x-content-type-options"), "nosniff");
assert.match(
  page.headers.get("content-security-policy") ?? "",
  /default-src 'none'/,
);
assert.ok((await page.text()).includes(base.origin));
assert.equal(await (await request("/", 200, { method: "HEAD" })).text(), "");
await request("/", 405, { method: "POST" });
await request("/missing", 404);

const info = await (await request("/information")).json();
assert.equal(info.Data.SourceIdentifier, "CommanderTvis.ThinkRail.Nightly");
assert.deepEqual(info.Data.ServerSupportedVersions, ["1.4.0"]);
await request("/information", 400, { headers: { Version: "0.0.0" } });
const search = await (
  await request("/manifestSearch", 200, {
    method: "POST",
    headers: { "Content-Type": "application/json", Version: "1.4.0" },
    body: "{}",
  })
).json();
assert.deepEqual(
  search.Data.map(
    (pkg: { PackageIdentifier: string }) => pkg.PackageIdentifier,
  ).sort(),
  catalog.map((pkg) => pkg.PackageIdentifier).sort(),
);
for (const pkg of catalog) {
  const path = `/packageManifests/${encodeURIComponent(pkg.PackageIdentifier)}`;
  assert.deepEqual((await (await request(path)).json()).Data, pkg);
  await request(`${path}?Market=US`, 400);
}
await request("/manifestSearch", 405);
console.log(
  `Verified public source, static page, and ${catalog.length} manifests at ${base.origin}`,
);
