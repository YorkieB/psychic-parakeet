import type { SourceAnalysis, SourceMetadata, SourceType } from "./types.js";

/**
 * Source Classification Module
 * Analyzes URLs and metadata to determine source type and characteristics
 */
export class SourceClassifier {
  private readonly academicDomains = new Set([
    ".edu",
    ".ac.uk",
    ".ac.au",
    ".edu.au",
    ".university",
    ".uni",
  ]);

  private readonly governmentTlds = new Set([".gov", ".gov.uk", ".gov.au", ".mil", ".europa.eu"]);

  private readonly newsDomains = new Set([
    "reuters.com",
    "ap.org",
    "bbc.com",
    "bbc.co.uk",
    "cnn.com",
    "npr.org",
    "pbs.org",
    "theguardian.com",
    "wsj.com",
    "nytimes.com",
    "washingtonpost.com",
    "ft.com",
    "economist.com",
  ]);

  private readonly wikipediaDomains = new Set([
    "wikipedia.org",
    "wikimedia.org",
    "wiktionary.org",
    "wikisource.org",
  ]);

  private readonly commercialIndicators = [
    "buy",
    "shop",
    "store",
    "purchase",
    "sale",
    "discount",
    "price",
    "affiliate",
    "sponsored",
    "ad",
    "marketing",
    "product",
  ];

  private readonly authoritySignals = [
    "peer-reviewed",
    "editorial",
    "fact-check",
    "verified",
    "official",
    "accredited",
    "licensed",
    "certified",
    "endorsed",
  ];

  /**
   * Classify source type based on URL and metadata
   */
  public classifySource(metadata: SourceMetadata): SourceType {
    const { domain, tld, url } = metadata;
    const lowerDomain = domain.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Government sources
    if (this.governmentTlds.has(tld) || this.isGovernmentDomain(lowerDomain)) {
      return "government";
    }

    // Academic sources
    if (this.academicDomains.has(tld) || this.isAcademicDomain(lowerDomain)) {
      return "academic";
    }

    // Wikipedia and wikis
    if (this.wikipediaDomains.has(lowerDomain)) {
      return "wikipedia";
    }

    // News sources
    if (this.newsDomains.has(lowerDomain) || this.isNewsDomain(lowerDomain)) {
      return "news";
    }

    // Blog detection (before commercial because some blogs might have commercial indicators)
    if (this.isBlogDomain(lowerDomain)) {
      return "blog";
    }

    // Forum/discussion platforms (before commercial because forums might have .io domains)
    if (this.isForumDomain(lowerDomain)) {
      return "forum";
    }

    // Commercial sources (after blog and forum to avoid false positives)
    if (this.hasCommercialIndicators(lowerUrl) || this.isCommercialDomain(lowerDomain)) {
      return "commercial";
    }

    return "unknown";
  }

  /**
   * Perform comprehensive source analysis
   */
  public analyzeSource(metadata: SourceMetadata): SourceAnalysis {
    const sourceType = this.classifySource(metadata);
    const commercialIndicators = this.detectCommercialIndicators(metadata.url, metadata.title);
    const authoritySignals = this.detectAuthoritySignals(metadata.url, metadata.title);

    return {
      sourceType,
      domain: metadata.domain,
      tld: metadata.tld,
      domainAge: metadata.domainAge,
      sslCertificate: metadata.hasSSL ?? false,
      blacklistStatus: false, // Will be set by blacklist checker
      whitelistStatus: false, // Will be set by whitelist checker
      commercialIndicators,
      authoritySignals,
    };
  }

  /**
   * Detect commercial indicators in URL and content
   */
  private detectCommercialIndicators(url: string, title?: string): string[] {
    const indicators: string[] = [];
    const content = `${url} ${title || ""}`.toLowerCase();

    for (const indicator of this.commercialIndicators) {
      if (content.includes(indicator)) {
        indicators.push(indicator);
      }
    }

    // Check URL structure for commercial patterns
    if (url.includes("/product/") || url.includes("/shop/") || url.includes("/buy/")) {
      indicators.push("commercial_url_structure");
    }

    if (url.includes("affiliate") || url.includes("ref=") || url.includes("utm_")) {
      indicators.push("affiliate_tracking");
    }

    return indicators;
  }

  /**
   * Detect authority signals in URL and content
   */
  private detectAuthoritySignals(url: string, title?: string): string[] {
    const signals: string[] = [];
    const content = `${url} ${title || ""}`.toLowerCase();

    for (const signal of this.authoritySignals) {
      if (content.includes(signal)) {
        signals.push(signal);
      }
    }

    return signals;
  }

  private isGovernmentDomain(domain: string): boolean {
    const govPatterns = [".gov.", "government.", "official.", "ministry.", "department."];
    return govPatterns.some((pattern) => domain.includes(pattern));
  }

  private isAcademicDomain(domain: string): boolean {
    const academicPatterns = [
      "university",
      "college",
      "institute",
      "research",
      "scholar",
      "academic",
    ];
    return academicPatterns.some((pattern) => domain.includes(pattern));
  }

  private isNewsDomain(domain: string): boolean {
    const newsPatterns = [
      "news",
      "times",
      "post",
      "herald",
      "tribune",
      "journal",
      "gazette",
      "press",
      "media",
      "broadcast",
      "radio",
      "television",
      "tv",
    ];
    return newsPatterns.some((pattern) => domain.includes(pattern));
  }

  private isCommercialDomain(domain: string): boolean {
    const commercialPatterns = [
      "shop",
      "store",
      "mall",
      "market",
      "retail",
      "sales",
      "business",
      "company",
      "corp",
      "inc",
      "ltd",
    ];
    return commercialPatterns.some((pattern) => domain.includes(pattern));
  }

  private isForumDomain(domain: string): boolean {
    const forumPatterns = [
      "forum",
      "discussion",
      "community",
      "reddit",
      "discourse",
      "board",
      "chat",
      "discuss",
    ];
    return forumPatterns.some((pattern) => domain.includes(pattern));
  }

  private isBlogDomain(domain: string): boolean {
    const blogPatterns = [
      "blog",
      "personal",
      "diary",
      "journal",
      "writing",
      "wordpress",
      "blogger",
      "tumblr",
    ];
    return blogPatterns.some((pattern) => domain.includes(pattern));
  }

  private hasCommercialIndicators(url: string): boolean {
    return this.detectCommercialIndicators(url).length > 0;
  }
}
