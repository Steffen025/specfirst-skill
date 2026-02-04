/**
 * Example Usage: Linear Milestone Validation in SpecFirst
 * 
 * Demonstrates how to integrate milestone validation in the Specify phase.
 */

import { validateMilestone, getMilestoneForSpec, isInCurrentMilestone } from "./linear-milestone";

/**
 * Example 1: Validate milestone in Specify phase
 */
async function specifyPhaseExample(featureId: string, teamId: string) {
  console.log("=== Specify Phase: Milestone Validation ===\n");

  // Validate that feature is in current milestone
  const milestoneResult = await validateMilestone(featureId, teamId);

  console.log("Validation Result:", {
    valid: milestoneResult.valid,
    skipped: milestoneResult.skipped,
    currentMilestone: milestoneResult.currentMilestone?.name,
    featureMilestone: milestoneResult.featureMilestone,
  });

  // Block if validation failed (and not skipped due to offline mode)
  if (!milestoneResult.valid && !milestoneResult.skipped) {
    console.error("\n❌ BLOCKED: Feature not in current milestone");
    console.error(`   Current: ${milestoneResult.currentMilestone?.name}`);
    console.error(`   Feature: ${milestoneResult.featureMilestone}`);
    console.error(`   Error: ${milestoneResult.error}`);
    return { success: false, error: milestoneResult.error };
  }

  if (milestoneResult.skipped) {
    console.warn("\n⚠️  Milestone validation skipped (offline mode)");
  } else {
    console.log("\n✅ Milestone validation passed");
  }

  // Get milestone for spec metadata
  const milestone = await getMilestoneForSpec(featureId);
  console.log(`\n📝 Spec metadata: milestone: "${milestone}"`);

  return { success: true, milestone };
}

/**
 * Example 2: Generate spec.md with milestone metadata
 */
async function generateSpecWithMilestone(featureId: string) {
  console.log("\n=== Generate spec.md with milestone ===\n");

  const milestone = await getMilestoneForSpec(featureId);

  const specFrontmatter = `---
feature_id: ${featureId}
milestone: ${milestone || "N/A"}
created: ${new Date().toISOString()}
status: draft
---

# Feature Specification

**Milestone:** ${milestone || "No milestone assigned"}

## Overview
...
`;

  console.log("Generated frontmatter:");
  console.log(specFrontmatter);

  return specFrontmatter;
}

/**
 * Example 3: Quick boolean check
 */
async function quickMilestoneCheck(featureId: string, teamId: string) {
  console.log("\n=== Quick Boolean Check ===\n");

  const inCurrent = await isInCurrentMilestone(featureId, teamId);
  
  console.log(`Feature in current milestone: ${inCurrent}`);

  if (!inCurrent) {
    console.log("⚠️  Feature should be moved to current milestone before starting work");
  }

  return inCurrent;
}

/**
 * Example 4: Offline behavior (Linear not configured)
 */
async function offlineBehaviorExample(featureId: string, teamId: string) {
  console.log("\n=== Offline Behavior ===\n");

  const result = await validateMilestone(featureId, teamId);

  if (result.skipped) {
    console.log("✅ Validation skipped gracefully (offline mode)");
    console.log("   Work can proceed without Linear connection");
    console.log("   Error logged:", result.error);
  }

  return result;
}

/**
 * Example 5: Integration in SpecFirst workflow
 */
async function fullSpecFirstIntegration(featureId: string, teamId: string) {
  console.log("\n=== Full SpecFirst Integration ===\n");

  // Step 1: Validate milestone
  const validation = await validateMilestone(featureId, teamId);

  if (!validation.valid && !validation.skipped) {
    return {
      phase: "specify",
      success: false,
      error: validation.error,
      blockedBy: "milestone_mismatch",
    };
  }

  // Step 2: Get milestone metadata
  const milestone = await getMilestoneForSpec(featureId);

  // Step 3: Generate spec with metadata
  const spec = {
    frontmatter: {
      feature_id: featureId,
      milestone: milestone,
      team_id: teamId,
      validated_at: new Date().toISOString(),
    },
    content: "# Feature Specification\n...",
  };

  console.log("Spec generated:");
  console.log(JSON.stringify(spec, null, 2));

  return {
    phase: "specify",
    success: true,
    spec,
  };
}

// Run examples if executed directly
if (import.meta.main) {
  const EXAMPLE_FEATURE_ID = process.env.LINEAR_TEST_FEATURE_ID || "EXAMPLE-123";
  const EXAMPLE_TEAM_ID = process.env.LINEAR_TEST_TEAM_ID || "team-123";

  console.log("📚 Linear Milestone Validation Examples\n");
  console.log(`Feature ID: ${EXAMPLE_FEATURE_ID}`);
  console.log(`Team ID: ${EXAMPLE_TEAM_ID}\n`);

  try {
    // Run all examples
    await specifyPhaseExample(EXAMPLE_FEATURE_ID, EXAMPLE_TEAM_ID);
    await generateSpecWithMilestone(EXAMPLE_FEATURE_ID);
    await quickMilestoneCheck(EXAMPLE_FEATURE_ID, EXAMPLE_TEAM_ID);
    await offlineBehaviorExample(EXAMPLE_FEATURE_ID, EXAMPLE_TEAM_ID);
    await fullSpecFirstIntegration(EXAMPLE_FEATURE_ID, EXAMPLE_TEAM_ID);

    console.log("\n✅ All examples completed successfully");
  } catch (error) {
    console.error("\n❌ Error running examples:", error);
    process.exit(1);
  }
}
