import type { DomainRules, SourceType } from "./types.js";

/**
 * Domain-Specific Rule Sets
 * Defines rules and constraints for different source types based on research specifications
 */
export class DomainRulesSets {
  /**
   * Get domain-specific rules for each source type
   */
  public static getRulesForSourceType(sourceType: SourceType): DomainRules {
    switch (sourceType) {
      case "academic":
        return DomainRulesSets.getAcademicRules();
      case "wikipedia":
        return DomainRulesSets.getWikipediaRules();
      case "news":
        return DomainRulesSets.getNewsRules();
      case "government":
        return DomainRulesSets.getGovernmentRules();
      case "blog":
        return DomainRulesSets.getBlogRules();
      case "commercial":
        return DomainRulesSets.getCommercialRules();
      case "forum":
        return DomainRulesSets.getForumRules();
      default:
        return DomainRulesSets.getDefaultRules();
    }
  }

  /**
   * Academic (.edu, peer-reviewed) source rules
   */
  private static getAcademicRules(): DomainRules {
    return {
      sourceType: "academic",
      allowedDimensions: [
        "citations",
        "expertReview",
        "authorCredentials",
        "institutionalAffiliation",
        "completeness",
        "controversy",
      ],
      prohibitedAssessments: ["commercialIntent"],
      defaultWeights: {
        citations: 0.3, // High weight for citations in academic
        expertReview: 0.25, // Peer review is critical
        authorCredentials: 0.2,
        institutionalAffiliation: 0.15,
        completeness: 0.1,
      },
      minScore: 0,
      maxScore: 1, // Academic can achieve highest scores
      confidenceThreshold: 0.85, // High confidence required
      specialHandling: {
        requirePeerReview: true,
        enhancedFactChecking: false,
      },
    };
  }

  /**
   * Wikipedia-specific rules (collaborative content)
   */
  private static getWikipediaRules(): DomainRules {
    return {
      sourceType: "wikipedia",
      allowedDimensions: [
        "citations",
        "editStability",
        "expertReview",
        "completeness",
        "controversy",
      ],
      prohibitedAssessments: [
        "authorCredentials", // No individual authors
        "institutionalAffiliation",
        "commercialIntent", // Non-commercial by nature
      ],
      defaultWeights: {
        citations: 0.25, // References are crucial
        editStability: 0.2, // Edit history matters
        expertReview: 0.2, // Editorial oversight
        completeness: 0.2, // Comprehensiveness
        controversy: -0.15, // Controversial topics penalized
      },
      minScore: 0,
      maxScore: 0.9, // Cap below academic sources
      confidenceThreshold: 0.7,
      specialHandling: {
        skipCommercialDetection: true,
      },
    };
  }

  /**
   * News source rules (journalism standards)
   */
  private static getNewsRules(): DomainRules {
    return {
      sourceType: "news",
      allowedDimensions: [
        "citations",
        "authorCredentials",
        "institutionalAffiliation",
        "completeness",
        "editStability",
      ],
      prohibitedAssessments: [
        "expertReview", // Not peer-reviewed like academic
      ],
      defaultWeights: {
        citations: 0.25, // Source attribution important
        authorCredentials: 0.25, // Journalist credentials matter
        institutionalAffiliation: 0.2, // News organization reputation
        completeness: 0.15,
        editStability: 0.15,
      },
      minScore: 0,
      maxScore: 0.85, // Good journalism can score high
      confidenceThreshold: 0.75,
      specialHandling: {
        enhancedFactChecking: true,
      },
    };
  }

  /**
   * Government source rules (official information)
   */
  private static getGovernmentRules(): DomainRules {
    return {
      sourceType: "government",
      allowedDimensions: [
        "citations",
        "institutionalAffiliation",
        "completeness",
        "authorCredentials",
      ],
      prohibitedAssessments: [
        "politicalBias", // Don't assess gov sources for political bias
        "commercialIntent", // Non-commercial by nature
      ],
      defaultWeights: {
        institutionalAffiliation: 0.4, // Government authority is key
        completeness: 0.3,
        citations: 0.2,
        authorCredentials: 0.1,
      },
      minScore: 0.6, // Baseline trust for official sources
      maxScore: 0.95, // Can be highly reliable
      confidenceThreshold: 0.6,
      specialHandling: {
        trustBaseline: 0.6,
        skipCommercialDetection: true,
      },
    };
  }

  /**
   * Blog source rules (personal/individual content)
   */
  private static getBlogRules(): DomainRules {
    return {
      sourceType: "blog",
      allowedDimensions: [
        "citations",
        "authorCredentials",
        "completeness",
        "commercialIntent",
        "controversy",
      ],
      prohibitedAssessments: [
        "institutionalAffiliation", // Usually individual authors
        "expertReview", // Not peer-reviewed
      ],
      defaultWeights: {
        authorCredentials: 0.3, // Individual expertise crucial
        citations: 0.25,
        completeness: 0.2,
        commercialIntent: -0.15, // Commercial intent reduces score
        controversy: -0.1,
      },
      minScore: 0,
      maxScore: 0.75, // Limited by lack of institutional backing
      confidenceThreshold: 0.65,
    };
  }

  /**
   * Commercial source rules (marketing/sales content)
   */
  private static getCommercialRules(): DomainRules {
    return {
      sourceType: "commercial",
      allowedDimensions: [
        "citations",
        "completeness",
        "institutionalAffiliation",
        "commercialIntent",
      ],
      prohibitedAssessments: [
        "expertReview", // Not peer-reviewed
      ],
      defaultWeights: {
        commercialIntent: -0.4, // Heavy penalty for commercial intent
        institutionalAffiliation: 0.3, // Company reputation matters
        citations: 0.2,
        completeness: 0.2,
      },
      minScore: 0,
      maxScore: 0.6, // Capped due to inherent bias
      confidenceThreshold: 0.7,
    };
  }

  /**
   * Forum/discussion source rules (community content)
   */
  private static getForumRules(): DomainRules {
    return {
      sourceType: "forum",
      allowedDimensions: ["citations", "completeness", "controversy", "editStability"],
      prohibitedAssessments: [
        "authorCredentials", // Usually anonymous
        "institutionalAffiliation",
        "expertReview",
      ],
      defaultWeights: {
        citations: 0.3,
        editStability: 0.25, // Thread/post history
        completeness: 0.25,
        controversy: -0.2, // Controversial topics common
      },
      minScore: 0,
      maxScore: 0.5, // Limited reliability for forums
      confidenceThreshold: 0.6,
    };
  }

  /**
   * Default/fallback rules for unknown source types
   */
  private static getDefaultRules(): DomainRules {
    return {
      sourceType: "unknown",
      allowedDimensions: ["citations", "completeness", "authorCredentials"],
      prohibitedAssessments: [],
      defaultWeights: {
        citations: 0.3,
        completeness: 0.35,
        authorCredentials: 0.35,
      },
      minScore: 0,
      maxScore: 0.4, // Conservative cap for unknown sources
      confidenceThreshold: 0.5,
    };
  }

  /**
   * Get all available rule sets
   */
  public static getAllRuleSets(): Map<SourceType, DomainRules> {
    const ruleSets = new Map<SourceType, DomainRules>();

    const sourceTypes: SourceType[] = [
      "academic",
      "wikipedia",
      "news",
      "government",
      "blog",
      "commercial",
      "forum",
      "unknown",
    ];

    for (const sourceType of sourceTypes) {
      ruleSets.set(sourceType, DomainRulesSets.getRulesForSourceType(sourceType));
    }

    return ruleSets;
  }
}
