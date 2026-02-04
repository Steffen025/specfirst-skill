/**
 * Phase Completion Gate - SpecFirst 3.0
 * 
 * Validates that a phase has been properly completed:
 * 1. Git commit exists with correct message format
 * 2. Artifact frontmatter status equals "complete"
 * 
 * This gate enables the Constitution pattern: gates should verify
 * COMPLETED work, not assume it's done without evidence.
 * 
 * @module gates/phase-complete
 * @version 3.0.0
 */

import { readFileSync } from "fs";
import { isPhaseComplete } from "../lib/git";
import { getArtifactPath } from "../lib/config";

export type Phase = "propose" | "specify" | "plan" | "implement" | "release";

/**
 * Maps phases to their primary artifact for verification.
 * Release phase verifies tasks artifact (not a separate release artifact).
 */
const PHASE_ARTIFACT: Record<Phase, "proposal" | "spec" | "plan" | "tasks"> = {
  propose: "proposal",
  specify: "spec",
  plan: "plan",
  implement: "tasks",
  release: "tasks", // Release verifies tasks are complete
};

export interface GateResult {
  passed: boolean;
  gitCommitFound: boolean;
  frontmatterComplete: boolean;
  error?: string;
  resolution?: string;
}

/**
 * Parses YAML frontmatter from markdown content.
 * 
 * Extracts key-value pairs from between --- markers.
 * 
 * @param content - Full markdown file content
 * @returns Object with frontmatter key-value pairs
 * 
 * @example
 * ```typescript
 * const content = "---\nstatus: complete\n---\nBody";
 * const fm = parseFrontmatter(content);
 * console.log(fm.status); // "complete"
 * ```
 */
function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    return {};
  }
  
  const frontmatterText = frontmatterMatch[1];
  const result: Record<string, string> = {};
  
  // Parse each line as key: value
  for (const line of frontmatterText.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    
    result[key] = value;
  }
  
  return result;
}

/**
 * Validates that a phase has been completed properly.
 * 
 * Checks two completion criteria:
 * 1. Git commit exists with message: "SpecFirst: {phase} phase complete for {feature}"
 * 2. Artifact frontmatter has status: complete
 * 
 * Both criteria must pass for the gate to pass.
 * 
 * @param phase - The phase to verify (propose, specify, plan, implement, release)
 * @param featureName - The feature name
 * @returns GateResult with detailed pass/fail status
 * 
 * @example
 * ```typescript
 * const result = await phaseCompleteGate("specify", "user-auth");
 * if (!result.passed) {
 *   console.error(result.error);
 *   console.log(`Git commit found: ${result.gitCommitFound}`);
 *   console.log(`Frontmatter complete: ${result.frontmatterComplete}`);
 * }
 * ```
 */
export async function phaseCompleteGate(
  phase: Phase,
  featureName: string
): Promise<GateResult> {
  // 1. Check git commit exists for phase
  const gitCommitFound = await isPhaseComplete(phase, featureName);
  
  // 2. Read artifact file
  const artifactType = PHASE_ARTIFACT[phase];
  const artifactPath = getArtifactPath(featureName, artifactType);
  
  let frontmatterComplete = false;
  let fileContent = "";
  
  try {
    fileContent = readFileSync(artifactPath, "utf-8");
  } catch (error) {
    // File doesn't exist or can't be read
    return {
      passed: false,
      gitCommitFound,
      frontmatterComplete: false,
      error: `Cannot read artifact: ${artifactPath}`,
      resolution: `Run the '${phase}' phase to generate the required artifact.`,
    };
  }
  
  // 3. Parse YAML frontmatter
  const frontmatter = parseFrontmatter(fileContent);
  
  // 4. Check status: complete
  frontmatterComplete = frontmatter.status === "complete";
  
  // 5. Return combined result
  const passed = gitCommitFound && frontmatterComplete;
  
  if (passed) {
    return {
      passed: true,
      gitCommitFound: true,
      frontmatterComplete: true,
    };
  }
  
  // Build detailed error message
  const errors: string[] = [];
  
  if (!gitCommitFound) {
    errors.push(
      `❌ Git commit not found with message: "SpecFirst: ${phase} phase complete for ${featureName}"`
    );
  }
  
  if (!frontmatterComplete) {
    const actualStatus = frontmatter.status || "(missing)";
    errors.push(
      `❌ Artifact frontmatter status is "${actualStatus}", expected "complete"`
    );
  }
  
  const error = `Phase '${phase}' not completed for ${featureName}:\n\n${errors.join("\n")}`;
  
  const resolution = 
    "Complete the phase by:\n" +
    "  1. Setting artifact frontmatter status: complete\n" +
    "  2. Committing the artifact with message: SpecFirst: {phase} phase complete for {feature}";
  
  return {
    passed: false,
    gitCommitFound,
    frontmatterComplete,
    error,
    resolution,
  };
}

/**
 * Self-test function to validate gate behavior.
 * Tests frontmatter parsing and gate logic.
 */
export async function selfTest(): Promise<void> {
  console.log("🧪 Phase Completion Gate Self-Test\n");
  
  // Test 1: Frontmatter parsing - valid YAML
  console.log("Test 1: Parse valid frontmatter");
  const validContent = "---\nstatus: complete\nphase: propose\n---\nBody content";
  const parsed = parseFrontmatter(validContent);
  console.assert(parsed.status === "complete", "Should parse status correctly");
  console.assert(parsed.phase === "propose", "Should parse phase correctly");
  console.log("✅ Pass\n");
  
  // Test 2: Frontmatter parsing - missing frontmatter
  console.log("Test 2: Parse content without frontmatter");
  const noFrontmatter = "# Just a heading\nNo frontmatter here";
  const parsedEmpty = parseFrontmatter(noFrontmatter);
  console.assert(Object.keys(parsedEmpty).length === 0, "Should return empty object");
  console.log("✅ Pass\n");
  
  // Test 3: Frontmatter parsing - with colons in value
  console.log("Test 3: Parse frontmatter with colons in value");
  const colonContent = "---\ntitle: My Title: With Colons\nstatus: complete\n---\nBody";
  const parsedColon = parseFrontmatter(colonContent);
  console.assert(parsedColon.title === "My Title: With Colons", "Should handle colons in values");
  console.assert(parsedColon.status === "complete", "Should still parse other fields");
  console.log("✅ Pass\n");
  
  // Test 4: Phase artifact mapping
  console.log("Test 4: Phase to artifact mapping");
  console.assert(PHASE_ARTIFACT.propose === "proposal", "Propose -> proposal");
  console.assert(PHASE_ARTIFACT.specify === "spec", "Specify -> spec");
  console.assert(PHASE_ARTIFACT.plan === "plan", "Plan -> plan");
  console.assert(PHASE_ARTIFACT.implement === "tasks", "Implement -> tasks");
  console.assert(PHASE_ARTIFACT.release === "tasks", "Release -> tasks (verifies tasks complete)");
  console.log("✅ Pass\n");
  
  // Test 5: Gate result structure for incomplete phase
  console.log("Test 5: Gate detects incomplete phase (nonexistent feature)");
  const result = await phaseCompleteGate("propose", "nonexistent-test-feature");
  console.assert(!result.passed, "Gate should fail for nonexistent feature");
  console.assert(result.gitCommitFound === false, "Git commit should not be found");
  console.assert(result.frontmatterComplete === false, "Frontmatter should not be complete");
  console.assert(result.error !== undefined, "Should provide error message");
  console.assert(result.resolution !== undefined, "Should provide resolution");
  console.log("✅ Pass\n");
  
  // Test 6: Error message structure
  console.log("Test 6: Error message includes both checks");
  console.assert(
    result.error!.includes("Git commit not found"),
    "Error should mention git commit"
  );
  console.assert(
    result.error!.includes("Artifact frontmatter"),
    "Error should mention frontmatter"
  );
  console.log("✅ Pass\n");
  
  // Test 7: Resolution guidance
  console.log("Test 7: Resolution provides clear next steps");
  console.assert(
    result.resolution!.includes("Setting artifact frontmatter status: complete"),
    "Resolution should mention frontmatter"
  );
  console.assert(
    result.resolution!.includes("Committing the artifact"),
    "Resolution should mention git commit"
  );
  console.log("✅ Pass\n");
  
  console.log("✅ All tests passed!");
}

// Export for testing
export const __testing = {
  PHASE_ARTIFACT,
  parseFrontmatter,
};

// Run self-test if executed directly
if (import.meta.main) {
  selfTest().catch(console.error);
}
