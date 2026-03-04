/**
 * Git-based code recovery service
 * Restores agent source files from Git and triggers backend restart
 */

import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { Logger } from "winston";
import { AGENT_SPAWN_CONFIG } from "../config/agents.config";

const execAsync = promisify(exec);

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  agentName: string;
  sourceFile?: string;
  commitHash?: string;
  wasModified: boolean;
  message: string;
  error?: string;
}

/**
 * Result of a full restore and restart operation
 */
export interface RestoreAndRestartResult extends RestoreResult {
  buildSuccess?: boolean;
  restartTriggered: boolean;
}

/**
 * Git-based code recovery service
 */
export class GitRestoreService {
  private readonly logger: Logger;
  private readonly projectRoot: string;
  private gitRoot: string | null = null;
  private projectRelativePath: string | null = null;

  constructor(logger: Logger, projectRoot?: string) {
    this.logger = logger;
    // Default to current working directory if not specified
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Get the git repository root directory
   */
  private async getGitRoot(): Promise<string> {
    if (this.gitRoot) {
      return this.gitRoot;
    }

    try {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: this.projectRoot,
      });
      this.gitRoot = stdout.trim().replace(/\//g, path.sep);

      // Calculate the relative path from git root to project root
      this.projectRelativePath = path.relative(this.gitRoot, this.projectRoot);

      this.logger.info(
        `Git root: ${this.gitRoot}, Project relative path: ${this.projectRelativePath}`,
      );

      return this.gitRoot;
    } catch (error) {
      this.logger.error("Failed to get git root:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the full path relative to git root for a file
   */
  private async getGitRelativePath(filePath: string): Promise<string> {
    await this.getGitRoot();

    if (this.projectRelativePath) {
      // Combine project relative path with file path
      return path.join(this.projectRelativePath, filePath).replace(/\\/g, "/");
    }

    return filePath.replace(/\\/g, "/");
  }

  /**
   * Get the source file path for an agent from its spawn config
   */
  getAgentSourceFile(agentName: string): string | undefined {
    const config = AGENT_SPAWN_CONFIG[agentName];
    return config?.sourceFile;
  }

  /**
   * Check if a file has been modified from the last Git commit
   */
  async isFileModified(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`File does not exist: ${fullPath}`);
        return false;
      }

      const gitRoot = await this.getGitRoot();
      const gitRelativePath = await this.getGitRelativePath(filePath);

      // Check git status for this file (from git root)
      const { stdout } = await execAsync(`git status --porcelain "${gitRelativePath}"`, {
        cwd: gitRoot,
      });

      // If there's output, the file is modified (M = modified, ?? = untracked, etc.)
      const trimmed = stdout.trim();
      // Only consider it "modified" if it's tracked and changed (M, A, D, R, C, U)
      // Untracked files (??) are not considered "modified from HEAD"
      return trimmed.length > 0 && !trimmed.startsWith("??");
    } catch (error) {
      this.logger.error(`Failed to check git status for ${filePath}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get the current HEAD commit hash
   */
  async getHeadCommit(): Promise<string> {
    try {
      const gitRoot = await this.getGitRoot();
      const { stdout } = await execAsync("git rev-parse HEAD", {
        cwd: gitRoot,
      });
      return stdout.trim();
    } catch (error) {
      this.logger.error("Failed to get HEAD commit:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Restore an agent's source file from Git HEAD
   */
  async restoreAgent(agentName: string): Promise<RestoreResult> {
    const sourceFile = this.getAgentSourceFile(agentName);

    if (!sourceFile) {
      return {
        success: false,
        agentName,
        wasModified: false,
        message: `No source file configured for agent: ${agentName}`,
        error: "No source file in spawn config",
      };
    }

    try {
      // Check if file is modified
      const wasModified = await this.isFileModified(sourceFile);

      if (!wasModified) {
        return {
          success: true,
          agentName,
          sourceFile,
          wasModified: false,
          message: `File ${sourceFile} is already clean (no changes from HEAD)`,
        };
      }

      // Get current commit hash for logging
      const commitHash = await this.getHeadCommit();
      const gitRoot = await this.getGitRoot();
      const gitRelativePath = await this.getGitRelativePath(sourceFile);

      this.logger.info(`Restoring ${gitRelativePath} from commit ${commitHash.substring(0, 8)}...`);

      // Restore the file from HEAD (use git-relative path from git root)
      await execAsync(`git checkout HEAD -- "${gitRelativePath}"`, {
        cwd: gitRoot,
      });

      this.logger.info(`Successfully restored ${sourceFile}`);

      return {
        success: true,
        agentName,
        sourceFile,
        commitHash,
        wasModified: true,
        message: `Restored ${sourceFile} from commit ${commitHash.substring(0, 8)}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to restore agent ${agentName}:`, { error: errorMessage });

      return {
        success: false,
        agentName,
        sourceFile,
        wasModified: false,
        message: `Failed to restore ${sourceFile}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Build the TypeScript project
   */
  async buildProject(): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info("Building TypeScript project...");

      await execAsync("npm run build", {
        cwd: this.projectRoot,
        timeout: 120000, // 2 minute timeout for build
      });

      this.logger.info("Build completed successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("Build failed:", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Restart the backend via PM2
   */
  async restartBackend(): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.warn("Restarting backend via PM2...");

      // Try to restart jarvis-dev first, fall back to jarvis-backend
      try {
        await execAsync("pm2 restart jarvis-dev", {
          cwd: this.projectRoot,
          timeout: 30000,
        });
        this.logger.info("PM2 restart (jarvis-dev) triggered");
        return { success: true };
      } catch {
        // Try jarvis-backend
        await execAsync("pm2 restart jarvis-backend", {
          cwd: this.projectRoot,
          timeout: 30000,
        });
        this.logger.info("PM2 restart (jarvis-backend) triggered");
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("PM2 restart failed:", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Full restore and restart operation:
   * 1. Restore agent source file from Git
   * 2. Rebuild TypeScript
   * 3. Restart backend via PM2
   */
  async restoreAndRestart(agentName: string): Promise<RestoreAndRestartResult> {
    // Step 1: Restore the file
    const restoreResult = await this.restoreAgent(agentName);

    if (!restoreResult.success) {
      return {
        ...restoreResult,
        restartTriggered: false,
      };
    }

    // If file wasn't modified, no need to rebuild/restart
    if (!restoreResult.wasModified) {
      return {
        ...restoreResult,
        buildSuccess: true,
        restartTriggered: false,
        message: restoreResult.message + " - No rebuild needed",
      };
    }

    // Step 2: Build the project
    const buildResult = await this.buildProject();

    if (!buildResult.success) {
      return {
        ...restoreResult,
        buildSuccess: false,
        restartTriggered: false,
        message: `File restored but build failed: ${buildResult.error}`,
        error: buildResult.error,
      };
    }

    // Step 3: Restart the backend
    const restartResult = await this.restartBackend();

    return {
      ...restoreResult,
      buildSuccess: true,
      restartTriggered: restartResult.success,
      message: restartResult.success
        ? `${restoreResult.message} - Build successful - Backend restart triggered`
        : `${restoreResult.message} - Build successful - Backend restart failed: ${restartResult.error}`,
      error: restartResult.error,
    };
  }

  /**
   * Get list of all agents with their source files
   */
  getAllAgentSourceFiles(): Array<{ agentName: string; sourceFile: string | undefined }> {
    return Object.keys(AGENT_SPAWN_CONFIG).map((agentName) => ({
      agentName,
      sourceFile: AGENT_SPAWN_CONFIG[agentName].sourceFile,
    }));
  }

  /**
   * Check which agent files have been modified
   */
  async getModifiedAgents(): Promise<Array<{ agentName: string; sourceFile: string }>> {
    const modified: Array<{ agentName: string; sourceFile: string }> = [];

    for (const agentName of Object.keys(AGENT_SPAWN_CONFIG)) {
      const sourceFile = this.getAgentSourceFile(agentName);
      if (sourceFile && (await this.isFileModified(sourceFile))) {
        modified.push({ agentName, sourceFile });
      }
    }

    return modified;
  }
}

// Singleton instance
let gitRestoreService: GitRestoreService | null = null;

/**
 * Initialize the Git restore service
 */
export function initializeGitRestoreService(
  logger: Logger,
  projectRoot?: string,
): GitRestoreService {
  gitRestoreService = new GitRestoreService(logger, projectRoot);
  return gitRestoreService;
}

/**
 * Get the Git restore service instance
 */
export function getGitRestoreService(): GitRestoreService {
  if (!gitRestoreService) {
    throw new Error("GitRestoreService not initialized. Call initializeGitRestoreService first.");
  }
  return gitRestoreService;
}
