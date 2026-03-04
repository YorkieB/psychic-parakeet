// Rules Engine Component - Entry Point
// Implements the rules-first governance architecture

export { DomainRulesSets } from "./domain-rules.js";
export { RulesEngine } from "./rules-engine.js";
export { SourceClassifier } from "./source-classifier.js";
export * from "./types.js";

import { DomainRulesSets } from "./domain-rules.js";
// Configuration helpers
import type { RulesEngineConfig } from "./types.js";

/**
 * Create default rules engine configuration
 */
export function createDefaultConfig(): RulesEngineConfig {
  return {
    domainRules: DomainRulesSets.getAllRuleSets(),
    blacklistedDomains: new Set([
      // Add known problematic domains
      "spam-site.com",
      "fake-news.net",
      "malware-host.org",
    ]),
    whitelistedDomains: new Set([
      // Add pre-approved high-quality domains
      "wikipedia.org",
      "stanford.edu",
      "mit.edu",
      "cdc.gov",
      "nih.gov",
    ]),
    defaultRules: DomainRulesSets.getRulesForSourceType("unknown"),
    enableAuditTrail: true,
    strictMode: false,
  };
}

/**
 * Create production-ready rules engine configuration
 */
export function createProductionConfig(): RulesEngineConfig {
  const config = createDefaultConfig();
  return {
    ...config,
    strictMode: true, // Stricter validation in production
    enableAuditTrail: true, // Always enable auditing in production
  };
}
