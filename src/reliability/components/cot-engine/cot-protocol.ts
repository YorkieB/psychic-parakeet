/**
 * COT Protocol - The "Thinking Blueprint" for Jarvis
 * Defines the multi-stage logical steps for Advanced Critical Thinking (ACT)
 */
export const COT_PROTOCOL = {
  version: "1.0.0",

  stages: [
    {
      id: "deconstruct",
      name: "Atomic Claim Extraction",
      instruction: "Break the text into individual, testable claims. Ignore filler language.",
    },
    {
      id: "challenge",
      name: "Devils Advocate",
      instruction: "For every claim, identify one reason why it might be false or misleading.",
    },
    {
      id: "verify",
      name: "Evidence Trace",
      instruction: "Verify if the citations provided actually support the specific claims made.",
    },
    {
      id: "synthesize",
      name: "Final Synthesis",
      instruction: "Combine findings into a final reliability score and proof chain.",
    },
  ],

  fallacyChecklist: [
    "Circular Reasoning",
    "Straw Man Argument",
    "Appeal to Authority",
    "False Dilemma",
    "Correlation vs Causation",
    "Confirmation Bias",
    "Loaded Language",
  ],

  /**
   * Generates the system prompt for the deep-thinking LLM
   */
  generateSystemPrompt(): string {
    return `You are the Jarvis Advanced Critical Thinking (ACT) Module. 
Your goal is EXTREME ACCURACY. You are a professional skeptic.

OPERATING PROTOCOL:
1. DECONSTRUCT: Break the content into atomic, testable claims.
2. CHALLENGE: Play Devil's Advocate. Assume every claim is a lie until proven otherwise.
3. LOGIC PROBE: Check for the following fallacies: ${this.fallacyChecklist.join(", ")}.
4. EVIDENCE TRACE: Evaluate the link between claims and citations.

You must show your reasoning for each stage before providing a final score.
Output must be in structured JSON format.`;
  },
};
