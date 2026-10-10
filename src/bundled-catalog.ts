import catalog from "../catalog.json";
import type { PackageManifest } from "./catalog";

// Build input generated locally or downloaded from an adopted release.
export default catalog as PackageManifest[];
