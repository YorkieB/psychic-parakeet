/**
 * Software Heritage S3 Client
 * Fetches code content from public S3 bucket on-demand
 */

import type { Logger } from "winston";

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  useHTTP?: boolean; // Use HTTPS endpoint instead of S3 SDK
}

export class SoftwareHeritageClient {
  private logger: Logger;
  private baseUrl = "https://softwareheritage.s3.amazonaws.com";
  private defaultTimeout = 10000; // 10 seconds
  private defaultRetries = 3;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Fetch content from Software Heritage S3 using blob ID
   * Uses HTTPS endpoint (no AWS SDK needed for public bucket)
   */
  async fetchContent(blobId: string, options: FetchOptions = {}): Promise<string> {
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries || this.defaultRetries;
    const useHTTP = options.useHTTP !== false; // Default to HTTP

    if (useHTTP) {
      return this.fetchContentHTTP(blobId, timeout, retries);
    } else {
      return this.fetchContentS3(blobId, timeout, retries);
    }
  }

  /**
   * Fetch using HTTPS endpoint (simpler, no AWS SDK)
   */
  private async fetchContentHTTP(
    blobId: string,
    timeout: number,
    retries: number,
  ): Promise<string> {
    const url = `${this.baseUrl}/content/${blobId}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        this.logger.debug(`Fetching blob ${blobId} from S3 (attempt ${attempt + 1}/${retries})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "text/plain, application/octet-stream, */*",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Blob ${blobId} not found in Software Heritage`);
          }
          if (response.status === 429) {
            // Rate limited - wait and retry
            const waitTime = 2 ** attempt * 1000; // Exponential backoff
            this.logger.warn(`Rate limited, waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        this.logger.debug(`Successfully fetched blob ${blobId} (${content.length} bytes)`);
        return content;
      } catch (error: any) {
        lastError = error;

        if (error.name === "AbortError") {
          this.logger.warn(`Timeout fetching blob ${blobId} (attempt ${attempt + 1})`);
        } else if (error.message?.includes("429")) {
          // Rate limited - will retry
          continue;
        } else {
          this.logger.warn(`Error fetching blob ${blobId} (attempt ${attempt + 1}):`, {
            error: error.message,
          });
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          const waitTime = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Failed to fetch blob ${blobId} after ${retries} attempts: ${lastError?.message || "Unknown error"}`,
    );
  }

  /**
   * Fetch using AWS S3 SDK (alternative method)
   */
  private async fetchContentS3(blobId: string, timeout: number, _retries: number): Promise<string> {
    try {
      // Dynamic import to avoid loading if not needed
      // Note: AWS SDK is optional - HTTP method is preferred
      let S3Client: any, GetObjectCommand: any;
      try {
        const s3Module = await import("@aws-sdk/client-s3");
        S3Client = s3Module.S3Client;
        GetObjectCommand = s3Module.GetObjectCommand;
      } catch (_importError) {
        throw new Error(
          "AWS SDK not available. Using HTTP method instead. " +
            "Install with: npm install @aws-sdk/client-s3",
        );
      }

      // Public bucket - no credentials needed
      const s3 = new S3Client({
        region: "us-east-1",
        credentials: undefined, // Public access
        requestHandler: {
          requestTimeout: timeout,
        },
      });

      const command = new GetObjectCommand({
        Bucket: "softwareheritage",
        Key: `content/${blobId}`,
      });

      const response = await s3.send(command);

      if (!response.Body) {
        throw new Error(`Empty response for blob ${blobId}`);
      }

      // Convert stream to string
      const stream = response.Body as any;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks as unknown as Uint8Array[]).toString("utf-8");
      this.logger.debug(`Successfully fetched blob ${blobId} via S3 SDK (${content.length} bytes)`);
      return content;
    } catch (error: any) {
      this.logger.error(`S3 SDK fetch failed for blob ${blobId}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch fetch multiple blobs concurrently
   */
  async fetchBatch(
    blobIds: string[],
    options: FetchOptions & { concurrency?: number } = {},
  ): Promise<Map<string, string>> {
    const concurrency = options.concurrency || 10;
    const results = new Map<string, string>();
    const errors = new Map<string, Error>();

    // Process in batches
    for (let i = 0; i < blobIds.length; i += concurrency) {
      const batch = blobIds.slice(i, i + concurrency);

      const promises = batch.map(async (blobId) => {
        try {
          const content = await this.fetchContent(blobId, options);
          return { blobId, content, error: null };
        } catch (error) {
          return {
            blobId,
            content: null,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      });

      const batchResults = await Promise.allSettled(promises);

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const { blobId, content, error } = result.value;
          if (error) {
            errors.set(blobId, error);
          } else if (content) {
            results.set(blobId, content);
          }
        } else {
          // Promise rejected
          const blobId = batch[batchResults.indexOf(result)];
          errors.set(blobId, result.reason);
        }
      }

      // Log batch progress
      this.logger.debug(
        `Fetched batch ${Math.floor(i / concurrency) + 1}: ${results.size} success, ${errors.size} errors`,
      );
    }

    if (errors.size > 0) {
      this.logger.warn(`Failed to fetch ${errors.size} blobs:`, {
        failedBlobs: Array.from(errors.keys()).slice(0, 5),
      });
    }

    return results;
  }

  /**
   * Check if a blob exists without fetching full content
   */
  async blobExists(blobId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/content/${blobId}`;
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (_error) {
      return false;
    }
  }
}
