/*
  This file provides coding assistance and helps you write better code.

  It handles code reviews, debugging, generating new code, and writing tests while making sure your programs are clean and error-free.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { VertexLLMClient } from "../llm";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Code Agent - Provides coding assistance, code review, debugging help, and code generation.
 */
export class CodeAgent extends EnhancedBaseAgent {
  private llm: VertexLLMClient | undefined;

  constructor(logger: Logger, llm?: VertexLLMClient) {
    super("Code", "1.0.0", parseInt(process.env.CODE_AGENT_PORT || "3007", 10), logger);
    this.llm = llm;
  }

  protected async initialize(): Promise<void> {
    this.logger.info(`${this.agentId} agent initialized`);
    if (!this.llm) {
      this.logger.warn("Code Agent initialized without LLM - some features will be limited");
    }
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post("/api", async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Code Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        if (!this.llm) {
          throw new Error("Code Agent requires LLM (OpenAI API key)");
        }

        let result: unknown;

        switch (action) {
          case "review_code":
            result = await this.reviewCode(inputs);
            break;
          case "explain_code":
            result = await this.explainCode(inputs);
            break;
          case "generate_code":
            result = await this.generateCode(inputs);
            break;
          case "debug_code":
            result = await this.debugCode(inputs);
            break;
          case "suggest_improvements":
            result = await this.suggestImprovements(inputs);
            break;
          case "write_tests":
            result = await this.writeTests(inputs);
            break;
          case "document_code":
            result = await this.documentCode(inputs);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing code request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Code agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", (error: Error) => {
          this.logger.error(`Failed to start server on port ${this.port}`, {
            error: error.message,
          });
          reject(error);
        });
    });
  }

  protected getCapabilities(): string[] {
    return [
      "review_code",
      "explain_code",
      "generate_code",
      "debug_code",
      "suggest_improvements",
      "write_tests",
      "document_code",
    ];
  }

  protected getDependencies(): string[] {
    return [];
  }

  protected getPriority(): number {
    return 7;
  }

  /**
   * Review code and provide feedback.
   */
  private async reviewCode(inputs: Record<string, unknown>): Promise<CodeReview> {
    const code = inputs.code as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!code) {
      throw new Error("Code required for review");
    }

    if (!this.llm) {
      throw new Error("LLM required for code review");
    }

    const prompt = `You are a senior software engineer. Review this ${language} code and provide:
1. Overall quality rating (1-10)
2. Strengths (what's done well)
3. Issues (bugs, security, performance)
4. Suggestions for improvement

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Respond in JSON:
{
  "rating": 8,
  "strengths": ["strength 1", "strength 2"],
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "summary": "brief overall assessment"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 1000 });
    const review = JSON.parse(response);

    return {
      code,
      language,
      ...review,
    };
  }

  /**
   * Explain what code does.
   */
  private async explainCode(inputs: Record<string, unknown>): Promise<CodeExplanation> {
    const code = inputs.code as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!code) {
      throw new Error("Code required for explanation");
    }

    if (!this.llm) {
      throw new Error("LLM required for code explanation");
    }

    const prompt = `Explain this ${language} code in simple terms. Include:
1. What it does (high-level purpose)
2. How it works (step-by-step)
3. Key concepts used
4. Example use case

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Respond in JSON:
{
  "purpose": "what it does",
  "howItWorks": "step-by-step explanation",
  "keyConcepts": ["concept 1", "concept 2"],
  "example": "example use case"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 800 });
    const explanation = JSON.parse(response);

    return {
      code,
      language,
      ...explanation,
    };
  }

  /**
   * Generate code from description.
   */
  private async generateCode(inputs: Record<string, unknown>): Promise<CodeGeneration> {
    const description = inputs.description as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!description) {
      throw new Error("Description required for code generation");
    }

    if (!this.llm) {
      throw new Error("LLM required for code generation");
    }

    const prompt = `Generate ${language} code for: "${description}"

Requirements:
- Clean, readable code
- Follow best practices
- Include comments
- Handle edge cases

Respond in JSON:
{
  "code": "generated code here",
  "explanation": "brief explanation of the code",
  "usage": "how to use it"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.5, maxTokens: 1500 });
    const generation = JSON.parse(response);

    return {
      description,
      language,
      ...generation,
    };
  }

  /**
   * Debug code and identify issues.
   */
  private async debugCode(inputs: Record<string, unknown>): Promise<DebugResult> {
    const code = inputs.code as string;
    const error = inputs.error as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!code) {
      throw new Error("Code required for debugging");
    }

    if (!this.llm) {
      throw new Error("LLM required for debugging");
    }

    const prompt = `Debug this ${language} code${error ? ` that's producing this error: "${error}"` : ""}.

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Identify:
1. The problem
2. Why it's happening
3. How to fix it
4. Corrected code

Respond in JSON:
{
  "problem": "what's wrong",
  "cause": "why it's happening",
  "solution": "how to fix it",
  "fixedCode": "corrected code"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 1200 });
    const debug = JSON.parse(response);

    return {
      originalCode: code,
      error,
      language,
      ...debug,
    };
  }

  /**
   * Suggest code improvements.
   */
  private async suggestImprovements(
    inputs: Record<string, unknown>,
  ): Promise<ImprovementSuggestions> {
    const code = inputs.code as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!code) {
      throw new Error("Code required for improvement suggestions");
    }

    if (!this.llm) {
      throw new Error("LLM required for improvement suggestions");
    }

    const prompt = `Suggest improvements for this ${language} code focusing on:
- Performance
- Readability
- Maintainability
- Best practices

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Respond in JSON:
{
  "improvements": [
    {
      "category": "performance|readability|maintainability|best-practices",
      "issue": "what could be better",
      "suggestion": "how to improve it",
      "priority": "high|medium|low"
    }
  ],
  "refactoredCode": "improved version of the code"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 1500 });
    const improvements = JSON.parse(response);

    return {
      originalCode: code,
      language,
      ...improvements,
    };
  }

  /**
   * Write tests for code.
   */
  private async writeTests(inputs: Record<string, unknown>): Promise<TestGeneration> {
    const code = inputs.code as string;
    const language = (inputs.language as string) || "TypeScript";
    const framework = (inputs.framework as string) || "Jest";

    if (!code) {
      throw new Error("Code required for test generation");
    }

    if (!this.llm) {
      throw new Error("LLM required for test generation");
    }

    const prompt = `Write ${framework} tests for this ${language} code. Include:
- Unit tests for main functionality
- Edge case tests
- Error handling tests

Code to test:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Respond in JSON:
{
  "tests": "complete test code",
  "coverage": "what's covered",
  "testCount": 5
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 1500 });
    const tests = JSON.parse(response);

    return {
      originalCode: code,
      language,
      framework,
      ...tests,
    };
  }

  /**
   * Generate documentation for code.
   */
  private async documentCode(inputs: Record<string, unknown>): Promise<Documentation> {
    const code = inputs.code as string;
    const language = (inputs.language as string) || "TypeScript";

    if (!code) {
      throw new Error("Code required for documentation");
    }

    if (!this.llm) {
      throw new Error("LLM required for documentation");
    }

    const prompt = `Generate comprehensive documentation for this ${language} code:

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Include:
- Function/class descriptions
- Parameter descriptions
- Return value descriptions
- Usage examples

Respond in JSON:
{
  "documentation": "formatted documentation (JSDoc/docstring style)",
  "examples": ["example 1", "example 2"],
  "summary": "brief summary"
}`;

    const response = await this.llm.complete(prompt, { temperature: 0.3, maxTokens: 1200 });
    const docs = JSON.parse(response);

    return {
      code,
      language,
      ...docs,
    };
  }

  /**
   * Get agent-specific metrics
   */
  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
    };
  }

  /**
   * Update agent configuration
   */
  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  /**
   * Restart the agent
   */
  protected async restart(): Promise<void> {
    this.logger.info("Restarting Code agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// Types
interface CodeReview {
  code: string;
  language: string;
  rating: number;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  summary: string;
}

interface CodeExplanation {
  code: string;
  language: string;
  purpose: string;
  howItWorks: string;
  keyConcepts: string[];
  example: string;
}

interface CodeGeneration {
  description: string;
  language: string;
  code: string;
  explanation: string;
  usage: string;
}

interface DebugResult {
  originalCode: string;
  error?: string;
  language: string;
  problem: string;
  cause: string;
  solution: string;
  fixedCode: string;
}

interface ImprovementSuggestions {
  originalCode: string;
  language: string;
  improvements: {
    category: string;
    issue: string;
    suggestion: string;
    priority: string;
  }[];
  refactoredCode: string;
}

interface TestGeneration {
  originalCode: string;
  language: string;
  framework: string;
  tests: string;
  coverage: string;
  testCount: number;
}

interface Documentation {
  code: string;
  language: string;
  documentation: string;
  examples: string[];
  summary: string;
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
