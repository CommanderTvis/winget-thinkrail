import { mkdir } from "node:fs/promises";
import catalog from "../catalog.json";
import type { PackageManifest } from "../src/catalog";
import { renderPage } from "../src/page";

const directory = new URL("../dist/assets/", import.meta.url);
await mkdir(directory, { recursive: true });
await Bun.write(
  new URL("index.html", directory),
  renderPage(catalog as PackageManifest[]),
);
await Bun.write(
  new URL("_headers", directory),
  `/*
  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
  X-Content-Type-Options: nosniff
`,
);
