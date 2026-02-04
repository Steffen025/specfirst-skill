/**
 * Propose Phase - SpecFirst 3.0
 * 
 * Creates a proposal.md artifact with problem statement and solution approaches.
 * This is the first phase of SpecFirst - it defines the problem space before
 * diving into specifications.
 * 
 * ISC Coverage:
 * - ISC #23: Creates proposal with problem statement
 * - ISC #24: Includes solution approaches and rationale
 * 
 * @module phases/propose
 * @version 3.0.0
 */

import { writeFile } from "fs/promises";
import { generateProposal, createProposalTemplate } from "../artifacts/proposal";
import { getArtifactPath, ensureFeatureDirectories } from "../lib/config";
import { createPhaseCommit } from "../lib/git";
import { prerequisiteGate } from "../gates/prerequisite";
import type { SolutionApproach } from "../artifacts/types";

/**
 * Input for the propose phase.
 * Contains all information needed to generate a complete proposal.
 */
export interface ProposeInput {
  featureName: string;
  problemStatement: string;
  solutionApproaches: Array<{
    name: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;
  recommendedApproach: string;
  antiPatterns?: string[];
  openQuestions?: string[];
}

/**
 * Result of a phase execution.
 */
export interface PhaseResult {
  success: boolean;
  artifactPath?: string;
  error?: string;
}

/**
 * Executes the propose phase.
 * 
 * Flow:
 * 1. Run prerequisite gate (validates constitution and git repo)
 * 2. Ensure feature directories exist
 * 3. Generate proposal content from input
 * 4. Write proposal.md to specs directory
 * 5. Create git commit marking phase completion
 * 
 * @param input - ProposeInput with all proposal data
 * @returns PhaseResult indicating success/failure
 * 
 * @example
 * ```typescript
 * const result = await proposePhase({
 *   featureName: "contact-enrichment",
 *   problemStatement: "Need to enrich contact data from multiple sources",
 *   solutionApproaches: [
 *     {
 *       name: "Sequential API calls",
 *       description: "Call each API in sequence",
 *       pros: ["Simple", "Easy to debug"],
 *       cons: ["Slow", "High latency"]
 *     }
 *   ],
 *   recommendedApproach: "Use sequential approach for MVP",
 *   antiPatterns: ["Don't cache API responses without TTL"]
 * });
 * 
 * if (result.success) {
 *   console.log(`Proposal created: ${result.artifactPath}`);
 * }
 * ```
 */
export async function proposePhase(input: ProposeInput): Promise<PhaseResult> {
  try {
    // 1. Run prerequisite gate
    const gateResult = await prerequisiteGate(input.featureName);
    if (!gateResult.passed) {
      return {
        success: false,
        error: `Prerequisite gate failed: ${gateResult.error}\n\n${gateResult.resolution}`,
      };
    }

    // 2. Ensure directories exist
    await ensureFeatureDirectories(input.featureName);

    // 3. Generate proposal content
    const proposalContent = generateProposal(
      input.featureName,
      input.problemStatement,
      input.solutionApproaches as SolutionApproach[],
      input.recommendedApproach,
      input.antiPatterns || [],
      input.openQuestions || []
    );

    // 4. Write to file
    const artifactPath = getArtifactPath(input.featureName, "proposal");
    await writeFile(artifactPath, proposalContent, "utf-8");

    // 5. Create git commit
    const commitResult = await createPhaseCommit(
      "propose",
      input.featureName,
      artifactPath
    );

    if (!commitResult.success) {
      // File was created but commit failed
      return {
        success: false,
        artifactPath,
        error: `Proposal created but git commit failed: ${commitResult.stderr || commitResult.error?.message}`,
      };
    }

    return {
      success: true,
      artifactPath,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: `Phase execution failed: ${err.message}`,
    };
  }
}

/**
 * Creates a proposal template for interactive editing.
 * 
 * This version creates a template with placeholder text that the user
 * can fill in manually. Useful for exploratory work where the problem
 * space isn't fully defined yet.
 * 
 * Flow:
 * 1. Run prerequisite gate
 * 2. Ensure directories exist
 * 3. Generate template content
 * 4. Write to file
 * 5. Skip git commit (user will commit after filling in template)
 * 
 * @param featureName - Name of the feature
 * @returns PhaseResult with path to template
 * 
 * @example
 * ```typescript
 * const result = await createProposalInteractive("contact-enrichment");
 * 
 * if (result.success) {
 *   console.log(`Template created: ${result.artifactPath}`);
 *   console.log("Fill in the template and commit when ready.");
 * }
 * ```
 */
export async function createProposalInteractive(featureName: string): Promise<PhaseResult> {
  try {
    // 1. Run prerequisite gate
    const gateResult = await prerequisiteGate(featureName);
    if (!gateResult.passed) {
      return {
        success: false,
        error: `Prerequisite gate failed: ${gateResult.error}\n\n${gateResult.resolution}`,
      };
    }

    // 2. Ensure directories exist
    await ensureFeatureDirectories(featureName);

    // 3. Generate template content
    const templateContent = createProposalTemplate(featureName);

    // 4. Write to file
    const artifactPath = getArtifactPath(featureName, "proposal");
    await writeFile(artifactPath, templateContent, "utf-8");

    // 5. Skip git commit - user will commit after filling in
    return {
      success: true,
      artifactPath,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: `Template creation failed: ${err.message}`,
    };
  }
}

// Self-test when run directly with: bun phases/propose.ts
if (import.meta.main) {
  console.log("🧪 Testing Propose Phase\n");

  // Test 1: Create proposal template
  console.log("Test 1: Creating proposal template");
  const testFeature = "test-feature-propose";
  
  const templateResult = await createProposalInteractive(testFeature);
  
  if (templateResult.success) {
    console.log(`  ✅ Template created: ${templateResult.artifactPath}`);
    
    // Read and display first few lines
    const fs = await import("fs/promises");
    const content = await fs.readFile(templateResult.artifactPath!, "utf-8");
    const firstLines = content.split("\n").slice(0, 10).join("\n");
    console.log("  Preview:");
    console.log(firstLines);
  } else {
    console.log(`  ❌ Failed: ${templateResult.error}`);
  }
  console.log();

  // Test 2: Create full proposal (if args provided)
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] !== testFeature) {
    console.log(`Test 2: Creating full proposal for '${args[0]}'`);
    
    const fullResult = await proposePhase({
      featureName: args[0],
      problemStatement: "Test problem statement for self-test execution.",
      solutionApproaches: [
        {
          name: "Approach A",
          description: "First approach description",
          pros: ["Pro 1", "Pro 2"],
          cons: ["Con 1"],
        },
        {
          name: "Approach B",
          description: "Alternative approach",
          pros: ["Different benefits"],
          cons: ["Different trade-offs"],
        },
      ],
      recommendedApproach: "Use Approach A for MVP, consider B for scale.",
      antiPatterns: ["Avoid premature optimization"],
      openQuestions: ["How will this scale?"],
    });

    if (fullResult.success) {
      console.log(`  ✅ Proposal created: ${fullResult.artifactPath}`);
    } else {
      console.log(`  ❌ Failed: ${fullResult.error}`);
    }
    console.log();
  } else {
    console.log("Test 2: Skipped (provide feature name as argument for full test)");
    console.log("  Usage: bun phases/propose.ts <feature-name>");
    console.log();
  }

  // Test 3: ISC Criteria Verification
  console.log("Test 3: ISC Criteria Verification");
  
  // ISC #23: Proposal includes problem statement
  const fs = await import("fs/promises");
  const templatePath = getArtifactPath(testFeature, "proposal");
  const templateContent = await fs.readFile(templatePath, "utf-8");
  
  const hasProblemStatement = templateContent.includes("## Problem Statement");
  console.log(`  ISC #23 (Problem Statement): ${hasProblemStatement ? "✅ PASS" : "❌ FAIL"}`);
  
  // ISC #24: Proposal includes solution approaches and rationale
  const hasApproaches = templateContent.includes("## Solution Approaches");
  const hasRecommended = templateContent.includes("## Recommended Approach");
  const hasBothForISC24 = hasApproaches && hasRecommended;
  console.log(`  ISC #24 (Solution Approaches): ${hasBothForISC24 ? "✅ PASS" : "❌ FAIL"}`);
  console.log();

  console.log("🎯 Self-test complete");
  
  // Cleanup test artifact
  console.log("\n🧹 Cleaning up test artifacts...");
  try {
    await fs.unlink(templatePath);
    console.log(`  Removed: ${templatePath}`);
  } catch {
    console.log("  (No cleanup needed)");
  }
}
