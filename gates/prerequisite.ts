/**
 * Prerequisite Gate - SpecFirst 3.0
 * 
 * Validates that all prerequisites exist before any phase execution.
 * This gate runs FIRST and blocks if critical files are missing.
 * 
 * Checks:
 * 1. Constitution file exists (CONSTITUTION.md in project directory)
 * 2. Git repository exists (required for phase tracking)
 * 
 * @module gates/prerequisite
 * @version 3.0.0
 */

import { existsSync } from "fs";
import { getProjectDir } from "../lib/platform";
import { isGitRepository } from "../lib/git";
import { getArtifactPath } from "../lib/config";

export interface GateResult {
  passed: boolean;
  error?: string;
  resolution?: string;
}

/**
 * Validates that all prerequisites exist for SpecFirst execution.
 * 
 * This gate MUST pass before any phase can execute. It ensures:
 * - Constitution file exists (defines project constraints and requirements)
 * - Git repository exists (required for phase tracking via commits)
 * 
 * @param featureName - Feature name to validate prerequisites for
 * @returns GateResult with passed status and error/resolution if failed
 * 
 * @example
 * ```typescript
 * const result = await prerequisiteGate("contact-enrichment");
 * if (!result.passed) {
 *   console.error(result.error);
 *   console.log(result.resolution);
 *   process.exit(1);
 * }
 * ```
 */
export async function prerequisiteGate(featureName: string): Promise<GateResult> {
  // Check 1: Constitution file exists
  const constitutionPath = getArtifactPath(featureName, "constitution");
  
  if (!existsSync(constitutionPath)) {
    return {
      passed: false,
      error: `Constitution file missing: ${constitutionPath}`,
      resolution: [
        "Create a CONSTITUTION.md file in your project directory with:",
        "",
        "1. Project constraints (tech stack, architecture decisions)",
        "2. Quality requirements (test coverage, documentation standards)",
        "3. Non-functional requirements (performance, security, accessibility)",
        "4. Integration requirements (APIs, services, dependencies)",
        "",
        `Expected location: ${constitutionPath}`,
        "",
        "Example:",
        "```markdown",
        "# Project Constitution",
        "",
        "## Tech Stack",
        "- TypeScript, Bun, Hono",
        "- PostgreSQL, Qdrant",
        "",
        "## Quality Gates",
        "- 80% test coverage required",
        "- All public APIs must be documented",
        "",
        "## Architecture Constraints",
        "- CLI-first design",
        "- Pure functions (no LLM calls in tools)",
        "```",
      ].join("\n"),
    };
  }

  // Check 2: Git repository exists
  const projectDir = getProjectDir(featureName);
  const isGitRepo = await isGitRepository(projectDir);
  
  if (!isGitRepo) {
    return {
      passed: false,
      error: `Not a git repository: ${projectDir}`,
      resolution: [
        "SpecFirst requires git for phase tracking (uses commits as state markers).",
        "",
        "Initialize git repository:",
        `  cd ${projectDir}`,
        "  git init",
        "  git add .",
        '  git commit -m "Initial commit"',
        "",
        "Or if working in an existing repo, ensure you're in the correct directory.",
      ].join("\n"),
    };
  }

  // All checks passed
  return {
    passed: true,
  };
}

/**
 * Validates prerequisites and prints results.
 * Helper function for CLI usage.
 * 
 * @param featureName - Feature name
 * @returns true if passed, false if failed (with printed error)
 */
export async function validatePrerequisites(featureName: string): Promise<boolean> {
  const result = await prerequisiteGate(featureName);
  
  if (!result.passed) {
    console.error("\n❌ Prerequisite gate failed\n");
    console.error(result.error);
    console.error("\n📋 Resolution:\n");
    console.error(result.resolution);
    return false;
  }
  
  console.log("✅ Prerequisite gate passed");
  return true;
}

// Self-test when run directly with: bun gates/prerequisite.ts
if (import.meta.main) {
  console.log("🧪 Testing Prerequisite Gate\n");
  
  // Test 1: Missing constitution (should fail)
  console.log("Test 1: Missing constitution file");
  const testFeature1 = "nonexistent-feature-test";
  const result1 = await prerequisiteGate(testFeature1);
  console.log(`  Result: ${result1.passed ? "❌ FAILED - should have failed" : "✅ PASSED - correctly failed"}`);
  if (!result1.passed) {
    console.log(`  Error: ${result1.error?.split("\n")[0]}`);
  }
  console.log();

  // Test 2: Check current directory (depends on environment)
  console.log("Test 2: Current project directory");
  try {
    const { getPlatformInfo } = await import("../lib/platform");
    const platform = getPlatformInfo();
    console.log(`  Platform: ${platform.platform}`);
    console.log(`  Root dir: ${platform.rootDir}`);
    console.log(`  Projects dir: ${platform.projectsDir}`);
    console.log();
  } catch (error) {
    console.log("  ⚠️  Could not detect platform:", error);
  }

  // Test 3: Validate a real feature (if specified as argument)
  const featureArg = process.argv[2];
  if (featureArg) {
    console.log(`Test 3: Validating feature '${featureArg}'`);
    const isValid = await validatePrerequisites(featureArg);
    console.log(`  Overall result: ${isValid ? "✅ PASSED" : "❌ FAILED"}`);
    console.log();
  } else {
    console.log("Test 3: Skipped (no feature name provided)");
    console.log("  Usage: bun gates/prerequisite.ts <feature-name>");
    console.log();
  }

  console.log("🎯 Self-test complete");
}
