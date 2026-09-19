import catalog from "../catalog.json";
import type { PackageManifest } from "./catalog";
import { createSource } from "./source";

export { createSource } from "./source";
// Generated and validated at build time; JSON imports widen string enums.
export default createSource(catalog as PackageManifest[]);
