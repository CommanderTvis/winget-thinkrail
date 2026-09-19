// Deliberate subset of Microsoft's WinGet-1.4.0 REST ManifestSchema.
// 1.4 is the first client REST contract with nested installers and portable support.
export type NestedInstallerType =
  | "msix"
  | "msi"
  | "appx"
  | "exe"
  | "inno"
  | "nullsoft"
  | "wix"
  | "burn"
  | "portable";

export interface Installer {
  Architecture: "x86" | "x64" | "arm" | "arm64" | "neutral";
  InstallerType: NestedInstallerType | "zip";
  InstallerUrl: string;
  InstallerSha256: string;
  NestedInstallerType?: NestedInstallerType;
  NestedInstallerFiles?: {
    RelativeFilePath: string;
    PortableCommandAlias?: string;
  }[];
  Scope?: "user" | "machine";
  Commands?: string[];
  ProductCode?: string;
  PackageFamilyName?: string;
  AppsAndFeaturesEntries?: {
    DisplayName?: string;
    Publisher?: string;
    DisplayVersion?: string;
    ProductCode?: string;
    UpgradeCode?: string;
    InstallerType?: NestedInstallerType;
  }[];
  InstallerSwitches?: Partial<
    Record<
      | "Silent"
      | "SilentWithProgress"
      | "Interactive"
      | "InstallLocation"
      | "Log"
      | "Upgrade"
      | "Custom",
      string
    >
  >;
  InstallModes?: ("interactive" | "silent" | "silentWithProgress")[];
  UpgradeBehavior?: "install" | "uninstallPrevious" | "deny";
  MinimumOSVersion?: string;
  InstallerLocale?: string;
}

export interface PackageLocale {
  PackageLocale: string;
  Publisher: string;
  PackageName: string;
  License: string;
  ShortDescription: string;
  Moniker?: string;
  Tags?: string[];
  Description?: string;
  PublisherUrl?: string;
  PublisherSupportUrl?: string;
  PackageUrl?: string;
  LicenseUrl?: string;
  ReleaseNotes?: string;
  ReleaseNotesUrl?: string;
}

export interface PackageVersion {
  PackageVersion: string;
  Channel?: string;
  DefaultLocale: PackageLocale;
  Locales?: (Partial<Omit<PackageLocale, "Moniker">> & {
    PackageLocale: string;
  })[];
  Installers: Installer[];
}

export interface PackageManifest {
  PackageIdentifier: string;
  Versions: PackageVersion[];
}
