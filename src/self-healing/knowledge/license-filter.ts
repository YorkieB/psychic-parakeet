/**
 * License Filter
 * Filters code by license type to ensure compliance
 */

import type { Logger } from "winston";
import type { StackV2Record } from "./stack-v2-client";

export type LicenseType = "permissive" | "no_license" | "copyleft" | "unknown";

export interface LicenseInfo {
  type: LicenseType;
  name: string;
  isPermissive: boolean;
  requiresAttribution: boolean;
}

export class LicenseFilter {
  private logger: Logger;
  private allowedLicenses: Set<string>;
  private allowedTypes: Set<LicenseType>;

  constructor(logger: Logger, allowedTypes: LicenseType[] = ["permissive", "no_license"]) {
    this.logger = logger;
    this.allowedTypes = new Set(allowedTypes);

    // Common permissive licenses
    this.allowedLicenses = new Set([
      "mit",
      "apache-2.0",
      "apache",
      "bsd-2-clause",
      "bsd-3-clause",
      "bsd",
      "isc",
      "unlicense",
      "cc0-1.0",
      "0bsd",
    ]);
  }

  /**
   * Check if a record's license is allowed
   */
  isAllowed(record: StackV2Record): boolean {
    // Check license type first
    if (!this.allowedTypes.has(record.license_type as LicenseType)) {
      return false;
    }

    // Check specific licenses if provided
    if (record.detected_licenses && record.detected_licenses.length > 0) {
      const hasAllowedLicense = record.detected_licenses.some((license) =>
        this.allowedLicenses.has(license.toLowerCase().replace(/\s+/g, "-")),
      );

      if (!hasAllowedLicense && record.license_type !== "no_license") {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter records by license
   */
  filter(records: StackV2Record[]): StackV2Record[] {
    const filtered = records.filter((record) => this.isAllowed(record));

    this.logger.debug(`License filter: ${records.length} → ${filtered.length} records`);

    return filtered;
  }

  /**
   * Get license information for a record
   */
  getLicenseInfo(record: StackV2Record): LicenseInfo {
    const licenseType = record.license_type as LicenseType;
    const licenseName = record.detected_licenses?.[0] || "Unknown";

    return {
      type: licenseType,
      name: licenseName,
      isPermissive: licenseType === "permissive" || licenseType === "no_license",
      requiresAttribution:
        licenseType === "permissive" && licenseName.toLowerCase().includes("apache"),
    };
  }

  /**
   * Add allowed license
   */
  addAllowedLicense(license: string): void {
    this.allowedLicenses.add(license.toLowerCase().replace(/\s+/g, "-"));
  }

  /**
   * Set allowed license types
   */
  setAllowedTypes(types: LicenseType[]): void {
    this.allowedTypes = new Set(types);
  }
}
