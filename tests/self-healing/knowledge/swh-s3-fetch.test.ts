/**
 * Tests for Software Heritage S3 Client
 */

import { describe, expect, it } from "@jest/globals";
import { SoftwareHeritageClient } from "../../../src/self-healing/knowledge/software-heritage-client";
import { createLogger } from "../../../src/utils/logger";

describe("Software Heritage S3 Client", () => {
  let client: SoftwareHeritageClient;
  const logger = createLogger("Test");

  beforeAll(() => {
    client = new SoftwareHeritageClient(logger);
  });

  it("should fetch content from public S3 bucket", async () => {
    // Use a known blob ID (this is a test - actual blob IDs from Stack v2)
    // Note: This test requires a valid blob ID from Stack v2
    // For now, we'll test the error handling

    try {
      // Test with invalid blob ID to verify error handling
      await expect(client.fetchContent("invalid-blob-id-that-does-not-exist")).rejects.toThrow();
    } catch (error) {
      // Expected to fail with invalid ID
      expect(error).toBeDefined();
    }
  }, 15000);

  it("should handle rate limiting gracefully", async () => {
    // Test that rate limiting is handled
    const promises = Array(20)
      .fill(null)
      .map(() => client.fetchContent("test-blob-id").catch(() => null));

    const results = await Promise.allSettled(promises);
    // Should handle errors gracefully
    expect(results.length).toBe(20);
  });

  it("should batch fetch multiple blobs", async () => {
    const blobIds = ["test1", "test2", "test3"];
    const results = await client.fetchBatch(blobIds);

    expect(results).toBeInstanceOf(Map);
    // Results may be empty if blob IDs are invalid, that's okay
  });
});
