import type { PackageManifest, PackageVersion } from "./catalog";

const protocol = "1.4.0";
const limit = 64 * 1024;
const fields = [
  "PackageIdentifier",
  "PackageName",
  "Moniker",
  "Tag",
  "Command",
  "ProductCode",
  "PackageFamilyName",
] as const;
type Field = (typeof fields)[number];
type Match = {
  KeyWord: string;
  MatchType: "Exact" | "CaseInsensitive" | "StartsWith" | "Substring";
};
type Filter = { PackageMatchField: Field; RequestMatch: Match };
class BadRequest extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequest("Expected an object");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new BadRequest("Unsupported request property");
}
function match(value: unknown): Match {
  const v = object(value);
  keys(v, ["KeyWord", "MatchType"]);
  if (typeof v.KeyWord !== "string" || v.KeyWord.length > 255)
    throw new BadRequest("Invalid KeyWord");
  if (
    v.MatchType !== "Exact" &&
    v.MatchType !== "CaseInsensitive" &&
    v.MatchType !== "StartsWith" &&
    v.MatchType !== "Substring"
  )
    throw new BadRequest("Unsupported MatchType");
  return { KeyWord: v.KeyWord, MatchType: v.MatchType };
}
function filters(value: unknown): Filter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequest("Expected filters array");
  return value.map((item) => {
    const v = object(item);
    keys(v, ["PackageMatchField", "RequestMatch"]);
    if (!fields.some((field) => field === v.PackageMatchField))
      throw new BadRequest("Unsupported PackageMatchField");
    return {
      PackageMatchField: v.PackageMatchField as Field,
      RequestMatch: match(v.RequestMatch),
    };
  });
}
async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("Content-Length")) > limit)
    throw new BadRequest("Request body too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BadRequest("Missing JSON body");
  let size = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new BadRequest("Request body too large", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch (error) {
    if (error instanceof BadRequest) throw error;
    throw new BadRequest("Invalid JSON body");
  } finally {
    reader.releaseLock();
  }
}
function correlation(version: PackageVersion) {
  const installers = version.Installers;
  return {
    PackageFamilyNames: [
      ...new Set(
        installers.flatMap((i) =>
          i.PackageFamilyName ? [i.PackageFamilyName] : [],
        ),
      ),
    ],
    ProductCodes: [
      ...new Set(
        installers.flatMap((i) => [
          ...(i.ProductCode ? [i.ProductCode] : []),
          ...(i.AppsAndFeaturesEntries ?? []).flatMap((entry) =>
            entry.ProductCode ? [entry.ProductCode] : [],
          ),
        ]),
      ),
    ],
  };
}
function values(pkg: PackageManifest): Record<Field, string[]> {
  const locales = pkg.Versions.flatMap((v) => [
    v.DefaultLocale,
    ...(v.Locales ?? []),
  ]);
  return {
    PackageIdentifier: [pkg.PackageIdentifier],
    PackageName: locales.flatMap((l) => (l.PackageName ? [l.PackageName] : [])),
    Moniker: pkg.Versions.flatMap((v) =>
      v.DefaultLocale.Moniker ? [v.DefaultLocale.Moniker] : [],
    ),
    Tag: locales.flatMap((l) => l.Tags ?? []),
    Command: pkg.Versions.flatMap((v) =>
      v.Installers.flatMap((i) => i.Commands ?? []),
    ),
    ProductCode: pkg.Versions.flatMap((v) => correlation(v).ProductCodes),
    PackageFamilyName: pkg.Versions.flatMap(
      (v) => correlation(v).PackageFamilyNames,
    ),
  };
}
function matches(values: string[], match: Match): boolean {
  return values.some((value) => {
    if (match.MatchType === "Exact") return value === match.KeyWord;
    const text = value.toLowerCase();
    const keyword = match.KeyWord.toLowerCase();
    if (match.MatchType === "StartsWith") return text.startsWith(keyword);
    if (match.MatchType === "Substring") return text.includes(keyword);
    return text === keyword;
  });
}
const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, { status, headers });
const failure = (message: string, status: number, headers?: HeadersInit) =>
  json([{ ErrorCode: status, ErrorMessage: message }], status, headers);

export function createSource(catalog: PackageManifest[]): {
  fetch(request: Request): Promise<Response>;
} {
  // The bundled, generator-validated catalog is trusted build input; HTTP JSON is not.
  return {
    async fetch(request) {
      try {
        const url = new URL(request.url);
        const manifestRoute = /^\/packageManifests\/([^/]+)$/.exec(
          url.pathname,
        );
        const isInfo = url.pathname === "/information";
        const isSearch = url.pathname === "/manifestSearch";
        if (!isInfo && !isSearch && !manifestRoute)
          return failure("Not found", 404);
        const method = isSearch ? "POST" : "GET";
        if (request.method !== method)
          return failure("Method not allowed", 405, { Allow: method });
        const version = request.headers.get("Version");
        if (version !== null && version !== protocol)
          throw new BadRequest("Unsupported protocol Version");
        if (request.headers.has("ContinuationToken"))
          throw new BadRequest("Continuation tokens are not supported");
        if (isInfo)
          return json({
            Data: {
              SourceIdentifier: "CommanderTvis.ThinkRail.Nightly",
              ServerSupportedVersions: [protocol],
              UnsupportedPackageMatchFields: [
                "NormalizedPackageNameAndPublisher",
                "Market",
              ],
              UnsupportedQueryParameters: ["Market"],
            },
          });
        if (manifestRoute) {
          let id: string;
          try {
            id = decodeURIComponent(manifestRoute[1] ?? "");
          } catch {
            throw new BadRequest("Invalid package identifier encoding");
          }
          for (const key of url.searchParams.keys()) {
            if (
              !["Version", "Channel"].includes(key) ||
              url.searchParams.getAll(key).length !== 1
            )
              throw new BadRequest("Unsupported or duplicate query parameter");
          }
          const pkg = catalog.find(
            (p) => p.PackageIdentifier.toLowerCase() === id.toLowerCase(),
          );
          const versions = pkg?.Versions.filter(
            (v) =>
              (!url.searchParams.has("Version") ||
                v.PackageVersion.toLowerCase() ===
                  url.searchParams.get("Version")?.toLowerCase()) &&
              (!url.searchParams.has("Channel") ||
                (v.Channel ?? "").toLowerCase() ===
                  url.searchParams.get("Channel")?.toLowerCase()),
          );
          return json({
            Data:
              pkg && versions?.length
                ? {
                    PackageIdentifier: pkg.PackageIdentifier,
                    Versions: versions,
                  }
                : null,
          });
        }
        if (url.search) throw new BadRequest("Unsupported query parameter");
        const body = object(await readJson(request));
        keys(body, [
          "Query",
          "Inclusions",
          "Filters",
          "MaximumResults",
          "FetchAllManifests",
        ]);
        const query = body.Query === undefined ? undefined : match(body.Query);
        const inclusions = filters(body.Inclusions);
        const constraints = filters(body.Filters);
        if (
          body.FetchAllManifests !== undefined &&
          typeof body.FetchAllManifests !== "boolean"
        )
          throw new BadRequest("Invalid FetchAllManifests");
        const maximum = body.MaximumResults;
        if (
          maximum !== undefined &&
          (typeof maximum !== "number" ||
            !Number.isSafeInteger(maximum) ||
            maximum < 0)
        )
          throw new BadRequest("Invalid MaximumResults");
        const results = catalog
          .filter((pkg) => {
            const indexed = values(pkg);
            return (
              ((!query && !inclusions.length) ||
                (!!query && matches(Object.values(indexed).flat(), query)) ||
                inclusions.some((f) =>
                  matches(indexed[f.PackageMatchField], f.RequestMatch),
                )) &&
              constraints.every((f) =>
                matches(indexed[f.PackageMatchField], f.RequestMatch),
              )
            );
          })
          .flatMap((pkg) => {
            const locale = pkg.Versions[0]?.DefaultLocale;
            return locale
              ? [
                  {
                    PackageIdentifier: pkg.PackageIdentifier,
                    PackageName: locale.PackageName,
                    Publisher: locale.Publisher,
                    Versions: pkg.Versions.map((v) => ({
                      PackageVersion: v.PackageVersion,
                      ...(v.Channel ? { Channel: v.Channel } : {}),
                      ...correlation(v),
                    })),
                  },
                ]
              : [];
          });
        return json({
          Data:
            typeof maximum === "number" && maximum > 0
              ? results.slice(0, maximum)
              : results,
        });
      } catch (error) {
        if (error instanceof BadRequest)
          return failure(error.message, error.status);
        return failure("Internal server error", 500);
      }
    },
  };
}
