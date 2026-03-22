/**
 * Public shared domain entrypoint for generated documentation.
 *
 * This module groups the cross-cutting types and helpers that multiple Jarvis
 * domains depend on, including agent contracts, logging utilities, metrics, and
 * standard API response envelopes.
 */

export * from '../types/agent';
export { createLogger } from '../utils/logger';
export { MetricsCollector, globalMetrics } from '../utils/metrics';
export type { ErrorResponse, PaginatedResponse, SuccessResponse } from '../utils/response';
export { errorResponse, paginatedResponse, successResponse } from '../utils/response';
