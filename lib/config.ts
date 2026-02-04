/**
 * Environment Configuration Module - SpecFirst 3.0
 * 
 * Provides environment-based configuration with zero hardcoded paths.
 * All paths are derived from platform detection.
 * 
 * @module lib/config
 * @version 3.0.0
 */

import { getPlatformInfo, getFeatureDir, getProjectDir, getSpecsDir, type PlatformInfo } from "./platform";

export interface SpecFirstConfig {
  // Platform info
  platform: PlatformInfo;
  
  // SpecFirst skill paths
  skillDir: string;
  templatesDir: string;
  workflowsDir: string;
  
  // Feature development paths (dynamic per feature)
  getFeaturePaths: (featureName: string) => FeaturePaths;
  
  // Linear integration
  linearApiToken: string | undefined;
  linearTeamId: string | undefined;
  linearEnabled: boolean;
  
  // Git configuration
  gitAutoCommit: boolean;
  gitBranch: string | undefined;
  
  // Validation settings
  iscWordCount: number;
  artifactMaxSizeKb: number;
  gateTimeoutMs: number;
}

export interface FeaturePaths {
  featureDir: string;
  specsDir: string;
  proposalPath: string;
  specPath: string;
  planPath: string;
  tasksPath: string;
  constitutionPath: string;
}

/**
 * Creates feature paths for a given feature name.
 * All paths are derived from platform detection - zero hardcoded values.
 */
function createFeaturePaths(featureName: string): FeaturePaths {
  const featureDir = getFeatureDir(featureName);
  const specsDir = getSpecsDir(featureName);
  const projectDir = getProjectDir(featureName);
  
  return {
    featureDir,
    specsDir,
    proposalPath: `${specsDir}/proposal.md`,
    specPath: `${specsDir}/spec.md`,
    planPath: `${specsDir}/plan.md`,
    tasksPath: `${specsDir}/tasks.md`,
    constitutionPath: `${projectDir}/CONSTITUTION.md`,
  };
}

/**
 * Gets the complete SpecFirst configuration.
 * 
 * Configuration sources (priority order):
 * 1. Environment variables
 * 2. Platform defaults
 */
export function getConfig(): SpecFirstConfig {
  const platform = getPlatformInfo();
  
  return {
    platform,
    
    // SpecFirst skill paths
    skillDir: `${platform.skillsDir}/SpecFirst`,
    templatesDir: `${platform.skillsDir}/SpecFirst/templates`,
    workflowsDir: `${platform.skillsDir}/SpecFirst/Workflows`,
    
    // Feature paths factory
    getFeaturePaths: createFeaturePaths,
    
    // Linear integration
    linearApiToken: process.env.LINEAR_API_TOKEN,
    linearTeamId: process.env.LINEAR_TEAM_ID,
    linearEnabled: Boolean(process.env.LINEAR_API_TOKEN),
    
    // Git configuration
    gitAutoCommit: process.env.SPECFIRST_AUTO_COMMIT !== "false",
    gitBranch: process.env.SPECFIRST_BRANCH,
    
    // Validation settings
    iscWordCount: 8,  // Exactly 8 words per criterion
    artifactMaxSizeKb: parseInt(process.env.SPECFIRST_MAX_ARTIFACT_KB || "50", 10),
    gateTimeoutMs: parseInt(process.env.SPECFIRST_GATE_TIMEOUT_MS || "5000", 10),
  };
}

/**
 * Validates that required environment variables are set.
 * 
 * @returns Object with validation result and missing variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Platform must be detectable (not strictly required as env var, but platform detection must work)
  const platform = getPlatformInfo();
  if (platform.platform === "unknown") {
    missing.push("Platform detection (OPENCODE_DIR or PAI_DIR or ~/.opencode or ~/.claude)");
  }
  
  // Linear is optional but logged if missing
  if (!process.env.LINEAR_API_TOKEN) {
    console.warn("LINEAR_API_TOKEN not set - Linear integration disabled");
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Gets artifact path for a specific artifact type in a feature.
 * 
 * @param featureName - Feature name
 * @param artifactType - Type of artifact (proposal, spec, plan, tasks, constitution)
 * @returns Absolute path to artifact
 */
export function getArtifactPath(featureName: string, artifactType: "proposal" | "spec" | "plan" | "tasks" | "constitution"): string {
  const paths = createFeaturePaths(featureName);
  
  switch (artifactType) {
    case "proposal":
      return paths.proposalPath;
    case "spec":
      return paths.specPath;
    case "plan":
      return paths.planPath;
    case "tasks":
      return paths.tasksPath;
    case "constitution":
      return paths.constitutionPath;
  }
}

/**
 * Ensures all required directories exist for a feature.
 * 
 * @param featureName - Feature name
 */
export async function ensureFeatureDirectories(featureName: string): Promise<void> {
  const fs = await import("fs/promises");
  const paths = createFeaturePaths(featureName);
  
  await fs.mkdir(paths.specsDir, { recursive: true });
  
  // Also ensure project directory exists for constitution
  const projectDir = getProjectDir(featureName);
  await fs.mkdir(projectDir, { recursive: true });
}

// Export for testing
export const __testing = {
  createFeaturePaths,
  getConfig,
};
