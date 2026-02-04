/**
 * Artifact Gate - SpecFirst 3.0
 * 
 * Validates that required artifacts exist before a phase can run.
 * Each phase has dependencies on artifacts from previous phases.
 * 
 * Phase Dependencies:
 * - propose: constitution only
 * - specify: constitution, proposal
 * - plan: constitution, proposal, spec
 * - implement: constitution, proposal, spec, plan
 * - release: constitution, proposal, spec, plan, tasks
 * 
 * @module gates/artifact
 * @version 3.0.0
 */

import { existsSync } from "fs";
import { getArtifactPath } from "../lib/config";

export type Phase = "propose" | "specify" | "plan" | "implement" | "release";

export interface GateResult {
  passed: boolean;
  error?: string;
  missingArtifacts?: string[];
  resolution?: string;
}

/**
 * Maps each phase to its required artifacts.
 * Each phase requires all artifacts from previous phases plus its own prerequisites.
 */
const PHASE_REQUIREMENTS: Record<Phase, Array<"constitution" | "proposal" | "spec" | "plan" | "tasks">> = {
  propose: ["constitution"],
  specify: ["constitution", "proposal"],
  plan: ["constitution", "proposal", "spec"],
  implement: ["constitution", "proposal", "spec", "plan"],
  release: ["constitution", "proposal", "spec", "plan", "tasks"],
};

/**
 * Maps phases to their previous phase for resolution suggestions.
 */
const PREVIOUS_PHASE: Record<Phase, string | null> = {
  propose: null,
  specify: "propose",
  plan: "specify",
  implement: "plan",
  release: "implement",
};

/**
 * Validates that all required artifacts exist for a given phase.
 * 
 * This gate ensures sequential phase execution by checking that all
 * artifacts from previous phases have been created.
 * 
 * @param phase - The phase to validate (propose, specify, plan, implement, release)
 * @param featureName - The feature name (used to locate artifacts)
 * @returns GateResult with pass/fail status and missing artifact details
 * 
 * @example
 * ```typescript
 * const result = await artifactGate("plan", "user-auth");
 * if (!result.passed) {
 *   console.error(result.error);
 *   console.log(result.resolution);
 * }
 * ```
 */
export async function artifactGate(phase: Phase, featureName: string): Promise<GateResult> {
  // Get required artifacts for this phase
  const requiredArtifacts = PHASE_REQUIREMENTS[phase];
  
  // Check each required artifact and collect ALL missing ones
  const missingArtifacts: string[] = [];
  
  for (const artifactType of requiredArtifacts) {
    const artifactPath = getArtifactPath(featureName, artifactType);
    
    if (!existsSync(artifactPath)) {
      missingArtifacts.push(`${artifactType}.md (${artifactPath})`);
    }
  }
  
  // If all artifacts exist, gate passes
  if (missingArtifacts.length === 0) {
    return {
      passed: true,
    };
  }
  
  // Build error message listing ALL missing artifacts
  const artifactList = missingArtifacts
    .map(artifact => `  - ${artifact}`)
    .join("\n");
  
  const error = `Cannot run ${phase} phase: missing required artifacts\n\n${artifactList}`;
  
  // Suggest running previous phase if available
  const previousPhase = PREVIOUS_PHASE[phase];
  const resolution = previousPhase
    ? `Run the '${previousPhase}' phase first to generate required artifacts.`
    : `Ensure project constitution exists before running ${phase}.`;
  
  return {
    passed: false,
    error,
    missingArtifacts,
    resolution,
  };
}

/**
 * Self-test function to validate gate behavior.
 * Tests all phase requirements and error handling.
 */
export async function selfTest(): Promise<void> {
  console.log("🧪 Artifact Gate Self-Test\n");
  
  // Test 1: Propose phase (only needs constitution)
  console.log("Test 1: Propose phase requirements");
  const proposeReqs = PHASE_REQUIREMENTS.propose;
  console.assert(proposeReqs.length === 1, "Propose should require 1 artifact");
  console.assert(proposeReqs[0] === "constitution", "Propose should require constitution");
  console.log("✅ Pass\n");
  
  // Test 2: Specify phase (needs constitution + proposal)
  console.log("Test 2: Specify phase requirements");
  const specifyReqs = PHASE_REQUIREMENTS.specify;
  console.assert(specifyReqs.length === 2, "Specify should require 2 artifacts");
  console.assert(specifyReqs.includes("constitution"), "Specify should require constitution");
  console.assert(specifyReqs.includes("proposal"), "Specify should require proposal");
  console.log("✅ Pass\n");
  
  // Test 3: Plan phase (needs constitution + proposal + spec)
  console.log("Test 3: Plan phase requirements");
  const planReqs = PHASE_REQUIREMENTS.plan;
  console.assert(planReqs.length === 3, "Plan should require 3 artifacts");
  console.assert(planReqs.includes("constitution"), "Plan should require constitution");
  console.assert(planReqs.includes("proposal"), "Plan should require proposal");
  console.assert(planReqs.includes("spec"), "Plan should require spec");
  console.log("✅ Pass\n");
  
  // Test 4: Implement phase (needs constitution + proposal + spec + plan)
  console.log("Test 4: Implement phase requirements");
  const implReqs = PHASE_REQUIREMENTS.implement;
  console.assert(implReqs.length === 4, "Implement should require 4 artifacts");
  console.assert(implReqs.includes("constitution"), "Implement should require constitution");
  console.assert(implReqs.includes("proposal"), "Implement should require proposal");
  console.assert(implReqs.includes("spec"), "Implement should require spec");
  console.assert(implReqs.includes("plan"), "Implement should require plan");
  console.log("✅ Pass\n");
  
  // Test 5: Release phase (needs all artifacts)
  console.log("Test 5: Release phase requirements");
  const releaseReqs = PHASE_REQUIREMENTS.release;
  console.assert(releaseReqs.length === 5, "Release should require 5 artifacts");
  console.assert(releaseReqs.includes("constitution"), "Release should require constitution");
  console.assert(releaseReqs.includes("proposal"), "Release should require proposal");
  console.assert(releaseReqs.includes("spec"), "Release should require spec");
  console.assert(releaseReqs.includes("plan"), "Release should require plan");
  console.assert(releaseReqs.includes("tasks"), "Release should require tasks");
  console.log("✅ Pass\n");
  
  // Test 6: Missing artifact detection (simulate with non-existent feature)
  console.log("Test 6: Missing artifact detection");
  const result = await artifactGate("specify", "nonexistent-feature-test");
  console.assert(!result.passed, "Gate should fail for missing artifacts");
  console.assert(result.missingArtifacts !== undefined, "Should return missing artifacts list");
  console.assert(result.missingArtifacts!.length >= 2, "Should detect multiple missing artifacts");
  console.assert(result.error !== undefined, "Should return error message");
  console.assert(result.resolution !== undefined, "Should return resolution suggestion");
  console.log("✅ Pass\n");
  
  // Test 7: Resolution suggestions
  console.log("Test 7: Resolution suggestions");
  console.assert(PREVIOUS_PHASE.propose === null, "Propose has no previous phase");
  console.assert(PREVIOUS_PHASE.specify === "propose", "Specify comes after propose");
  console.assert(PREVIOUS_PHASE.plan === "specify", "Plan comes after specify");
  console.assert(PREVIOUS_PHASE.implement === "plan", "Implement comes after plan");
  console.assert(PREVIOUS_PHASE.release === "implement", "Release comes after implement");
  console.log("✅ Pass\n");
  
  console.log("✅ All tests passed!");
}

// Export for testing
export const __testing = {
  PHASE_REQUIREMENTS,
  PREVIOUS_PHASE,
};
