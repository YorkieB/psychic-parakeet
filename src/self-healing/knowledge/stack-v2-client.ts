/**
 * Stack v2 Streaming Client
 * Streams metadata from Hugging Face without bulk downloading
 */

import type { Logger } from "winston";

export interface StackV2Record {
  blob_id: string; // Software Heritage blob ID
  content_id: string; // Software Heritage content ID
  src_encoding: string; // File encoding
  lang: string; // Programming language
  detected_licenses: string[]; // Detected licenses
  license_type: string; // License category
  repo_name: string; // Repository name
  path: string; // File path
  size: number; // File size in bytes
}

export class StackV2StreamingClient {
  private logger: Logger;
  private dataset: any;
  private initialized: boolean = false;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Initialize the streaming dataset connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info("Initializing Stack v2 streaming client...");

      // Dynamic import to avoid loading if not needed
      // Note: HuggingFace datasets may need to be installed via pip or other means
      // For now, we'll make it optional and provide a clear error message
      let load_dataset: any;
      try {
        // Try Python-style import (if using node-python-bridge or similar)
        // Or try npm package if available
        try {
          // @ts-expect-error - Package may not be available, handled in catch
          const hfDatasets = await import("@huggingface/datasets");
          load_dataset = hfDatasets.load_dataset;
        } catch {
          // Fallback: Use HuggingFace Hub API directly
          // This is a workaround until proper npm package is available
          this.logger.warn(
            "HuggingFace datasets package not available. " +
              "Stack v2 streaming requires HuggingFace datasets library. " +
              "Install via: pip install datasets huggingface_hub",
          );
          throw new Error(
            "HuggingFace datasets not available. " +
              "For now, Stack v2 streaming is optional. " +
              "Install Python packages: pip install datasets huggingface_hub",
          );
        }
      } catch (_importError) {
        // This is expected - HuggingFace datasets is a Python package, not npm
        // The feature is optional and the system works without it
        this.logger.info(
          "Stack v2 streaming is optional and not available. " +
            "To enable: install Python packages: pip install datasets huggingface_hub",
        );
        throw new Error(
          "HuggingFace datasets package not found. " +
            "Stack v2 streaming requires the datasets library. " +
            "This feature is optional and can be enabled later.",
        );
      }

      // Load dataset in streaming mode (no download)
      this.dataset = await load_dataset("bigcode/the-stack-v2", {
        streaming: true,
        trust_remote_code: true,
      });

      this.initialized = true;
      this.logger.info("✅ Stack v2 streaming client initialized");
    } catch (error) {
      this.logger.error("Failed to initialize Stack v2 client:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stream records matching a specific language
   */
  async *searchByLanguage(language: string): AsyncGenerator<StackV2Record> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.logger.debug(`Streaming ${language} files from Stack v2...`);

    try {
      for await (const record of this.dataset) {
        if (record.lang === language || record.lang?.toLowerCase() === language.toLowerCase()) {
          yield this.normalizeRecord(record);
        }
      }
    } catch (error) {
      this.logger.error("Error streaming by language:", {
        error: error instanceof Error ? error.message : String(error),
        language,
      });
      throw error;
    }
  }

  /**
   * Stream records matching license type
   */
  async *searchByLicense(
    licenseType: "permissive" | "no_license" | "copyleft",
  ): AsyncGenerator<StackV2Record> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.logger.debug(`Streaming ${licenseType} licensed files from Stack v2...`);

    try {
      for await (const record of this.dataset) {
        if (record.license_type === licenseType) {
          yield this.normalizeRecord(record);
        }
      }
    } catch (error) {
      this.logger.error("Error streaming by license:", {
        error: error instanceof Error ? error.message : String(error),
        licenseType,
      });
      throw error;
    }
  }

  /**
   * Stream records matching path pattern
   */
  async *searchByPath(pathPattern: RegExp | string): AsyncGenerator<StackV2Record> {
    if (!this.initialized) {
      await this.initialize();
    }

    const regex = typeof pathPattern === "string" ? new RegExp(pathPattern, "i") : pathPattern;
    this.logger.debug(`Streaming files matching path pattern: ${regex}`);

    try {
      for await (const record of this.dataset) {
        if (record.path && regex.test(record.path)) {
          yield this.normalizeRecord(record);
        }
      }
    } catch (error) {
      this.logger.error("Error streaming by path:", {
        error: error instanceof Error ? error.message : String(error),
        pattern: regex.toString(),
      });
      throw error;
    }
  }

  /**
   * Stream records matching multiple criteria
   */
  async *search(criteria: {
    language?: string;
    licenseType?: "permissive" | "no_license" | "copyleft";
    pathPattern?: RegExp | string;
    maxResults?: number;
  }): AsyncGenerator<StackV2Record> {
    if (!this.initialized) {
      await this.initialize();
    }

    let count = 0;
    const maxResults = criteria.maxResults || Infinity;

    try {
      for await (const record of this.dataset) {
        if (count >= maxResults) {
          break;
        }

        // Language filter
        if (criteria.language) {
          const langMatch =
            record.lang === criteria.language ||
            record.lang?.toLowerCase() === criteria.language.toLowerCase();
          if (!langMatch) continue;
        }

        // License filter
        if (criteria.licenseType && record.license_type !== criteria.licenseType) {
          continue;
        }

        // Path filter
        if (criteria.pathPattern) {
          const regex =
            typeof criteria.pathPattern === "string"
              ? new RegExp(criteria.pathPattern, "i")
              : criteria.pathPattern;
          if (!record.path || !regex.test(record.path)) {
            continue;
          }
        }

        yield this.normalizeRecord(record);
        count++;
      }
    } catch (error) {
      this.logger.error("Error in multi-criteria search:", {
        error: error instanceof Error ? error.message : String(error),
        criteria,
      });
      throw error;
    }
  }

  /**
   * Normalize record to ensure all fields are present
   */
  private normalizeRecord(record: any): StackV2Record {
    return {
      blob_id: record.blob_id || record.blobId || "",
      content_id: record.content_id || record.contentId || "",
      src_encoding: record.src_encoding || record.srcEncoding || "utf-8",
      lang: record.lang || record.language || "",
      detected_licenses: Array.isArray(record.detected_licenses)
        ? record.detected_licenses
        : Array.isArray(record.detectedLicenses)
          ? record.detectedLicenses
          : [],
      license_type: record.license_type || record.licenseType || "unknown",
      repo_name: record.repo_name || record.repoName || "",
      path: record.path || "",
      size: record.size || 0,
    };
  }

  /**
   * Get statistics about the dataset
   */
  async getStats(): Promise<{ totalRecords: number; languages: Set<string> }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const languages = new Set<string>();
    let totalRecords = 0;

    try {
      for await (const record of this.dataset) {
        totalRecords++;
        if (record.lang) {
          languages.add(record.lang);
        }

        // Limit stats collection to first 10000 records for performance
        if (totalRecords >= 10000) {
          break;
        }
      }
    } catch (error) {
      this.logger.warn("Error collecting stats:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { totalRecords, languages };
  }
}
