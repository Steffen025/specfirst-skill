/**
 * Linear Milestone Validation for SpecFirst 3.0
 * 
 * Validates that features are in the current development milestone.
 * Blocks features from wrong milestone, captures milestone in spec metadata.
 * 
 * ISC 37: Milestone validation blocks features from wrong milestone
 * ISC 38: Milestone validation captures milestone in spec metadata
 */

import { getLinearClient, isLinearAvailable, Milestone } from "./linear-client";

export interface MilestoneValidationResult {
  valid: boolean;
  currentMilestone?: Milestone;
  featureMilestone?: string;
  error?: string;
  skipped?: boolean;  // true if Linear not available
}

/**
 * ISC 37: Validate that a feature is in the current milestone
 * 
 * Compares feature's milestone with team's current milestone.
 * Blocks if mismatch. Allows if Linear unavailable (offline mode).
 */
export async function validateMilestone(
  featureId: string,  // Linear issue ID or identifier
  teamId: string
): Promise<MilestoneValidationResult> {
  // 1. Check if Linear is available
  if (!isLinearAvailable()) {
    console.warn("[Milestone Validation] Linear not configured - skipping validation");
    return { 
      valid: true, 
      skipped: true 
    };
  }

  const client = getLinearClient();

  try {
    // 2. Get current milestone for team
    const currentMilestone = await client.getCurrentMilestone(teamId);
    
    if (!currentMilestone) {
      // No active milestone - allow but warn
      console.warn(`[Milestone Validation] No active milestone for team ${teamId}`);
      return {
        valid: true,
        skipped: true,
        error: "No active milestone",
      };
    }

    // 3. Get feature's milestone
    const issue = await client.getIssue(featureId);
    
    if (!issue) {
      return {
        valid: false,
        currentMilestone,
        error: `Feature ${featureId} not found in Linear`,
      };
    }

    const featureMilestone = issue.milestone;

    // 4. Compare - block if mismatch
    if (!featureMilestone) {
      return {
        valid: false,
        currentMilestone,
        featureMilestone: "None",
        error: `Feature ${issue.identifier} has no milestone assigned`,
      };
    }

    if (featureMilestone.id !== currentMilestone.id) {
      return {
        valid: false,
        currentMilestone,
        featureMilestone: featureMilestone.name,
        error: `Feature ${issue.identifier} is in wrong milestone. Current: ${currentMilestone.name}, Feature: ${featureMilestone.name}`,
      };
    }

    // 5. Return success
    return {
      valid: true,
      currentMilestone,
      featureMilestone: featureMilestone.name,
    };
  } catch (error) {
    // Network errors or API issues - don't block in offline mode
    console.error("[Milestone Validation] Error:", error);
    return {
      valid: true,
      skipped: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * ISC 38: Get milestone info for spec metadata
 * 
 * Returns milestone name for inclusion in spec.md frontmatter.
 * e.g., "v1.0 - January 2026"
 */
export async function getMilestoneForSpec(
  featureId: string
): Promise<string | null> {
  if (!isLinearAvailable()) {
    return null;
  }

  const client = getLinearClient();

  try {
    const issue = await client.getIssue(featureId);
    
    if (!issue || !issue.milestone) {
      return null;
    }

    // Format: "Name - Date" (e.g., "v1.0 - January 2026")
    let formatted = issue.milestone.name;
    
    if (issue.milestone.targetDate) {
      const date = new Date(issue.milestone.targetDate);
      const month = date.toLocaleDateString("en-US", { month: "long" });
      const year = date.getFullYear();
      formatted = `${issue.milestone.name} - ${month} ${year}`;
    }

    return formatted;
  } catch (error) {
    console.error("[Milestone Metadata] Error:", error);
    return null;
  }
}

/**
 * Check if feature is in active development milestone
 * 
 * Convenience wrapper around validateMilestone that returns boolean.
 */
export async function isInCurrentMilestone(
  featureId: string,
  teamId: string
): Promise<boolean> {
  const result = await validateMilestone(featureId, teamId);
  return result.valid;
}

/**
 * Self-test: Verify milestone validation logic
 */
export async function selfTest(): Promise<{
  success: boolean;
  results: Record<string, unknown>;
  error?: string;
}> {
  const results: Record<string, unknown> = {};

  try {
    // Test 1: Linear availability check
    results.linearAvailable = isLinearAvailable();

    if (!isLinearAvailable()) {
      results.message = "Linear not configured - validation will be skipped in production";
      return { success: true, results };
    }

    // Test 2: Validate with test feature (if LINEAR_TEST_FEATURE_ID provided)
    const testFeatureId = process.env.LINEAR_TEST_FEATURE_ID;
    const testTeamId = process.env.LINEAR_TEST_TEAM_ID;

    if (testFeatureId && testTeamId) {
      const validation = await validateMilestone(testFeatureId, testTeamId);
      results.validationTest = {
        valid: validation.valid,
        currentMilestone: validation.currentMilestone?.name,
        featureMilestone: validation.featureMilestone,
        skipped: validation.skipped,
      };

      // Test 3: Get milestone metadata
      const milestone = await getMilestoneForSpec(testFeatureId);
      results.metadataTest = {
        milestone,
      };

      // Test 4: Boolean check
      const inCurrent = await isInCurrentMilestone(testFeatureId, testTeamId);
      results.booleanTest = {
        inCurrentMilestone: inCurrent,
      };
    } else {
      results.message = "Set LINEAR_TEST_FEATURE_ID and LINEAR_TEST_TEAM_ID for full testing";
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Run self-test if executed directly
if (import.meta.main) {
  console.log("🧪 Running Linear Milestone Validation Self-Test...\n");
  
  const result = await selfTest();
  
  console.log("Results:", JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log("\n✅ Self-test passed");
  } else {
    console.error("\n❌ Self-test failed:", result.error);
    process.exit(1);
  }
}
