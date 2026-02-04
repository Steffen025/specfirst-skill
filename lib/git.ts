/**
 * Git Automation Module - SpecFirst 3.0
 * 
 * Provides git operations for phase completion tracking.
 * Uses git commits as state machine markers (ADR-003).
 * 
 * @module lib/git
 * @version 3.0.0
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type Phase = "propose" | "specify" | "plan" | "implement" | "release";

export interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface CommitInfo {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
}

/**
 * Executes a git command in the specified working directory.
 * 
 * @param command - Git command to execute (without 'git' prefix)
 * @param cwd - Working directory (defaults to current directory)
 * @returns GitResult with stdout/stderr
 */
async function runGit(command: string, cwd?: string): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execAsync(`git ${command}`, {
      cwd: cwd || process.cwd(),
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      error: error as Error,
    };
  }
}

/**
 * Checks if the current directory is a git repository.
 * 
 * @param cwd - Working directory to check
 * @returns true if git repository
 */
export async function isGitRepository(cwd?: string): Promise<boolean> {
  const result = await runGit("rev-parse --git-dir", cwd);
  return result.success;
}

/**
 * Gets the current branch name.
 * 
 * @param cwd - Working directory
 * @returns Branch name or undefined if not in a git repo
 */
export async function getCurrentBranch(cwd?: string): Promise<string | undefined> {
  const result = await runGit("branch --show-current", cwd);
  return result.success ? result.stdout : undefined;
}

/**
 * Checks if there are uncommitted changes.
 * 
 * @param cwd - Working directory
 * @returns true if there are uncommitted changes
 */
export async function hasUncommittedChanges(cwd?: string): Promise<boolean> {
  const result = await runGit("status --porcelain", cwd);
  return result.success && result.stdout.length > 0;
}

/**
 * Creates a SpecFirst phase completion commit.
 * 
 * Commit message format:
 * ```
 * SpecFirst: {phase} phase complete for {feature-name}
 * 
 * Artifact: specs/{artifact-name}
 * Status: complete
 * Timestamp: {ISO-8601}
 * ```
 * 
 * @param phase - Phase that completed
 * @param featureName - Name of the feature
 * @param artifactPath - Path to the artifact file
 * @param cwd - Working directory
 * @returns GitResult
 */
export async function createPhaseCommit(
  phase: Phase,
  featureName: string,
  artifactPath: string,
  cwd?: string
): Promise<GitResult> {
  const timestamp = new Date().toISOString();
  
  // Build commit message
  const title = `SpecFirst: ${phase} phase complete for ${featureName}`;
  const body = [
    "",
    `Artifact: ${artifactPath}`,
    `Status: complete`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
  
  const fullMessage = `${title}${body}`;
  
  // Stage the artifact file
  const addResult = await runGit(`add "${artifactPath}"`, cwd);
  if (!addResult.success) {
    return addResult;
  }
  
  // Create commit with message
  const escapedMessage = fullMessage.replace(/"/g, '\\"');
  return runGit(`commit -m "${escapedMessage}"`, cwd);
}

/**
 * Checks if a specific phase has been completed for a feature.
 * Uses git log grep to find phase completion commits.
 * 
 * @param phase - Phase to check
 * @param featureName - Feature name
 * @param cwd - Working directory
 * @returns true if phase commit exists
 */
export async function isPhaseComplete(
  phase: Phase,
  featureName: string,
  cwd?: string
): Promise<boolean> {
  const searchPattern = `SpecFirst: ${phase} phase complete for ${featureName}`;
  const result = await runGit(`log --grep="${searchPattern}" --format=%H -1`, cwd);
  return result.success && result.stdout.length > 0;
}

/**
 * Gets the commit info for a phase completion.
 * 
 * @param phase - Phase to look up
 * @param featureName - Feature name
 * @param cwd - Working directory
 * @returns CommitInfo or undefined if not found
 */
export async function getPhaseCommit(
  phase: Phase,
  featureName: string,
  cwd?: string
): Promise<CommitInfo | undefined> {
  const searchPattern = `SpecFirst: ${phase} phase complete for ${featureName}`;
  const format = "%H|%s|%aI|%an";
  const result = await runGit(`log --grep="${searchPattern}" --format="${format}" -1`, cwd);
  
  if (!result.success || !result.stdout) {
    return undefined;
  }
  
  const [hash, message, timestamp, author] = result.stdout.split("|");
  return { hash, message, timestamp, author };
}

/**
 * Gets all phase commits for a feature in chronological order.
 * 
 * @param featureName - Feature name
 * @param cwd - Working directory
 * @returns Array of CommitInfo objects
 */
export async function getFeatureCommits(
  featureName: string,
  cwd?: string
): Promise<CommitInfo[]> {
  const searchPattern = `SpecFirst:.*complete for ${featureName}`;
  const format = "%H|%s|%aI|%an";
  const result = await runGit(`log --grep="${searchPattern}" -E --format="${format}" --reverse`, cwd);
  
  if (!result.success || !result.stdout) {
    return [];
  }
  
  return result.stdout.split("\n").map((line) => {
    const [hash, message, timestamp, author] = line.split("|");
    return { hash, message, timestamp, author };
  });
}

/**
 * Stages a file for commit.
 * 
 * @param filePath - Path to file to stage
 * @param cwd - Working directory
 * @returns GitResult
 */
export async function stageFile(filePath: string, cwd?: string): Promise<GitResult> {
  return runGit(`add "${filePath}"`, cwd);
}

/**
 * Gets the list of staged files.
 * 
 * @param cwd - Working directory
 * @returns Array of staged file paths
 */
export async function getStagedFiles(cwd?: string): Promise<string[]> {
  const result = await runGit("diff --cached --name-only", cwd);
  if (!result.success || !result.stdout) {
    return [];
  }
  return result.stdout.split("\n").filter(Boolean);
}

// Export for testing
export const __testing = {
  runGit,
  isGitRepository,
  getCurrentBranch,
};
