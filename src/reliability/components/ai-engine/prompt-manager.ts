import type { InstructionPayload, PromptTemplate, SourceAnalysis } from "./types.js";

/**
 * Prompt Management System
 * Manages AI prompts for different source types and assessment scenarios
 * Implements the prompt engineering strategy from the research specification
 */
export class PromptManager {
  private readonly templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Get appropriate prompt template for the assessment request
   */
  public getTemplate(sourceType: string, requireConsensus: boolean = false): PromptTemplate {
    // For consensus mode, always return the consensus template
    if (requireConsensus) {
      return this.templates.get("consensus") || this.createFallbackTemplate();
    }

    return (
      this.templates.get(sourceType) ||
      this.templates.get("default") ||
      this.createFallbackTemplate()
    );
  }

  /**
   * Build complete prompt from template and instruction payload
   */
  public buildPrompt(
    template: PromptTemplate,
    instructionPayload: InstructionPayload,
    sourceAnalysis: SourceAnalysis,
    sourceContent: string,
    sourceUrl?: string,
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = this.interpolateSystemPrompt(template, instructionPayload);
    const userPrompt = this.interpolateUserPrompt(
      template,
      instructionPayload,
      sourceAnalysis,
      sourceContent,
      sourceUrl,
    );

    return { systemPrompt, userPrompt };
  }

  /**
   * Add or update a prompt template
   */
  public addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): Map<string, PromptTemplate> {
    return new Map(this.templates);
  }

  /**
   * Initialize default prompt templates for each source type
   */
  private initializeDefaultTemplates(): void {
    // Academic source template
    this.templates.set("academic", {
      id: "academic",
      name: "Academic Source Assessment",
      description: "Specialized prompt for peer-reviewed and academic content",
      systemPrompt: `You are an expert academic source reliability assessor. Your role is to analyze academic and scholarly content for reliability and credibility.

CRITICAL INSTRUCTIONS:
- You must operate STRICTLY within the provided constraints
- NEVER assess prohibited dimensions
- Use EXACT weights provided for each allowed dimension
- Provide detailed reasoning for academic standards

Assessment Framework:
- Citations and References: Quality, relevance, and comprehensiveness
- Peer Review Status: Verification of editorial oversight
- Author Credentials: Academic expertise and institutional affiliation
- Methodological Rigor: Research design and execution quality
- Institutional Reputation: Publisher or institution credibility

OUTPUT FORMAT: Return only valid JSON following the schema provided.`,

      userPromptTemplate: `Analyze this academic source for reliability:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}
DOMAIN: {domain}

ALLOWED DIMENSIONS: {allowedDimensions}
PROHIBITED DIMENSIONS: {prohibitedAssessments}
DIMENSION WEIGHTS: {dimensionWeights}

CONSTRAINTS:
- Minimum Score: {minScore}
- Maximum Score: {maxScore}
- Confidence Threshold: {confidenceThreshold}
- Temperature: {temperature}

SPECIAL INSTRUCTIONS: {specialNotes}

SOURCE CONTENT:
{sourceContent}

Provide a comprehensive reliability assessment following academic standards.`,

      outputSchema: {
        reliabilityScore: "number (0.0-1.0)",
        confidence: "number (0.0-1.0)",
        factorsAnalyzed: "object with factor analysis",
        reasoning: "array of strings",
        prohibitedCheck: "object confirming what was not assessed",
      },
      supportedDimensions: [
        "citations",
        "expertReview",
        "authorCredentials",
        "institutionalAffiliation",
      ],
      version: "2.0.0",
    });

    // Wikipedia template
    this.templates.set("wikipedia", {
      id: "wikipedia",
      name: "Wikipedia Source Assessment",
      description: "Specialized prompt for Wikipedia and collaborative content",
      systemPrompt: `You are an expert at assessing Wikipedia and collaborative encyclopedia content for reliability.

CRITICAL INSTRUCTIONS:
- Wikipedia has unique characteristics: collaborative editing, extensive citations, editorial oversight
- Focus on citation quality, edit stability, and content comprehensiveness
- Account for Wikipedia's editorial processes and fact-checking mechanisms
- NEVER assess individual author credentials (Wikipedia is collaborative)

Assessment Framework:
- Citation Quality: Reliability and relevance of referenced sources
- Edit Stability: Revision history and consensus indicators
- Expert Review: Evidence of expert editorial oversight
- Completeness: Comprehensiveness of coverage
- Controversy Indicators: Disputed content or edit wars

OUTPUT FORMAT: Return only valid JSON following the schema.`,

      userPromptTemplate: `Analyze this Wikipedia article for reliability:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}
EDIT STABILITY: {editStability}

ALLOWED DIMENSIONS: {allowedDimensions}
PROHIBITED DIMENSIONS: {prohibitedAssessments}
DIMENSION WEIGHTS: {dimensionWeights}

CONSTRAINTS:
- Minimum Score: {minScore}
- Maximum Score: {maxScore}
- Confidence Threshold: {confidenceThreshold}

CONTENT:
{sourceContent}

Focus on Wikipedia's unique collaborative editing model and citation system.`,

      outputSchema: {
        reliabilityScore: "number (0.0-0.9)", // Wikipedia cap
        confidence: "number (0.0-1.0)",
        factorsAnalyzed: "object with factor analysis",
        reasoning: "array of strings",
      },
      supportedDimensions: [
        "citations",
        "editStability",
        "expertReview",
        "completeness",
        "controversy",
      ],
      version: "2.0.0",
    });

    // Government source template
    this.templates.set("government", {
      id: "government",
      name: "Government Source Assessment",
      description: "Specialized prompt for official government sources",
      systemPrompt: `You are an expert at assessing government and official source reliability.

CRITICAL INSTRUCTIONS:
- Government sources have inherent institutional authority
- Baseline trust level: {trustBaseline}
- NEVER assess political bias (prohibited for government sources)
- Focus on institutional credibility, data quality, and official status

Assessment Framework:
- Institutional Authority: Government agency credibility
- Data Quality: Accuracy and methodology of information
- Official Status: Verification of authentic government source
- Completeness: Thoroughness of information provided
- Update Frequency: Currency and maintenance of information

SPECIAL HANDLING: This source has a trust baseline - minimum score cannot fall below {minScore}, maximum score is {maxScore}`,

      userPromptTemplate: `Analyze this government source for reliability:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}
DOMAIN: {domain}
AGENCY: {agency}

TRUST BASELINE: {trustBaseline}
ALLOWED DIMENSIONS: {allowedDimensions}
PROHIBITED DIMENSIONS: {prohibitedAssessments}

CONSTRAINTS:
- Minimum Score: {minScore} (TRUST BASELINE)
- Maximum Score: {maxScore}

CONTENT:
{sourceContent}

Assess based on government source standards with appropriate trust baseline.`,

      outputSchema: {
        reliabilityScore: "number (0.6-0.95)", // Government range
        confidence: "number (0.0-1.0)",
        factorsAnalyzed: "object",
        reasoning: "array of strings",
      },
      supportedDimensions: [
        "institutionalAffiliation",
        "completeness",
        "citations",
        "authorCredentials",
      ],
      version: "2.0.0",
    });

    // News source template
    this.templates.set("news", {
      id: "news",
      name: "News Source Assessment",
      description: "Specialized prompt for news and journalistic content",
      systemPrompt: `You are an expert at assessing news and journalistic content for reliability.

CRITICAL INSTRUCTIONS:
- Evaluate journalistic standards, source transparency, and editorial oversight
- Consider reputation of news organization
- Assess fact-checking processes and correction policies
- Balance timeliness with accuracy verification

Assessment Framework:
- Source Transparency: Clear attribution and sourcing
- Editorial Standards: Evidence of fact-checking and editorial review
- Organization Reputation: Track record and credibility of news outlet
- Objectivity: Balance in presentation and avoidance of sensationalism
- Citations: Quality and verification of sources cited

OUTPUT FORMAT: Return only valid JSON following the schema.`,

      userPromptTemplate: `Analyze this news article for reliability:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}
DOMAIN: {domain}
NEWS OUTLET: {newsOutlet}

ALLOWED DIMENSIONS: {allowedDimensions}
PROHIBITED DIMENSIONS: {prohibitedAssessments}
DIMENSION WEIGHTS: {dimensionWeights}

CONSTRAINTS:
- Minimum Score: {minScore}
- Maximum Score: {maxScore}
- Confidence Threshold: {confidenceThreshold}

SPECIAL INSTRUCTIONS: {specialNotes}

CONTENT:
{sourceContent}

Assess based on journalistic standards and news credibility criteria.`,

      outputSchema: {
        reliabilityScore: "number (0.0-1.0)",
        confidence: "number (0.0-1.0)",
        factorsAnalyzed: "object",
        reasoning: "array of strings",
        prohibitedCheck: "object",
      },
      supportedDimensions: ["citations", "objectivity", "expertReview", "recency"],
      version: "2.0.0",
    });

    // Default/fallback template
    this.templates.set("default", {
      id: "default",
      name: "General Source Assessment",
      description: "Default template for unknown or general sources",
      systemPrompt: `You are a general source reliability assessor. Analyze content conservatively.

CRITICAL INSTRUCTIONS:
- Be conservative with unknown source types
- Strictly follow provided constraints
- Never exceed allowed dimensions
- Provide detailed reasoning for all assessments

Assessment Framework:
- Source credibility indicators
- Content quality and accuracy
- Evidence and citations
- Author expertise (if available)
- Potential biases or conflicts of interest`,

      userPromptTemplate: `Analyze this source for reliability:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}

ALLOWED DIMENSIONS: {allowedDimensions}
PROHIBITED DIMENSIONS: {prohibitedAssessments}
WEIGHTS: {dimensionWeights}

CONSTRAINTS:
- Min: {minScore}, Max: {maxScore}
- Confidence: {confidenceThreshold}

SPECIAL INSTRUCTIONS: {specialNotes}

CONTENT:
{sourceContent}

Provide conservative assessment for this unknown source type.`,

      outputSchema: {
        reliabilityScore: "number (0.0-0.4)", // Conservative cap
        confidence: "number (0.0-1.0)",
        factorsAnalyzed: "object",
        reasoning: "array of strings",
      },
      supportedDimensions: ["citations", "completeness", "authorCredentials"],
      version: "2.0.0",
    });

    // Consensus mode template (used when multiple models need to agree)
    this.templates.set("consensus", {
      id: "consensus",
      name: "Consensus Assessment Mode",
      description: "Template for multi-model consensus assessments",
      systemPrompt: `You are participating in a consensus assessment with other AI models.

CONSENSUS MODE INSTRUCTIONS:
- Provide your independent assessment
- Be explicit about your reasoning
- Note any areas of uncertainty
- Use standardized scoring criteria
- Another model will also assess - focus on objectivity

Your assessment will be compared with other models to reach consensus.`,

      userPromptTemplate: `CONSENSUS ASSESSMENT - Provide your independent evaluation:

URL: {sourceUrl}
SOURCE TYPE: {sourceType}

ASSESSMENT CONSTRAINTS:
{constraintsSummary}

CONTENT:
{sourceContent}

Provide detailed, objective assessment for consensus evaluation.`,

      outputSchema: {
        reliabilityScore: "number",
        confidence: "number",
        factorsAnalyzed: "object",
        reasoning: "array of strings",
        uncertaintyAreas: "array of strings",
      },
      supportedDimensions: ["all"],
      version: "2.0.0",
    });
  }

  /**
   * Interpolate system prompt with instruction payload data
   */
  private interpolateSystemPrompt(template: PromptTemplate, payload: InstructionPayload): string {
    let prompt = template.systemPrompt;

    // Replace placeholders with actual values
    if (payload.specialNotes) {
      prompt = prompt.replaceAll(
        "{trustBaseline}",
        payload.specialNotes.find((note) => note.includes("TRUST_BASELINE"))?.split(" ")[2] ||
          "0.6",
      );
    }

    prompt = prompt.replaceAll("{minScore}", (payload.minScore ?? 0).toString());
    prompt = prompt.replaceAll("{maxScore}", (payload.maxScore ?? 1).toString());
    prompt = prompt.replaceAll("{sourceType}", payload.sourceType || "unknown");

    return prompt;
  }

  /**
   * Interpolate user prompt with all available data
   */
  private interpolateUserPrompt(
    template: PromptTemplate,
    payload: InstructionPayload,
    analysis: SourceAnalysis,
    content: string,
    url?: string,
  ): string {
    let prompt = template.userPromptTemplate;

    // Replace all placeholders with safe defaults
    const replacements = {
      "{sourceUrl}": url || "Not provided",
      "{sourceType}": payload.sourceType || "unknown",
      "{domain}": analysis.domain || "unknown",
      "{allowedDimensions}": (payload.allowedDimensions || []).join(", ") || "None specified",
      "{prohibitedAssessments}":
        (payload.prohibitedAssessments || []).join(", ") || "None specified",
      "{dimensionWeights}": JSON.stringify(payload.dimensionWeights || {}, null, 2),
      "{minScore}": (payload.minScore ?? 0).toString(),
      "{maxScore}": (payload.maxScore ?? 1).toString(),
      "{confidenceThreshold}": (payload.confidenceThreshold ?? 0.7).toString(),
      "{temperature}": (payload.temperature ?? 0.1).toString(),
      "{specialNotes}": payload.specialNotes?.join("; ") || "None",
      "{sourceContent}": content?.slice(0, 8000) || "No content provided", // Truncate if too long
      "{constraintsSummary}": this.buildConstraintsSummary(payload),
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      prompt = prompt.replaceAll(
        new RegExp(placeholder.replaceAll(/[{}]/g, String.raw`\$&`), "g"),
        value,
      );
    }

    return prompt;
  }

  /**
   * Build a summary of constraints for consensus mode
   */
  private buildConstraintsSummary(payload: InstructionPayload): string {
    return `
Allowed: ${(payload.allowedDimensions || []).join(", ") || "None specified"}
Prohibited: ${(payload.prohibitedAssessments || []).join(", ") || "None specified"}
Score Range: ${payload.minScore ?? 0} - ${payload.maxScore ?? 1}
Confidence: ${payload.confidenceThreshold ?? 0.7}
`;
  }

  /**
   * Create a basic fallback template if none exists
   */
  private createFallbackTemplate(): PromptTemplate {
    return {
      id: "fallback",
      name: "Emergency Fallback",
      description: "Basic template when no others are available",
      systemPrompt: "You are a source reliability assessor. Be conservative.",
      userPromptTemplate: "Assess this source: {sourceContent}",
      outputSchema: { reliabilityScore: "number", confidence: "number" },
      supportedDimensions: ["basic"],
      version: "1.0.0",
    };
  }
}
