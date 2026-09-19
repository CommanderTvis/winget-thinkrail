import { resolve } from "node:path";
import type { PackageManifest } from "../src/catalog";
import { createSource } from "../src/source";

// Explicit interface: bun scripts/serve-source.ts <certificate.pem> <key.pem> <catalog.json>
const [certificate, key, catalog, ...extra] = Bun.argv.slice(2);
if (!certificate || !key || !catalog || extra.length) {
  throw new Error(
    "Usage: serve-source.ts <certificate.pem> <key.pem> <catalog.json>",
  );
}
const catalogPath = resolve(catalog);
Bun.serve({
  hostname: "127.0.0.1",
  port: 8443,
  tls: {
    cert: Bun.file(resolve(certificate)),
    key: Bun.file(resolve(key)),
  },
  async fetch(request) {
    // Deliberately reload: the native upgrade gate switches baseline to candidate.
    const packages: unknown = await Bun.file(catalogPath).json();
    if (!Array.isArray(packages)) throw new Error("Catalog must be an array");
    return createSource(packages as PackageManifest[]).fetch(request);
  },
});
console.log("Smoke source listening at https://127.0.0.1:8443");
