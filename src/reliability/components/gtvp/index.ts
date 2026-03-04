/**
 * Ground Truth Verification Protocol (GTVP) Module
 * Multi-authority verification with conflict resolution
 */

export type {
  DatasetGenerationConfig,
  GoldenDatasetSource,
  GTVPValidatedSource,
} from "./dataset-generator.js";
export { DatasetGenerator } from "./dataset-generator.js";

export type {
  AuthoritySource,
  ConflictResolution,
  GTVPConfig,
  GTVPResult,
  VerificationRequest,
  VerificationResult,
} from "./gtvp-engine.js";
export { GTVPEngine } from "./gtvp-engine.js";
