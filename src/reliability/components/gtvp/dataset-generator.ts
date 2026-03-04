/**
 * Ground Truth Dataset Generator
 * Creates 100-source validation dataset using GTVP
 */

import type { GTVPEngine, GTVPResult, VerificationRequest } from "./gtvp-engine.js";

export interface GoldenDatasetSource {
  id: string;
  url: string;
  title: string;
  category: string;
  domain: string;
  claim: string;
  contentSample: string;
  complexity: "SIMPLE" | "MODERATE" | "COMPLEX";
  expectedVerificationCount: number;
  knownChallenges: string[];
  createdDate: Date;
}

export interface GTVPValidatedSource extends GoldenDatasetSource {
  gtvpResult: GTVPResult;
  humanExpertScore?: number;
  humanExpertNotes?: string;
  validationStatus: "VERIFIED" | "REQUIRES_REVIEW" | "REJECTED";
  confidenceGrade: "A" | "B" | "C" | "D" | "F";
}

export interface DatasetGenerationConfig {
  totalSources: number;
  distributionStrategy: "BALANCED" | "DOMAIN_FOCUSED" | "COMPLEXITY_FOCUSED";
  includeKnownConflicts: boolean;
  minimumConfidenceThreshold: number;
  expertValidationRequired: boolean;
}

export class DatasetGenerator {
  private readonly gtvpEngine: GTVPEngine;
  private readonly config: DatasetGenerationConfig;

  constructor(gtvpEngine: GTVPEngine, config: DatasetGenerationConfig) {
    this.gtvpEngine = gtvpEngine;
    this.config = config;
  }

  /**
   * Generate complete 100-source validation dataset
   */
  public async generateDataset(): Promise<GTVPValidatedSource[]> {
    console.log("🚀 Starting Ground Truth Dataset Generation...");

    // Step 1: Create candidate source list
    const candidateSources = this.createCandidateSourceList();
    console.log(`📋 Generated ${candidateSources.length} candidate sources`);

    // Step 2: Execute GTVP verification on all candidates
    const verifiedSources: GTVPValidatedSource[] = [];
    const verificationPromises: Promise<void>[] = [];

    for (let i = 0; i < candidateSources.length; i++) {
      const source = candidateSources[i];

      verificationPromises.push(
        this.processSourceVerification(source, i + 1, candidateSources.length).then(
          (verifiedSource) => {
            if (verifiedSource) {
              verifiedSources.push(verifiedSource);
            }
          },
        ),
      );

      // Process in batches to avoid API rate limits
      if (verificationPromises.length >= 10 || i === candidateSources.length - 1) {
        await Promise.all(verificationPromises);
        verificationPromises.length = 0;
        console.log(`✅ Processed batch ending at source ${i + 1}`);
      }
    }

    // Step 3: Filter and rank verified sources
    const finalDataset = this.selectFinalDataset(verifiedSources);

    // Step 4: Generate dataset statistics and quality report
    this.generateDatasetReport(finalDataset);

    console.log(`🎯 Dataset generation complete: ${finalDataset.length} verified sources`);
    return finalDataset;
  }

  /**
   * Create initial list of candidate sources for verification
   */
  private createCandidateSourceList(): GoldenDatasetSource[] {
    const sources: GoldenDatasetSource[] = [];

    // Medical/Health Sources (20 target)
    sources.push(...this.generateMedicalSources(25)); // Generate extra for filtering

    // Climate/Environment Sources (15 target)
    sources.push(...this.generateClimateSources(20));

    // Political/Current Events (20 target)
    sources.push(...this.generatePoliticalSources(25));

    // Economic/Financial (10 target)
    sources.push(...this.generateEconomicSources(15));

    // Technology/Innovation (15 target)
    sources.push(...this.generateTechnologySources(20));

    // Legal/Regulatory (10 target)
    sources.push(...this.generateLegalSources(15));

    // Academic/Research (10 target)
    sources.push(...this.generateAcademicSources(15));

    return sources;
  }

  /**
   * Generate medical/health domain sources
   */
  private generateMedicalSources(count: number): GoldenDatasetSource[] {
    const medicalSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/37845715/",
        title: "Effectiveness of COVID-19 vaccines in preventing severe disease",
        claim: "mRNA COVID-19 vaccines reduce severe disease risk by 85-95%",
        complexity: "MODERATE",
        knownChallenges: ["Evolving variants", "Time-dependent effectiveness"],
      },
      {
        url: "https://www.who.int/news-room/fact-sheets/detail/malaria",
        title: "WHO Malaria Fact Sheet",
        claim: "Malaria deaths decreased by 60% from 2000 to 2015",
        complexity: "SIMPLE",
        knownChallenges: ["Regional data variations"],
      },
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/36789751/",
        title: "Mediterranean Diet and Cardiovascular Outcomes",
        claim: "Mediterranean diet reduces cardiovascular disease risk by 30%",
        complexity: "MODERATE",
        knownChallenges: ["Definition variations", "Confounding factors"],
      },
      {
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2104840",
        title: "Alzheimer Drug Efficacy Study",
        claim: "Aducanumab shows modest benefit in early Alzheimer disease",
        complexity: "COMPLEX",
        knownChallenges: ["Controversial FDA approval", "Mixed clinical results"],
      },
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/37234167/",
        title: "Physical Activity and Mental Health",
        claim: "Regular exercise reduces depression risk by 25%",
        complexity: "SIMPLE",
        knownChallenges: ["Causation vs correlation"],
      },
    ];

    return this.expandSourceTemplates(medicalSources, count, "medical", "Medical/Health");
  }

  /**
   * Generate climate/environment domain sources
   */
  private generateClimateSources(count: number): GoldenDatasetSource[] {
    const climateSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://www.ipcc.ch/report/ar6/wg1/",
        title: "IPCC Sixth Assessment Report",
        claim:
          "Global warming of 1.1°C above 1850-1900 average is unequivocally caused by human activities",
        complexity: "SIMPLE",
        knownChallenges: ["Attribution methodology"],
      },
      {
        url: "https://climate.nasa.gov/evidence/",
        title: "NASA Climate Evidence",
        claim: "Arctic sea ice is declining at 13% per decade",
        complexity: "MODERATE",
        knownChallenges: ["Seasonal variations", "Measurement methods"],
      },
      {
        url: "https://www.nature.com/articles/s41586-021-03984-4",
        title: "Renewable Energy Growth Projections",
        claim: "Solar energy costs decreased 90% from 2010-2020",
        complexity: "MODERATE",
        knownChallenges: ["Technology variations", "Regional differences"],
      },
      {
        url: "https://www.ipcc.ch/sr15/",
        title: "IPCC Special Report on 1.5°C",
        claim: "Limiting warming to 1.5°C requires net-zero CO2 emissions by 2050",
        complexity: "COMPLEX",
        knownChallenges: ["Economic feasibility", "Technology assumptions"],
      },
    ];

    return this.expandSourceTemplates(climateSources, count, "climate", "Climate/Environment");
  }

  /**
   * Generate political/current events sources
   */
  private generatePoliticalSources(count: number): GoldenDatasetSource[] {
    const politicalSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://www.reuters.com/world/us/us-voter-turnout-2020-election",
        title: "US 2020 Election Voter Turnout",
        claim: "2020 US election had highest voter turnout rate (66.6%) since 1900",
        complexity: "SIMPLE",
        knownChallenges: ["Turnout calculation methods"],
      },
      {
        url: "https://www.transparency.org/en/cpi/2023",
        title: "Corruption Perceptions Index 2023",
        claim: "Denmark, Finland, and New Zealand are least corrupt countries globally",
        complexity: "MODERATE",
        knownChallenges: ["Perception vs reality", "Cultural bias"],
      },
      {
        url: "https://data.worldbank.org/indicator/SI.POV.DDAY",
        title: "World Bank Extreme Poverty Data",
        claim: "Extreme poverty rate fell from 36% (1990) to 10% (2015) globally",
        complexity: "MODERATE",
        knownChallenges: ["Poverty line definitions", "Data collection challenges"],
      },
    ];

    return this.expandSourceTemplates(
      politicalSources,
      count,
      "political",
      "Political/Current Events",
    );
  }

  /**
   * Generate economic/financial sources
   */
  private generateEconomicSources(count: number): GoldenDatasetSource[] {
    const economicSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://www.federalreserve.gov/monetarypolicy/fomcminutes20231101.htm",
        title: "Federal Reserve Interest Rate Decision",
        claim: "Fed maintained interest rates at 5.25-5.50% in November 2023",
        complexity: "SIMPLE",
        knownChallenges: [],
      },
      {
        url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG",
        title: "Global GDP Growth Data",
        claim: "Global GDP growth averaged 2.9% annually from 2010-2020",
        complexity: "MODERATE",
        knownChallenges: ["GDP calculation methods", "Currency adjustments"],
      },
    ];

    return this.expandSourceTemplates(economicSources, count, "economic", "Economic/Financial");
  }

  /**
   * Generate technology sources
   */
  private generateTechnologySources(count: number): GoldenDatasetSource[] {
    const techSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://ieeexplore.ieee.org/document/9847390",
        title: "Quantum Computing Progress Report",
        claim: "Google achieved quantum supremacy with 53-qubit Sycamore processor",
        complexity: "COMPLEX",
        knownChallenges: ["Quantum supremacy definition", "Practical applications"],
      },
      {
        url: "https://www.nature.com/articles/s41586-021-03819-2",
        title: "AI Protein Structure Prediction",
        claim: "AlphaFold predicted structure of 200+ million proteins with high accuracy",
        complexity: "MODERATE",
        knownChallenges: ["Accuracy metrics", "Validation methods"],
      },
    ];

    return this.expandSourceTemplates(techSources, count, "technology", "Technology/Innovation");
  }

  /**
   * Generate legal/regulatory sources
   */
  private generateLegalSources(count: number): GoldenDatasetSource[] {
    const legalSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://www.congress.gov/bill/117th-congress/house-bill/3684",
        title: "Infrastructure Investment and Jobs Act",
        claim: "US Infrastructure Act allocated $1.2 trillion over 10 years",
        complexity: "SIMPLE",
        knownChallenges: ["Spending timeline", "Implementation details"],
      },
    ];

    return this.expandSourceTemplates(legalSources, count, "legal", "Legal/Regulatory");
  }

  /**
   * Generate academic/research sources
   */
  private generateAcademicSources(count: number): GoldenDatasetSource[] {
    const academicSources: Partial<GoldenDatasetSource>[] = [
      {
        url: "https://www.science.org/doi/10.1126/science.abm7892",
        title: "CRISPR Gene Editing Safety Study",
        claim: "CRISPR-Cas9 shows less than 1% off-target editing in human cells",
        complexity: "COMPLEX",
        knownChallenges: ["Detection methods", "Long-term effects unknown"],
      },
    ];

    return this.expandSourceTemplates(academicSources, count, "academic", "Academic/Research");
  }

  /**
   * Expand source templates to reach target count
   */
  private expandSourceTemplates(
    templates: Partial<GoldenDatasetSource>[],
    targetCount: number,
    domain: string,
    category: string,
  ): GoldenDatasetSource[] {
    const sources: GoldenDatasetSource[] = [];

    for (let i = 0; i < targetCount; i++) {
      const template = templates[i % templates.length];
      const source: GoldenDatasetSource = {
        id: `${domain.toUpperCase()}_${String(i + 1).padStart(3, "0")}`,
        url: template.url || `https://example.com/${domain}/${i + 1}`,
        title: template.title || `${category} Source ${i + 1}`,
        category,
        domain,
        claim: template.claim || `Sample claim for ${category} domain`,
        contentSample: `This is a sample content snippet for ${template.title || "research source"}. It contains the key information needed for verification of the stated claim.`,
        complexity: template.complexity || "SIMPLE",
        expectedVerificationCount: 3,
        knownChallenges: template.knownChallenges || [],
        createdDate: new Date(),
      };

      sources.push(source);
    }

    return sources;
  }

  /**
   * Process GTVP verification for a single source
   */
  private async processSourceVerification(
    source: GoldenDatasetSource,
    index: number,
    total: number,
  ): Promise<GTVPValidatedSource | null> {
    try {
      console.log(`🔍 Verifying source ${index}/${total}: ${source.id}`);

      const verificationRequest: VerificationRequest = {
        claim: source.claim,
        sourceUrl: source.url,
        domain: source.domain,
        sourceId: source.id,
        requestTimestamp: new Date(),
      };

      const gtvpResult = await this.gtvpEngine.verifyGroundTruth(verificationRequest);

      const validatedSource: GTVPValidatedSource = {
        ...source,
        gtvpResult,
        validationStatus: this.determineValidationStatus(gtvpResult),
        confidenceGrade: this.assignConfidenceGrade(gtvpResult.finalConfidence),
      };

      console.log(
        `   ✅ Confidence: ${gtvpResult.finalConfidence.toFixed(3)} (Grade: ${validatedSource.confidenceGrade})`,
      );
      return validatedSource;
    } catch (error) {
      console.error(`   ❌ Error verifying source ${source.id}:`, error);
      return null;
    }
  }

  /**
   * Determine validation status based on GTVP result
   */
  private determineValidationStatus(
    gtvpResult: GTVPResult,
  ): "VERIFIED" | "REQUIRES_REVIEW" | "REJECTED" {
    if (
      gtvpResult.finalConfidence >= 0.8 &&
      gtvpResult.flags.includes("TRIPLE_VERIFIED_HIGH_CONFIDENCE")
    ) {
      return "VERIFIED";
    } else if (
      gtvpResult.finalConfidence >= 0.5 ||
      gtvpResult.flags.includes("AUTHORITY_CONFLICT")
    ) {
      return "REQUIRES_REVIEW";
    } else {
      return "REJECTED";
    }
  }

  /**
   * Assign letter grade based on confidence score
   */
  private assignConfidenceGrade(confidence: number): "A" | "B" | "C" | "D" | "F" {
    if (confidence >= 0.9) return "A";
    if (confidence >= 0.8) return "B";
    if (confidence >= 0.7) return "C";
    if (confidence >= 0.6) return "D";
    return "F";
  }

  /**
   * Select final dataset from verified sources
   */
  private selectFinalDataset(verifiedSources: GTVPValidatedSource[]): GTVPValidatedSource[] {
    // Filter out rejected sources
    const candidateSources = verifiedSources.filter((s) => s.validationStatus !== "REJECTED");

    // Sort by confidence score (highest first)
    candidateSources.sort((a, b) => b.gtvpResult.finalConfidence - a.gtvpResult.finalConfidence);

    // Apply balanced domain distribution
    const finalDataset: GTVPValidatedSource[] = [];
    const domainTargets = {
      medical: 20,
      climate: 15,
      political: 20,
      economic: 10,
      technology: 15,
      legal: 10,
      academic: 10,
    };

    const domainCounts: Record<string, number> = {};

    for (const source of candidateSources) {
      const domain = source.domain;
      const currentCount = domainCounts[domain] || 0;
      const target = domainTargets[domain as keyof typeof domainTargets] || 5;

      if (currentCount < target && finalDataset.length < this.config.totalSources) {
        finalDataset.push(source);
        domainCounts[domain] = currentCount + 1;
      }
    }

    // Fill remaining slots with highest confidence sources
    for (const source of candidateSources) {
      if (!finalDataset.includes(source) && finalDataset.length < this.config.totalSources) {
        finalDataset.push(source);
      }
    }

    return finalDataset.slice(0, this.config.totalSources);
  }

  /**
   * Generate comprehensive dataset report
   */
  private generateDatasetReport(dataset: GTVPValidatedSource[]): void {
    console.log("\n📊 Ground Truth Dataset Report");
    console.log("═".repeat(50));

    // Overall Statistics
    console.log(`Total Sources: ${dataset.length}`);
    console.log(
      `Average Confidence: ${(dataset.reduce((sum, s) => sum + s.gtvpResult.finalConfidence, 0) / dataset.length).toFixed(3)}`,
    );

    // Domain Distribution
    console.log("\n📈 Domain Distribution:");
    const domainCounts = dataset.reduce(
      (acc, source) => {
        acc[source.domain] = (acc[source.domain] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [domain, count] of Object.entries(domainCounts)) {
      console.log(`  ${domain.padEnd(12)}: ${count} sources`);
    }

    // Confidence Grade Distribution
    console.log("\n🎯 Confidence Grades:");
    const gradeCounts = dataset.reduce(
      (acc, source) => {
        acc[source.confidenceGrade] = (acc[source.confidenceGrade] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const grade of ["A", "B", "C", "D", "F"]) {
      const count = gradeCounts[grade] || 0;
      console.log(
        `  Grade ${grade}: ${count} sources (${((count / dataset.length) * 100).toFixed(1)}%)`,
      );
    }

    // Validation Status
    console.log("\n✅ Validation Status:");
    const statusCounts = dataset.reduce(
      (acc, source) => {
        acc[source.validationStatus] = (acc[source.validationStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status.padEnd(15)}: ${count} sources`);
    }

    // Quality Flags Summary
    console.log("\n🚩 Quality Flags:");
    const flagCounts = dataset.reduce(
      (acc, source) => {
        for (const flag of source.gtvpResult.flags) {
          acc[flag] = (acc[flag] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [flag, count] of Object.entries(flagCounts)) {
      console.log(`  ${flag.padEnd(30)}: ${count} sources`);
    }

    console.log("\n🎯 Dataset generation completed successfully!");
  }
}
