/**
 * Fallacy Detection Module for Multi-Agent Debate
 * Automated detection of logical fallacies with confidence scoring
 */

import type { DebateArgument, FallacyDetection, FallacyType } from "./debate-types.js";

interface FallacyPattern {
  type: FallacyType;
  name: string;
  description: string;
  patterns: RegExp[];
  contextPatterns?: RegExp[];
  severity: "low" | "medium" | "high" | "critical";
  severityScore: number; // 1-10 research-based severity score
  confidenceWeight: number; // Base confidence for pattern matches
  examples?: string[];
}

interface FallacyLibrary {
  fallacies: FallacyPattern[];
  version: string;
  lastUpdated: string;
}

export class FallacyDetector {
  private readonly fallacyLibrary: FallacyLibrary;
  private readonly confidenceThreshold = 0.3; // Minimum confidence to report
  private readonly contextWindowSize = 100; // Characters around pattern match

  constructor(fallacyLibrary?: FallacyLibrary) {
    this.fallacyLibrary = fallacyLibrary || this.getDefaultFallacyLibrary();
  }

  /**
   * Detect fallacies in debate arguments
   */
  public detectFallacies(debateArguments: DebateArgument[]): FallacyDetection[] {
    try {
      if (!Array.isArray(debateArguments)) {
        return [];
      }

      const detections: FallacyDetection[] = [];

      for (const argument of debateArguments) {
        const argumentDetections = this.analyzeArgumentForFallacies(argument);
        detections.push(...argumentDetections);
      }

      // Sort by confidence and severity
      return detections.sort((a, b) => {
        if (a.severity !== b.severity) {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.confidence - a.confidence;
      });
    } catch (err) {
      // In strict environments, always return an array for robustness
      console.warn("Fallacy detection fallback triggered:", err);
      return [];
    }
  }

  /**
   * Analyze a single argument for fallacies
   */
  private analyzeArgumentForFallacies(argument: DebateArgument): FallacyDetection[] {
    const detections: FallacyDetection[] = [];
    const content = argument.content.toLowerCase();

    for (const fallacyPattern of this.fallacyLibrary.fallacies) {
      const detection = this.checkFallacyPattern(content, fallacyPattern, argument.role);

      if (detection && detection.confidence >= this.confidenceThreshold) {
        detections.push({
          ...detection,
          location: `${argument.role} argument`,
        });
      }
    }

    return detections;
  }

  /**
   * Check for a specific fallacy pattern
   */
  private checkFallacyPattern(
    content: string,
    pattern: FallacyPattern,
    role: string,
  ): FallacyDetection | null {
    let maxConfidence = 0;
    let bestMatch = "";

    // Check main patterns
    for (const regex of pattern.patterns) {
      const matches = content.match(regex);
      if (matches) {
        const confidence = this.calculatePatternConfidence(matches, pattern, content, role);

        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = matches[0];
        }
      }
    }

    // Boost confidence if context patterns also match
    if (maxConfidence > 0 && pattern.contextPatterns) {
      for (const contextRegex of pattern.contextPatterns) {
        if (content.match(contextRegex)) {
          maxConfidence = Math.min(1.0, maxConfidence * 1.2);
          break;
        }
      }
    }

    if (maxConfidence < this.confidenceThreshold) {
      return null;
    }

    return {
      type: pattern.type,
      description: `${pattern.name}: ${pattern.description}`,
      confidence: maxConfidence,
      location: `"${bestMatch.substring(0, 50)}..."`,
      severity: pattern.severity,
      severityScore: pattern.severityScore,
    };
  }

  /**
   * Calculate confidence for pattern match
   */
  private calculatePatternConfidence(
    matches: RegExpMatchArray,
    pattern: FallacyPattern,
    fullContent: string,
    role: string,
  ): number {
    let confidence = pattern.confidenceWeight;

    // Adjust based on match quality
    const matchText = matches[0];
    const matchLength = matchText.length;

    // Longer, more specific matches get higher confidence
    if (matchLength > 50) confidence += 0.1;
    if (matchLength > 100) confidence += 0.1;

    // Multiple occurrences increase confidence
    const allMatches = fullContent.match(new RegExp(matches[0], "gi"));
    if (allMatches && allMatches.length > 1) {
      confidence += Math.min(0.2, (allMatches.length - 1) * 0.05);
    }

    // Role-specific adjustments
    if (role === "prosecutor" && pattern.type === "ad_hominem") {
      confidence += 0.1; // Prosecutors more likely to attack
    }
    if (role === "defense" && pattern.type === "appeal_to_authority") {
      confidence += 0.1; // Defense more likely to cite authorities
    }

    // Context-based adjustments
    if (this.hasNegationContext(fullContent, matches.index || 0)) {
      confidence *= 0.7; // Reduce if negated
    }

    if (this.hasQuestionContext(fullContent, matches.index || 0)) {
      confidence *= 0.8; // Reduce if in question form
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Check if match is in negation context
   */
  private hasNegationContext(content: string, matchIndex: number): boolean {
    const contextStart = Math.max(0, matchIndex - this.contextWindowSize);
    const contextEnd = Math.min(content.length, matchIndex + this.contextWindowSize);
    const context = content.substring(contextStart, contextEnd);

    const negationPatterns = [
      /\bnot\b/,
      /\bnever\b/,
      /\bno\b/,
      /\bisn't\b/,
      /\baren't\b/,
      /\bwon't\b/,
      /\bcan't\b/,
      /\bdon't\b/,
      /\bdoesn't\b/,
    ];

    return negationPatterns.some((pattern) => pattern.test(context));
  }

  /**
   * Check if match is in question context
   */
  private hasQuestionContext(content: string, matchIndex: number): boolean {
    const contextStart = Math.max(0, matchIndex - this.contextWindowSize);
    const contextEnd = Math.min(content.length, matchIndex + this.contextWindowSize);
    const context = content.substring(contextStart, contextEnd);

    return (
      /\?/.test(context) || /\b(what|why|how|when|where|who|would|could|should)\b/i.test(context)
    );
  }

  /**
   * Generate fallacy impact score for composite scoring
   */
  public calculateFallacyImpact(detections: FallacyDetection[]): number {
    if (detections.length === 0) return 0;

    let totalImpact = 0;
    const severityWeights = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.2 };

    for (const detection of detections) {
      const impact = detection.confidence * severityWeights[detection.severity];
      totalImpact += impact;
    }

    // Diminishing returns for multiple fallacies
    const adjustedImpact = totalImpact * (1 - Math.exp(-detections.length / 3));

    return Math.min(1.0, adjustedImpact);
  }

  /**
   * Generate fallacy report for audit trail
   */
  public generateFallacyReport(detections: FallacyDetection[]): string[] {
    const report: string[] = [];

    if (detections.length === 0) {
      report.push("[FALLACY_SCAN] No logical fallacies detected");
      return report;
    }

    report.push(`[FALLACY_SCAN] ${detections.length} potential fallacies detected`);

    const criticalFallacies = detections.filter((d) => d.severity === "critical");
    if (criticalFallacies.length > 0) {
      report.push(`[CRITICAL_FALLACIES] ${criticalFallacies.length} critical logical errors found`);
    }

    const fallacyTypes = new Set(detections.map((d) => d.type));
    report.push(`[FALLACY_TYPES] ${Array.from(fallacyTypes).join(", ")}`);

    const totalImpact = this.calculateFallacyImpact(detections);
    report.push(
      `[FALLACY_IMPACT] Overall logical integrity score: ${(1 - totalImpact).toFixed(3)}`,
    );

    // Detail high-confidence detections
    const highConfidenceDetections = detections.filter((d) => d.confidence > 0.7);
    for (const detection of highConfidenceDetections) {
      report.push(
        `[FALLACY_DETAIL] ${detection.description} (${(detection.confidence * 100).toFixed(1)}% confidence)`,
      );
    }

    return report;
  }

  /**
   * Load fallacy library from JSON file with research-enhanced patterns
   */
  private getDefaultFallacyLibrary(): FallacyLibrary {
    // Research-based fallacies with sophisticated pattern matching
    return {
      version: "3.0.0",
      lastUpdated: new Date().toISOString(),
      fallacies: [
        {
          type: "gish_gallop",
          name: "Gish Gallop",
          description:
            "A rhetorical technique that overwhelms an opponent by presenting an excessive number of arguments without regard for their accuracy or strength",
          patterns: [
            /\b(?:dozens?|many|multiple|numerous)\s+(?:reasons?|arguments?|points?)\s+(?:why|that|showing)\b/i,
            /\bstudies\s+show\b(?!\s+(?:that|how|specifically))/i,
            /\bexperts?\s+(?:say|agree|believe)\b(?!\s+(?:that|how))/i,
            /\b(?:first|second|third|fourth|fifth|next)\s*[,:;]\s*(?:also|furthermore|moreover|additionally)/i,
            /\b(?:there\s+are\s+)?(?:many|several|countless|numerous)\s+(?:issues|problems|concerns|reasons)\b/i,
          ],
          contextPatterns: [
            /\b(?:overwhelming|undeniable|massive)\s+(?:evidence|proof)\b/i,
            /\b(?:dozens|scores|hundreds)\s+of\s+(?:studies|experts|examples)\b/i,
          ],
          severity: "critical",
          severityScore: 9,
          confidenceWeight: 0.8,
          examples: [
            "I have dozens of reasons why this is wrong: studies show X, experts say Y, data proves Z...",
          ],
        },
        {
          type: "motivated_reasoning",
          name: "Motivated Reasoning",
          description:
            "A cognitive bias wherein individuals process information to reach preferred conclusions",
          patterns: [
            /\bdismiss(?:es?|ing)?\s+(?:as|because)\s+(?:biased|agenda[-\s]driven|corrupt)\b/i,
            /\bi\s+knew\s+it\b|\bfinally[,!\s]+proof\b|\bobviously\s+(?:true|false)\b/i,
            /\bthat\s+can't\s+be\s+(?:right|true|accurate)\b/i,
            /\bof\s+course\s+(?:they'd|you'd)\s+say\s+that\b/i,
            /\b(?:clearly|obviously)\s+(?:agenda|bias|motive)\b/i,
          ],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.7,
        },
        {
          type: "false_dichotomy",
          name: "False Dichotomy",
          description: "Presenting only two options when more exist",
          patterns: [
            /\byou're\s+either\s+.+\s+or\s+.+/i,
            /\bthere\s+are\s+only\s+two\s+(?:options?|choices?)\b/i,
            /\bit's\s+(?:either\s+)?\w+\s+or\s+\w+/i,
            /\byou\s+(?:must|have\s+to)\s+(?:choose|pick)\s+(?:between|one\s+or\s+the\s+other)\b/i,
          ],
          contextPatterns: [/\bno\s+middle\s+ground\b/i, /\bwith\s+us\s+or\s+against\s+us\b/i],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.6,
        },
        {
          type: "cherry_picking",
          name: "Cherry Picking",
          description:
            "Selectively citing data that supports a conclusion while ignoring contradictory evidence",
          patterns: [
            /\ba\s+study\s+shows\b(?!.*(?:meta[-\s]analysis|systematic\s+review|consensus))/i,
            /\bsome\s+(?:experts?|researchers?)\s+(?:believe|think|say)\b/i,
            /\b(?:recent|new)\s+(?:data|research|study)\s+(?:shows?|proves?)\b/i,
            /\baccording\s+to\s+(?:one|this)\s+(?:study|expert|source)\b/i,
          ],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.6,
        },
        {
          type: "post_hoc",
          name: "Post Hoc Ergo Propter Hoc",
          description: "Mistaking temporal succession for causal connection",
          patterns: [
            /\bever\s+since\s+\w+\s+(?:happened|started)[,\s]+\w+\s+(?:has\s+been|started)\b/i,
            /\bright\s+after\s+\w+[,\s]+\w+\s+(?:started|began|occurred)\b/i,
            /\b(?:this|that)\s+(?:can't\s+be|isn't)\s+(?:a\s+)?coincidence\b/i,
            /\b(?:clearly|obviously)\s+\w+\s+caused\s+\w+\b/i,
          ],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.5,
        },
        {
          type: "appeal_to_emotion",
          name: "Appeal to Emotion",
          description: "Using emotion rather than logic to persuade",
          patterns: [
            /\bthink\s+(?:of|about)\s+the\s+(?:children|victims|families)\b/i,
            /\b(?:catastrophic|devastating|destroyed?|nightmare\s+scenario)\b/i,
            /\bhow\s+can\s+you\s+(?:sleep|live\s+with\s+yourself)\b/i,
            /\bimagine\s+if\s+(?:this|that)\s+(?:were|was)\s+your\b/i,
          ],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.6,
        },
        {
          type: "confirmation_bias",
          name: "Confirmation Bias",
          description:
            "Tendency to notice and interpret information to confirm pre-existing beliefs",
          patterns: [
            /\bthat\s+can't\s+be\s+(?:right|true|correct)\b/i,
            /\b(?:selective|biased)\s+(?:attention|focus)\s+to\s+(?:news|sources?)\b/i,
            /\bseeking\s+(?:out|for)\s+(?:confirming|supporting)\s+evidence\b/i,
          ],
          severity: "high",
          severityScore: 8,
          confidenceWeight: 0.7,
        },
        {
          type: "straw_man",
          name: "Straw Man",
          description: "Misrepresenting opponent's position to make it easier to attack",
          patterns: [
            /\bso\s+what\s+you're\s+(?:really\s+)?(?:saying|claiming|arguing)\s+is\b/i,
            /\bmy\s+opponent\s+(?:wants|believes)\s+(?:to|that)\b/i,
            /\blet\s+me\s+get\s+this\s+straight[—:-]\s*you\s+(?:believe|think)\b/i,
            /\boh[,\s]+so\s+you\s+think\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.5,
        },
        {
          type: "circular_reasoning",
          name: "Circular Reasoning",
          description: "Using the conclusion as evidence for the premise",
          patterns: [
            /\bbecause\s+(?:it|that|this)(?:'s|\s+is)\s+(?:the\s+way\s+it\s+is|true|correct|right)\b/i,
            /\b(?:it|this|that)(?:'s|\s+is)\s+right\s+because\s+(?:it|this|that)(?:'s|\s+is)\s+(?:right|correct)\b/i,
            /\bby\s+definition\b(?!\s+\w+\s+(?:means|refers))/i,
            /\bit\s+just\s+is\b|\bthat's\s+just\s+how\s+it\s+works\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.5,
        },
        {
          type: "slippery_slope",
          name: "Slippery Slope",
          description:
            "Asserting that a minor action will trigger increasingly severe consequences",
          patterns: [
            /\bif\s+we\s+(?:allow|permit|let)\s+.+[,\s]+(?:then|there's\s+nothing\s+to\s+stop)\b/i,
            /\bwhich\s+will\s+lead\s+to\s+.+\s+which\s+will\s+lead\s+to\b/i,
            /\bthis\s+is\s+the\s+first\s+step\s+toward\b/i,
            /\bonce\s+we\s+start\s+(?:down\s+this\s+road|this)\b/i,
            /\bnext\s+thing\s+you\s+know\b/i,
            /\bif\s+we\s+follow\s+.+\s+then\s+.+\s+will\s+(?:collapse|fail|be\s+destroyed)\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.4,
        },
        {
          type: "hasty_generalization",
          name: "Hasty Generalization",
          description: "Drawing broad conclusions from insufficient evidence",
          patterns: [
            /\ball\s+\w+\s+(?:are|do|have|will)\b/i,
            /\bevery(?:one|body|thing)\s+(?:in|from|who|that)\b/i,
            /\bnever\s+trust\s+(?:a|any)\b/i,
            /\balways\s+(?:does|is|are|will)\b/i,
            /\b(?:people|men|women)\s+from\s+\w+\s+are\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.4,
        },
        {
          type: "red_herring",
          name: "Red Herring",
          description: "Introducing irrelevant information to divert attention",
          patterns: [
            /\bbut\s+what\s+about\s+(?:\w+\s+)?(?:issue|problem|concern)\b/i,
            /\bbefore\s+we\s+discuss\s+(?:that|this)[,\s]+let's\s+talk\s+about\b/i,
            /\bthe\s+real\s+(?:issue|problem)\s+(?:here\s+)?is\b/i,
            /\bwe\s+should\s+be\s+(?:talking|focusing)\s+(?:about|on)\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.3,
        },
        {
          type: "anecdotal_evidence",
          name: "Anecdotal Evidence",
          description: "Relying on personal experiences as sufficient evidence for general claims",
          patterns: [
            /\bi\s+know\s+someone\s+who\b/i,
            /\bthis\s+happened\s+to\s+me[,\s]+(?:therefore|so)\b/i,
            /\bmy\s+(?:uncle|friend|neighbor|cousin)\s+(?:tried|used|did|experienced)\b/i,
            /\bin\s+my\s+experience\b/i,
            /\bi(?:'ve|\s+have)\s+seen\s+(?:this|that)\s+(?:happen|work|fail)\b/i,
            /\bthis\s+happened\s+to\s+me[,\s]+therefore\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.4,
        },
        {
          type: "false_equivalence",
          name: "False Equivalence",
          description: "Drawing false equivalence between subjects with fundamental differences",
          patterns: [
            /\bboth\s+sides\s+(?:are\s+)?(?:equally\s+)?(?:guilty|bad|wrong)\b/i,
            /\b\w+\s+is\s+just\s+as\s+(?:bad|good|wrong|right)\s+as\s+\w+\b/i,
            /\b(?:politicians|parties)\s+are\s+all\s+the\s+same\b/i,
            /\bboth\s+\w+\s+and\s+\w+\s+(?:do|are|have)\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.5,
        },
        {
          type: "no_true_scotsman",
          name: "No True Scotsman",
          description: "Defending generalizations by arbitrarily excluding counterexamples",
          patterns: [
            /\bno\s+(?:true|real)\s+\w+\s+(?:would|could)\b/i,
            /\bthat\s+person\s+isn't\s+a\s+(?:real|true)\s+\w+\b/i,
            /\bthose\s+examples\s+don't\s+count\s+because\b/i,
            /\banyone\s+who\s+.+\s+isn't\s+(?:really|truly)\s+a\s+\w+\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.5,
        },
        {
          type: "loaded_question",
          name: "Loaded Question",
          description: "Questions containing implicit, unproven presuppositions",
          patterns: [
            /\bhave\s+you\s+stopped\s+.+\?/i,
            /\bwhy\s+did\s+you\s+(?:decide|choose)\s+to\b/i,
            /\bhow\s+many\s+times\s+(?:have\s+you|did\s+you)\b/i,
            /\bwhen\s+will\s+you\s+finally\b/i,
            /\bwhat\s+caused\s+you\s+to\b/i,
          ],
          severity: "medium",
          severityScore: 7,
          confidenceWeight: 0.5,
        },
        {
          type: "ad_hominem",
          name: "Ad Hominem",
          description: "Attacking the person rather than addressing the argument",
          patterns: [
            // Research-based sophisticated patterns
            /\byou're\s+wrong\s+because\s+you're\s+(?:\w+\s+)?(?:biased|stupid|corrupt|dishonest)\b/i,
            /\bof\s+course\s+(?:they'd|you'd)\s+say\s+that[—,]\s*look\s+who\s+(?:they\s+are|you\s+are)\b/i,
            /\bdon't\s+listen\s+to\s+(?:them|him|her)[,\s]+(?:they're|he's|she's)\s+(?:biased|corrupt|stupid)\b/i,
            /\byour\s+motives\s+are\s+(?:suspect|questionable)[,\s]+therefore\b/i,
            // Broader basic patterns for common cases
            /\b(you|they|he|she)\s+(are|is)\s+(?:just\s+)?(?:stupid|dumb|ignorant|biased|corrupt|dishonest)\b/i,
            /\bcan't\s+trust\s+\w+\s+because\s+(he|she|they)(?:'re|\s+are|\s+is)\s+(?:stupid|biased|corrupt)\b/i,
            /\b(liar|fraud|shill|puppet)\b/i,
            /\bconsider\s+the\s+source\b/i,
          ],
          severity: "low",
          severityScore: 6,
          confidenceWeight: 0.6,
        },
        {
          type: "appeal_to_authority",
          name: "Appeal to Authority",
          description: "Citing irrelevant or questionable authority as evidence",
          patterns: [
            // Research-based sophisticated patterns
            /\b(?:expert|dr\.?|celebrity|famous)\s+\w+\s+says\s+\w+\b/i,
            /\bas\s+a\s+(?:successful|wealthy)\s+\w+[,\s]+i\s+know\s+\w+\s+is\b/i,
            /\bscientists?\s+agree\b(?!\s+(?:that|based\s+on|according\s+to))/i,
            /\b(?:ancient|traditional)\s+wisdom\s+(?:says|tells\s+us)\b/i,
            // Broader basic patterns
            /\bexperts?\s+(?:all\s+)?agree\b/i,
            /\bscience\s+(?:says|proves|shows)\b/i,
            /\b(?:everyone|everybody)\s+knows\b/i,
            /\bstudies\s+show\b(?!\s+(?:that|how))/i,
          ],
          severity: "low",
          severityScore: 6,
          confidenceWeight: 0.4,
        },
        {
          type: "bandwagon",
          name: "Bandwagon Appeal",
          description: "Asserting claims are true because they are widely believed",
          patterns: [
            /\b(?:millions|thousands)\s+of\s+people\s+(?:believe|think)\s+\w+[,\s]+so\s+\w+\s+must\s+be\s+(?:true|right)\b/i,
            /\beveryone(?:'s|\s+is)\s+doing\s+it\b/i,
            /\bthe\s+majority\s+can't\s+be\s+wrong\b/i,
            /\bdon't\s+be\s+left\s+behind\b|\bjoin\s+the\s+(?:movement|majority)\b/i,
          ],
          severity: "low",
          severityScore: 6,
          confidenceWeight: 0.4,
        },
        {
          type: "tu_quoque",
          name: "Tu Quoque / Whataboutism",
          description: "Deflecting criticism by pointing out critic's similar faults",
          patterns: [
            /\bbut\s+you\s+did\s+the\s+same\s+thing\b/i,
            /\bwhat\s+about\s+when\s+(?:you|they|\w+)\s+did\s+\w+\b/i,
            /\bbefore\s+we\s+discuss\s+my\s+(?:actions|behavior)[,\s]+let's\s+talk\s+about\s+yours\b/i,
            /\bthat's\s+rich\s+coming\s+from\s+you\b/i,
            /\bboth\s+sides\s+do\s+it[,\s]+so\b/i,
          ],
          severity: "low",
          severityScore: 6,
          confidenceWeight: 0.4,
        },
      ],
    };
  }

  /**
   * Update fallacy library with new patterns
   */
  public updateFallacyLibrary(newLibrary: FallacyLibrary): void {
    // In production, this would validate and merge libraries
    this.fallacyLibrary.fallacies = newLibrary.fallacies;
    this.fallacyLibrary.version = newLibrary.version;
    this.fallacyLibrary.lastUpdated = newLibrary.lastUpdated;
  }

  /**
   * Get fallacy statistics for analysis
   */
  public getFallacyStatistics(detections: FallacyDetection[]): {
    totalCount: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    averageConfidence: number;
    highConfidenceCount: number;
  } {
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let highConfidenceCount = 0;

    for (const detection of detections) {
      bySeverity[detection.severity]++;
      byType[detection.type] = (byType[detection.type] || 0) + 1;
      totalConfidence += detection.confidence;

      if (detection.confidence > 0.7) {
        highConfidenceCount++;
      }
    }

    return {
      totalCount: detections.length,
      bySeverity,
      byType,
      averageConfidence: detections.length > 0 ? totalConfidence / detections.length : 0,
      highConfidenceCount,
    };
  }
}
