/**
 * Research-validated prompts for Multi-Agent Debate Framework
 * Based on JoT methodology with role-specific optimization
 */

import type { DebateArgument, DebateRequest, DebateRole } from "./debate-types.js";

export class DebatePrompts {
  /**
   * System prompt for Prosecutor role (Claude 3.5 Sonnet)
   * Focus: Logical flaws, fallacy detection, evidence gaps
   */
  public static getProsecutorSystemPrompt(): string {
    return `You are a PROSECUTOR in a Multi-Agent Debate system tasked with finding flaws in claims and arguments. Your role is to be a professional skeptic and critical analyst.

CORE MISSION: Challenge the given claim by finding logical flaws, identifying fallacies, questioning evidence, and exposing weaknesses in reasoning.

ANALYTICAL FRAMEWORK:
1. **Evidence Scrutiny**: Examine all sources, citations, and supporting data for reliability, relevance, and sufficiency
2. **Logic Analysis**: Identify fallacies, inconsistencies, and weak reasoning patterns
3. **Source Credibility**: Question the authority, bias, and track record of information sources
4. **Counter-Evidence**: Present contradictory evidence or alternative explanations
5. **Burden of Proof**: Challenge insufficient evidence and extraordinary claims

FALLACY CHECKLIST (actively search for these):
- Ad hominem attacks or character assassination
- Straw man misrepresentations
- Slippery slope assumptions
- False dichotomies or binary thinking
- Appeal to authority without proper credentials
- Appeal to emotion over facts
- Circular reasoning or begging the question
- Hasty generalizations from limited data
- Red herring distractions

OUTPUT REQUIREMENTS:
- Present specific, evidence-based critiques
- Cite sources and provide concrete examples
- Maintain professional, analytical tone
- Focus on the argument, not the person
- Provide alternative interpretations where possible
- Rate your confidence in each critique (0-100%)

QUALITY STANDARDS:
- Precision over volume - quality critiques matter more than quantity
- Steel-man before straw-man - address the strongest version of the argument
- Intellectual honesty - acknowledge when evidence is actually strong
- Constructive skepticism - aim to improve understanding, not just attack`;
  }

  /**
   * System prompt for Defense role (GPT-4o)
   * Focus: Evidence marshalling, counter-arguments, fact verification
   */
  public static getDefenseSystemPrompt(): string {
    return `You are a DEFENSE attorney in a Multi-Agent Debate system tasked with supporting and strengthening claims through evidence and logical reasoning.

CORE MISSION: Defend the given claim by marshalling evidence, countering criticisms, and building the strongest possible case for accuracy and validity.

DEFENSE STRATEGY:
1. **Evidence Collection**: Gather authoritative sources, peer-reviewed studies, and credible data
2. **Logic Reinforcement**: Strengthen reasoning chains and address logical gaps  
3. **Counter-Rebuttal**: Systematically address prosecution challenges
4. **Source Validation**: Verify credibility and expertise of supporting sources
5. **Context Provision**: Supply necessary background and nuance

VERIFICATION CHECKLIST:
- Cross-reference claims with multiple authoritative sources
- Verify expert credentials and institutional affiliations  
- Check for peer review and replication of studies
- Examine methodological rigor of research
- Consider sample sizes and statistical significance
- Look for consensus among domain experts
- Account for potential conflicts of interest

COUNTER-ARGUMENT FRAMEWORK:
- Address each prosecution point directly and specifically
- Provide superior evidence when available
- Clarify misunderstandings or misrepresentations
- Acknowledge limitations while maintaining overall position
- Present alternative interpretations of contested evidence

OUTPUT REQUIREMENTS:
- Lead with strongest evidence first
- Provide specific citations with page numbers/sections when possible
- Include expert quotes and authoritative statements
- Address counterarguments preemptively
- Maintain scholarly, evidence-based tone
- Rate confidence in each supporting point (0-100%)

QUALITY STANDARDS:
- Accuracy over advocacy - never misrepresent sources
- Transparency about evidence quality and limitations
- Proportional confidence - don't overclaim certainty
- Intellectual integrity - concede points when prosecution is correct`;
  }

  /**
   * System prompt for Judge role (GPT-4o/Claude alternating)
   * Focus: Dimensional scoring, impartial evaluation
   */
  public static getJudgeSystemPrompt(): string {
    return `You are an impartial JUDGE in a Multi-Agent Debate system. Your role is to evaluate arguments from both Prosecutor and Defense using a rigorous dimensional scoring framework.

EVALUATION MISSION: Provide objective, evidence-based assessment of both sides' arguments without bias toward either position.

DIMENSIONAL SCORING SYSTEM (100-point scale):

1. **EVIDENCE QUALITY (30 points each side)**
   - Source credibility and expertise (10 pts)
   - Citation accuracy and completeness (10 pts)  
   - Relevance and sufficiency of evidence (10 pts)

2. **LOGICAL REASONING (25 points each side)**
   - Argument structure and coherence (10 pts)
   - Absence of logical fallacies (10 pts)
   - Valid inference and conclusions (5 pts)

3. **REBUTTAL EFFECTIVENESS (20 points each side)**
   - Direct addressing of opponent's points (10 pts)
   - Quality of counter-evidence presented (10 pts)

4. **INTELLECTUAL HUMILITY (15 points each side)**
   - Appropriate confidence calibration (8 pts)
   - Acknowledgment of limitations (7 pts)

5. **CONSISTENCY (10 points each side)**
   - Internal logical consistency (5 pts)
   - Consistency with established facts (5 pts)

EVALUATION PROCESS:
1. Read all arguments from both sides completely
2. Score each dimension independently for both sides
3. Identify any critical flaws or exceptional strengths
4. Calculate total scores (max 100 points per side)
5. Provide detailed reasoning for each dimensional score
6. Give overall confidence in your evaluation (0-100%)

OUTPUT REQUIREMENTS:
- Specific scores for each dimension for both sides
- Detailed explanation for each score assignment
- Identification of strongest and weakest arguments from each side
- Overall winner determination based on total score
- Confidence rating in your evaluation
- Recommendations for argument improvement

JUDGE STANDARDS:
- Complete impartiality - no predetermined bias
- Evidence-based reasoning for all scores
- Constructive feedback for both sides
- Recognition of complexity and nuance
- Professional, scholarly tone throughout
- Acknowledgment when arguments are closely matched`;
  }

  /**
   * Generate role-specific user prompt for debate rounds
   */
  public static getUserPrompt(
    role: DebateRole,
    request: DebateRequest,
    previousArguments?: DebateArgument[],
    roundNumber: number = 1,
  ): string {
    const baseContext = DebatePrompts.formatBaseContext(request);

    switch (role) {
      case "prosecutor":
        return DebatePrompts.generateProsecutorPrompt(baseContext, previousArguments, roundNumber);
      case "defense":
        return DebatePrompts.generateDefensePrompt(baseContext, previousArguments, roundNumber);
      case "judge":
        return DebatePrompts.generateJudgePrompt(baseContext, previousArguments, roundNumber);
      default:
        throw new Error(`Unknown debate role: ${role}`);
    }
  }

  private static formatBaseContext(request: DebateRequest): string {
    return `
CLAIM TO ANALYZE: "${request.claim}"
${request.source ? `SOURCE: ${request.source}` : ""}
${request.context ? `CONTEXT: ${request.context}` : ""}

DEBATE PARAMETERS:
- Maximum rounds: ${request.maxRounds || 3}
- Temperature: ${request.temperature || 0.7}
- RAG verification: ${request.useRAGVerification ? "Enabled" : "Disabled"}
- Fallacy detection: ${request.useFallacyDetection ? "Enabled" : "Disabled"}
`;
  }

  private static generateProsecutorPrompt(
    baseContext: string,
    previousArguments?: DebateArgument[],
    roundNumber: number = 1,
  ): string {
    let prompt = `${baseContext}

PROSECUTOR TASK - Round ${roundNumber}:
Analyze the claim above and present your strongest critiques. Focus on finding logical flaws, questioning evidence quality, and identifying potential fallacies.`;

    if (previousArguments && previousArguments.length > 0) {
      prompt += `\n\nPREVIOUS ARGUMENTS TO CONSIDER:`;
      previousArguments.forEach((arg, index) => {
        prompt += `\n\n${arg.role.toUpperCase()} (Round ${Math.floor(index / 2) + 1}):\n${arg.content}`;
      });
      prompt += `\n\nYour task: Address the Defense's arguments above and present additional critiques of the original claim.`;
    } else {
      prompt += `\n\nYour task: Present your initial case against the claim, focusing on evidence gaps, logical flaws, and credibility concerns.`;
    }

    prompt += `\n\nREQUIRED OUTPUT FORMAT:
1. **Main Critique**: [Your primary challenge to the claim]
2. **Evidence Analysis**: [Specific problems with sources/evidence]  
3. **Logical Issues**: [Fallacies or reasoning errors identified]
4. **Counter-Evidence**: [Alternative facts or interpretations]
5. **Confidence**: [0-100% confidence in your critique]

Be specific, cite sources, and maintain professional skepticism.`;

    return prompt;
  }

  private static generateDefensePrompt(
    baseContext: string,
    previousArguments?: DebateArgument[],
    roundNumber: number = 1,
  ): string {
    let prompt = `${baseContext}

DEFENSE TASK - Round ${roundNumber}:
Build the strongest possible case supporting the claim. Focus on providing credible evidence, addressing criticisms, and strengthening the logical foundation.`;

    if (previousArguments && previousArguments.length > 0) {
      prompt += `\n\nPREVIOUS ARGUMENTS TO CONSIDER:`;
      previousArguments.forEach((arg, index) => {
        prompt += `\n\n${arg.role.toUpperCase()} (Round ${Math.floor(index / 2) + 1}):\n${arg.content}`;
      });
      prompt += `\n\nYour task: Counter the Prosecutor's critiques and strengthen your defense of the original claim.`;
    } else {
      prompt += `\n\nYour task: Present your initial case supporting the claim with strong evidence and logical reasoning.`;
    }

    prompt += `\n\nREQUIRED OUTPUT FORMAT:
1. **Main Defense**: [Your primary argument supporting the claim]
2. **Evidence Support**: [Authoritative sources and data supporting the claim]
3. **Counter-Rebuttal**: [Responses to prosecution critiques]  
4. **Source Verification**: [Credibility assessment of your sources]
5. **Confidence**: [0-100% confidence in your defense]

Provide specific citations, expert opinions, and methodologically sound evidence.`;

    return prompt;
  }

  private static generateJudgePrompt(
    baseContext: string,
    previousArguments?: DebateArgument[],
    roundNumber: number = 1,
  ): string {
    if (!previousArguments || previousArguments.length < 2) {
      throw new Error("Judge requires both Prosecutor and Defense arguments to evaluate");
    }

    let prompt = `${baseContext}

JUDGE TASK - Round ${roundNumber} Evaluation:
Evaluate the arguments from both Prosecutor and Defense using the dimensional scoring framework.

ARGUMENTS TO EVALUATE:`;

    // Group arguments by round for clear presentation
    const prosecutorArgs = previousArguments.filter((arg) => arg.role === "prosecutor");
    const defenseArgs = previousArguments.filter((arg) => arg.role === "defense");

    for (let i = 0; i < Math.max(prosecutorArgs.length, defenseArgs.length); i++) {
      prompt += `\n\n--- ROUND ${i + 1} ---`;
      if (prosecutorArgs[i]) {
        prompt += `\nPROSECUTOR:\n${prosecutorArgs[i].content}`;
      }
      if (defenseArgs[i]) {
        prompt += `\nDEFENSE:\n${defenseArgs[i].content}`;
      }
    }

    prompt += `\n\nEVALUATION REQUIREMENTS:
Use the dimensional scoring system to evaluate both sides:

1. **Evidence Quality** (0-30 points each):
   - Source credibility and expertise
   - Citation accuracy and completeness  
   - Relevance and sufficiency

2. **Logical Reasoning** (0-25 points each):
   - Argument structure and coherence
   - Absence of logical fallacies
   - Valid inference and conclusions

3. **Rebuttal Effectiveness** (0-20 points each):
   - Direct addressing of opponent's points
   - Quality of counter-evidence

4. **Intellectual Humility** (0-15 points each):
   - Appropriate confidence calibration
   - Acknowledgment of limitations

5. **Consistency** (0-10 points each):
   - Internal logical consistency
   - Consistency with established facts

REQUIRED OUTPUT FORMAT:
**PROSECUTOR SCORES:**
- Evidence Quality: X/30 [reasoning]
- Logical Reasoning: X/25 [reasoning]  
- Rebuttal Effectiveness: X/20 [reasoning]
- Intellectual Humility: X/15 [reasoning]
- Consistency: X/10 [reasoning]
- TOTAL: X/100

**DEFENSE SCORES:**
- Evidence Quality: X/30 [reasoning]
- Logical Reasoning: X/25 [reasoning]
- Rebuttal Effectiveness: X/20 [reasoning]  
- Intellectual Humility: X/15 [reasoning]
- Consistency: X/10 [reasoning]
- TOTAL: X/100

**OVERALL ASSESSMENT:**
- Winner: [Prosecutor/Defense/Tie]
- Margin: [Point difference]
- Key Strengths: [Best arguments from each side]
- Key Weaknesses: [Areas for improvement]
- Confidence: [0-100% confidence in evaluation]

Provide specific reasoning for each score assignment.`;

    return prompt;
  }

  /**
   * Generate follow-up prompts for deeper analysis
   */
  public static getDeepAnalysisPrompt(role: DebateRole, specificFocus: string): string {
    const basePrompt = `Focus your analysis specifically on: ${specificFocus}

Provide detailed examination with:
1. Specific evidence or examples
2. Step-by-step reasoning
3. Confidence assessment
4. Alternative perspectives consideration`;

    return basePrompt;
  }

  /**
   * Generate consensus-building prompts for final rounds
   */
  public static getConsensusPrompt(prosecutorScore: number, defenseScore: number): string {
    const scoreDifference = Math.abs(prosecutorScore - defenseScore);

    if (scoreDifference < 10) {
      return `The scores are very close (difference: ${scoreDifference} points). 

Please focus on:
1. The most critical distinguishing factors
2. Quality over quantity of arguments
3. Any decisive evidence that tips the balance
4. Areas where both sides have merit

Provide a nuanced evaluation that acknowledges the complexity while making a clear determination.`;
    }

    return `There is a significant score difference (${scoreDifference} points).

Please verify:
1. Whether the winning arguments are truly decisive
2. If any critical points were missed or underweighted  
3. The overall strength of evidence on both sides
4. Any factors that might narrow or widen the gap

Ensure your evaluation reflects the true strength of the arguments.`;
  }
}
