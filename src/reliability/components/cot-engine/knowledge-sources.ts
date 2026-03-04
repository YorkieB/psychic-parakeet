/**
 * Knowledge Sources for RAG Verification
 * Interfaces to authoritative databases and fact-checking APIs
 */

interface SourceResult {
  source: string;
  status: "confirmed" | "contradicted" | "insufficient_data";
  confidence: number;
  evidence?: string;
  url?: string;
  trustScore?: number;
}

interface APIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  rateLimitPerMinute: number;
  trustScore: number; // 0-1, higher = more trusted
}

export class KnowledgeSources {
  private readonly pubmedConfig: APIConfig;
  private readonly wikipediaConfig: APIConfig;
  private readonly governmentConfig: APIConfig;
  private readonly factCheckConfig: APIConfig;
  private readonly requestCounts: Map<string, { count: number; resetTime: number }>;

  constructor() {
    // Configure API endpoints (in production, these would come from environment variables)
    this.pubmedConfig = {
      baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
      timeout: 5000,
      rateLimitPerMinute: 100,
      trustScore: 0.9, // Very high trust for peer-reviewed sources
    };

    this.wikipediaConfig = {
      baseUrl: "https://en.wikipedia.org/api/rest_v1",
      timeout: 3000,
      rateLimitPerMinute: 200,
      trustScore: 0.6, // Moderate trust for Wikipedia
    };

    this.governmentConfig = {
      baseUrl: "https://api.data.gov",
      timeout: 5000,
      rateLimitPerMinute: 1000,
      trustScore: 0.85, // High trust for government data
    };

    this.factCheckConfig = {
      baseUrl: "https://factchecktools.googleapis.com/v1alpha1",
      apiKey: process.env.FACT_CHECK_API_KEY,
      timeout: 4000,
      rateLimitPerMinute: 100,
      trustScore: 0.8, // High trust for fact-checking sites
    };

    this.requestCounts = new Map();
  }

  /**
   * Query PubMed for scientific literature
   */
  public async queryPubMed(claim: string): Promise<SourceResult | null> {
    if (!this.checkRateLimit("pubmed")) {
      return null;
    }

    try {
      // Extract key terms for search
      const searchTerms = this.extractScientificTerms(claim);
      if (searchTerms.length === 0) {
        return {
          source: "PubMed",
          status: "insufficient_data",
          confidence: 0.1,
          evidence: "No scientific terms detected in claim",
        };
      }

      // Search PubMed (simplified - in production would use actual API)
      const searchQuery = searchTerms.join(" AND ");
      const mockResult = await this.mockPubMedSearch(searchQuery);

      return {
        source: "PubMed",
        status: mockResult.status,
        confidence: mockResult.confidence * this.pubmedConfig.trustScore,
        evidence: mockResult.evidence,
        url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchQuery)}`,
        trustScore: this.pubmedConfig.trustScore,
      };
    } catch (error) {
      return {
        source: "PubMed",
        status: "insufficient_data",
        confidence: 0.1,
        evidence: `API Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Query Wikipedia for general information
   */
  public async queryWikipedia(claim: string): Promise<SourceResult | null> {
    if (!this.checkRateLimit("wikipedia")) {
      return null;
    }

    try {
      // Extract key terms for Wikipedia search
      const searchTerms = this.extractWikipediaTerms(claim);
      if (searchTerms.length === 0) {
        return {
          source: "Wikipedia",
          status: "insufficient_data",
          confidence: 0.1,
        };
      }

      // Search Wikipedia (simplified)
      const mockResult = await this.mockWikipediaSearch(searchTerms.join(" "));

      return {
        source: "Wikipedia",
        status: mockResult.status,
        confidence: mockResult.confidence * this.wikipediaConfig.trustScore,
        evidence: mockResult.evidence,
        url: mockResult.url,
        trustScore: this.wikipediaConfig.trustScore,
      };
    } catch (error) {
      return {
        source: "Wikipedia",
        status: "insufficient_data",
        confidence: 0.1,
        evidence: `Wikipedia API Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Query government databases
   */
  public async queryGovernmentData(claim: string): Promise<SourceResult | null> {
    if (!this.checkRateLimit("government")) {
      return null;
    }

    try {
      // Look for statistical or policy-related claims
      const govTerms = this.extractGovernmentTerms(claim);
      if (govTerms.length === 0) {
        return {
          source: "Government Data",
          status: "insufficient_data",
          confidence: 0.2,
          evidence: "No government-related terms detected",
        };
      }

      // Query government data (simplified)
      const mockResult = await this.mockGovernmentSearch(govTerms.join(" "));

      return {
        source: "Government Data",
        status: mockResult.status,
        confidence: mockResult.confidence * this.governmentConfig.trustScore,
        evidence: mockResult.evidence,
        url: mockResult.url,
        trustScore: this.governmentConfig.trustScore,
      };
    } catch (error) {
      return {
        source: "Government Data",
        status: "insufficient_data",
        confidence: 0.1,
        evidence: `Government API Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Query fact-checking websites
   */
  public async queryFactCheckSites(claim: string): Promise<SourceResult | null> {
    if (!this.checkRateLimit("factcheck")) {
      return null;
    }

    try {
      // Use Google Fact Check Tools API (simplified)
      const mockResult = await this.mockFactCheckSearch(claim);

      return {
        source: "Fact Check Sites",
        status: mockResult.status,
        confidence: mockResult.confidence * this.factCheckConfig.trustScore,
        evidence: mockResult.evidence,
        url: mockResult.url,
        trustScore: this.factCheckConfig.trustScore,
      };
    } catch (error) {
      return {
        source: "Fact Check Sites",
        status: "insufficient_data",
        confidence: 0.1,
        evidence: `Fact Check API Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Extract scientific terms from claim
   */
  private extractScientificTerms(claim: string): string[] {
    const scientificPatterns = [
      /\b(?:study|studies|research|trial|experiment|analysis)\b/gi,
      /\b(?:covid|cancer|diabetes|depression|obesity|virus|bacteria)\b/gi,
      /\b(?:dna|rna|protein|gene|chromosome|mutation)\b/gi,
      /\b(?:clinical|medical|pharmaceutical|therapeutic)\b/gi,
      /\b(?:treatment|medication|drug|therapy|vaccine)\b/gi,
      /\b(?:peer[- ]reviewed|published|journal|findings)\b/gi,
    ];

    const terms = new Set<string>();
    const lowerClaim = claim.toLowerCase();

    for (const pattern of scientificPatterns) {
      const matches = lowerClaim.match(pattern);
      if (matches) {
        matches.forEach((match) => terms.add(match));
      }
    }

    // Extract specific measurements and statistics
    const numberPatterns = [
      /\d+(?:\.\d+)?%/g,
      /\d+\s+(?:times|fold|percent|mg|ml|cm|kg|years?)\b/gi,
    ];

    for (const pattern of numberPatterns) {
      const matches = claim.match(pattern);
      if (matches) {
        matches.forEach((match) => terms.add(match));
      }
    }

    return Array.from(terms).slice(0, 10); // Limit terms
  }

  /**
   * Extract Wikipedia-relevant terms
   */
  private extractWikipediaTerms(claim: string): string[] {
    // Remove common words and extract key terms
    const stopWords = new Set([
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "been",
      "have",
      "has",
      "had",
      "will",
      "would",
      "could",
      "should",
      "this",
      "that",
      "these",
      "those",
    ]);

    const words = claim
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);

    return words;
  }

  /**
   * Extract government/policy-related terms
   */
  private extractGovernmentTerms(claim: string): string[] {
    const governmentPatterns = [
      /\b(?:tax|taxes|taxation|revenue|budget|spending)\b/gi,
      /\b(?:unemployment|employment|jobs|economy|gdp|inflation)\b/gi,
      /\b(?:policy|law|regulation|legislation|bill|act)\b/gi,
      /\b(?:federal|state|local|government|congress|senate)\b/gi,
      /\b(?:statistics|data|census|survey|report)\b/gi,
      /\b(?:education|healthcare|medicare|medicaid|social\s+security)\b/gi,
    ];

    const terms = new Set<string>();
    const lowerClaim = claim.toLowerCase();

    for (const pattern of governmentPatterns) {
      const matches = lowerClaim.match(pattern);
      if (matches) {
        matches.forEach((match) => terms.add(match));
      }
    }

    return Array.from(terms).slice(0, 8);
  }

  /**
   * Check rate limiting for API calls
   */
  private checkRateLimit(source: string): boolean {
    const now = Date.now();
    const minute = 60 * 1000;

    const limit = this.getRateLimitForSource(source);
    if (!this.requestCounts.has(source)) {
      this.requestCounts.set(source, { count: 1, resetTime: now + minute });
      return true;
    }

    const current = this.requestCounts.get(source)!;
    if (now > current.resetTime) {
      // Reset counter
      current.count = 1;
      current.resetTime = now + minute;
      return true;
    }

    if (current.count >= limit) {
      return false; // Rate limit exceeded
    }

    current.count++;
    return true;
  }

  /**
   * Get rate limit for specific source
   */
  private getRateLimitForSource(source: string): number {
    switch (source) {
      case "pubmed":
        return this.pubmedConfig.rateLimitPerMinute;
      case "wikipedia":
        return this.wikipediaConfig.rateLimitPerMinute;
      case "government":
        return this.governmentConfig.rateLimitPerMinute;
      case "factcheck":
        return this.factCheckConfig.rateLimitPerMinute;
      default:
        return 10;
    }
  }

  // Mock implementations (in production, these would call actual APIs)

  private async mockPubMedSearch(query: string): Promise<{
    status: "confirmed" | "contradicted" | "insufficient_data";
    confidence: number;
    evidence: string;
  }> {
    // Simulate API delay
    const delay = process.env.NODE_ENV === "test" ? 10 : 100 + Math.random() * 300;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Mock logic based on query content
    const medicalTerms = ["study", "research", "clinical", "trial", "medical"];
    const hasMedicalTerms = medicalTerms.some((term) => query.toLowerCase().includes(term));

    if (!hasMedicalTerms) {
      return {
        status: "insufficient_data",
        confidence: 0.2,
        evidence: "No relevant medical literature found",
      };
    }

    // Simulate finding relevant studies
    const confidence = 0.6 + Math.random() * 0.3;
    const hasEvidence = Math.random() > 0.3;

    if (hasEvidence) {
      return {
        status: Math.random() > 0.7 ? "confirmed" : "contradicted",
        confidence,
        evidence: `Found ${Math.floor(Math.random() * 50) + 1} relevant studies in PubMed database`,
      };
    }

    return {
      status: "insufficient_data",
      confidence: 0.3,
      evidence: "Limited research available on this topic",
    };
  }

  private async mockWikipediaSearch(query: string): Promise<{
    status: "confirmed" | "contradicted" | "insufficient_data";
    confidence: number;
    evidence: string;
    url?: string;
  }> {
    const delay = process.env.NODE_ENV === "test" ? 5 : 50 + Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const hasArticle = Math.random() > 0.4;
    if (!hasArticle) {
      return {
        status: "insufficient_data",
        confidence: 0.2,
        evidence: "No relevant Wikipedia articles found",
      };
    }

    const confidence = 0.4 + Math.random() * 0.4;
    const mockTitle = query.split(" ").slice(0, 2).join("_");

    return {
      status: Math.random() > 0.6 ? "confirmed" : "insufficient_data",
      confidence,
      evidence: `Information found in Wikipedia article`,
      url: `https://en.wikipedia.org/wiki/${mockTitle}`,
    };
  }

  private async mockGovernmentSearch(query: string): Promise<{
    status: "confirmed" | "contradicted" | "insufficient_data";
    confidence: number;
    evidence: string;
    url?: string;
  }> {
    const delay = process.env.NODE_ENV === "test" ? 15 : 150 + Math.random() * 400;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const govTerms = ["unemployment", "tax", "policy", "budget", "statistics", "census"];
    const isGovRelevant = govTerms.some((term) => query.toLowerCase().includes(term));

    if (!isGovRelevant) {
      return {
        status: "insufficient_data",
        confidence: 0.1,
        evidence: "No relevant government data found",
      };
    }

    const confidence = 0.7 + Math.random() * 0.2;

    return {
      status: Math.random() > 0.5 ? "confirmed" : "insufficient_data",
      confidence,
      evidence: `Official government statistics and data sources consulted`,
      url: "https://data.gov",
    };
  }

  private async mockFactCheckSearch(claim: string): Promise<{
    status: "confirmed" | "contradicted" | "insufficient_data";
    confidence: number;
    evidence: string;
    url?: string;
  }> {
    const delay = process.env.NODE_ENV === "test" ? 20 : 200 + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simulate fact-checking sites having information on controversial topics
    const controversialTerms = ["vaccine", "election", "climate", "covid", "fraud", "conspiracy"];
    const isControversial = controversialTerms.some((term) => claim.toLowerCase().includes(term));

    if (!isControversial) {
      return {
        status: "insufficient_data",
        confidence: 0.3,
        evidence: "No fact-check articles found for this claim",
      };
    }

    const confidence = 0.8 + Math.random() * 0.15;
    const status =
      Math.random() > 0.4
        ? Math.random() > 0.6
          ? "confirmed"
          : "contradicted"
        : "insufficient_data";

    return {
      status,
      confidence,
      evidence: `Fact-checking sites have evaluated similar claims`,
      url: "https://factcheck.org",
    };
  }

  /**
   * Get source reliability statistics
   */
  public getSourceStatistics(): {
    sources: string[];
    trustScores: number[];
    rateLimits: number[];
    currentUsage: Array<{ source: string; requestCount: number; resetTime: number }>;
  } {
    const sources = ["PubMed", "Wikipedia", "Government Data", "Fact Check Sites"];
    const trustScores = [
      this.pubmedConfig.trustScore,
      this.wikipediaConfig.trustScore,
      this.governmentConfig.trustScore,
      this.factCheckConfig.trustScore,
    ];
    const rateLimits = [
      this.pubmedConfig.rateLimitPerMinute,
      this.wikipediaConfig.rateLimitPerMinute,
      this.governmentConfig.rateLimitPerMinute,
      this.factCheckConfig.rateLimitPerMinute,
    ];

    const currentUsage = Array.from(this.requestCounts.entries()).map(([source, data]) => ({
      source,
      requestCount: data.count,
      resetTime: data.resetTime,
    }));

    return {
      sources,
      trustScores,
      rateLimits,
      currentUsage,
    };
  }

  /**
   * Reset rate limiting counters (for testing)
   */
  public resetRateLimits(): void {
    this.requestCounts.clear();
  }

  /**
   * Update API configuration
   */
  public updateSourceConfig(source: string, config: Partial<APIConfig>): void {
    switch (source.toLowerCase()) {
      case "pubmed":
        Object.assign(this.pubmedConfig, config);
        break;
      case "wikipedia":
        Object.assign(this.wikipediaConfig, config);
        break;
      case "government":
        Object.assign(this.governmentConfig, config);
        break;
      case "factcheck":
        Object.assign(this.factCheckConfig, config);
        break;
    }
  }
}
