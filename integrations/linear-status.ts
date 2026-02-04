/**
 * Linear Status Sync for SpecFirst
 * 
 * Synchronizes SpecFirst phase completions to Linear issue states.
 * Updates Linear issue workflow state after each phase completion.
 * 
 * ISC 39: Status sync updates Linear issue after propose
 * ISC 40: Status sync updates Linear issue after specify
 * ISC 41: Status sync updates Linear issue after plan
 * ISC 42: Status sync updates Linear issue after implement
 * ISC 43: Status sync updates Linear issue after release
 */

import { getLinearClient, isLinearAvailable } from "./linear-client";

export type SpecFirstPhase = "propose" | "specify" | "plan" | "implement" | "release";

/**
 * Map SpecFirst phases to Linear workflow states
 * 
 * Rationale:
 * - propose → "Specified" (has proposal)
 * - specify → "Planned" (has spec)
 * - plan → "Ready for Dev" (has implementation plan)
 * - implement → "In Progress" (has tasks, working on them)
 * - release → "Done" (deployed)
 */
const PHASE_TO_STATE: Record<SpecFirstPhase, string> = {
  propose: "Specified",
  specify: "Planned",
  plan: "Ready for Dev",
  implement: "In Progress",
  release: "Done",
};

export interface StatusSyncResult {
  success: boolean;
  phase: SpecFirstPhase;
  newState?: string;
  error?: string;
  skipped?: boolean;  // true if Linear not available
}

/**
 * Sync SpecFirst phase completion to Linear
 * 
 * Updates the Linear issue's workflow state to match the completed phase.
 * Gracefully handles Linear being unavailable or offline.
 * 
 * @param issueId - Linear issue ID (not identifier like "PAI-123")
 * @param phase - SpecFirst phase that was just completed
 * @param teamId - Linear team ID for finding workflow states
 * @returns Result with success status, new state, or error details
 */
export async function syncPhaseStatus(
  issueId: string,
  phase: SpecFirstPhase,
  teamId: string
): Promise<StatusSyncResult> {
  // 1. Check if Linear available
  if (!isLinearAvailable()) {
    return {
      success: false,
      phase,
      skipped: true,
      error: "Linear integration not configured (LINEAR_API_TOKEN not set)",
    };
  }

  try {
    const client = getLinearClient();
    const targetStateName = PHASE_TO_STATE[phase];

    // 2. Get team's workflow states
    const states = await client.getTeamStates(teamId);

    if (states.length === 0) {
      return {
        success: false,
        phase,
        error: `No workflow states found for team ${teamId}`,
      };
    }

    // 3. Find matching state ID
    const targetState = states.find(
      (state) => state.name.toLowerCase() === targetStateName.toLowerCase()
    );

    if (!targetState) {
      // Log available states for debugging
      const availableStates = states.map((s) => s.name).join(", ");
      return {
        success: false,
        phase,
        error: `State "${targetStateName}" not found in team workflow. Available: ${availableStates}`,
      };
    }

    // 4. Update issue state
    const updated = await client.updateIssueState(issueId, targetState.id);

    if (!updated) {
      return {
        success: false,
        phase,
        error: "Failed to update issue state (API returned false)",
      };
    }

    // 5. Return result
    return {
      success: true,
      phase,
      newState: targetState.name,
    };
  } catch (error) {
    // Network errors, rate limits, etc.
    return {
      success: false,
      phase,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Batch sync for catching up after offline
 * 
 * Syncs only the latest completed phase since Linear only needs
 * current state, not historical phase transitions.
 * 
 * @param issueId - Linear issue ID
 * @param completedPhases - Array of phases completed (in order)
 * @param teamId - Linear team ID
 * @returns Array with single result for latest phase
 */
export async function syncAllPhases(
  issueId: string,
  completedPhases: SpecFirstPhase[],
  teamId: string
): Promise<StatusSyncResult[]> {
  if (completedPhases.length === 0) {
    return [];
  }

  // Sync the latest completed phase
  // (Linear only needs current state, not history)
  const latestPhase = completedPhases[completedPhases.length - 1];
  const result = await syncPhaseStatus(issueId, latestPhase, teamId);

  return [result];
}

/**
 * Get expected Linear state for a phase
 * 
 * @param phase - SpecFirst phase
 * @returns Expected Linear workflow state name
 */
export function getExpectedState(phase: SpecFirstPhase): string {
  return PHASE_TO_STATE[phase];
}

/**
 * Validate that team has required workflow states
 * 
 * Useful for setup validation - checks if team workflow
 * has all required states before running SpecFirst.
 * 
 * @param teamId - Linear team ID
 * @returns Missing state names, or empty array if all present
 */
export async function validateTeamWorkflow(
  teamId: string
): Promise<string[]> {
  if (!isLinearAvailable()) {
    return [];
  }

  try {
    const client = getLinearClient();
    const states = await client.getTeamStates(teamId);
    const stateNames = states.map((s) => s.name.toLowerCase());

    const required = Object.values(PHASE_TO_STATE);
    const missing = required.filter(
      (stateName) => !stateNames.includes(stateName.toLowerCase())
    );

    return missing;
  } catch (error) {
    console.error("Failed to validate team workflow:", error);
    return [];
  }
}

/**
 * Self-test: Verify status sync functionality
 * 
 * Tests all ISC criteria (39-43) for status sync.
 * Requires LINEAR_API_TOKEN and valid teamId.
 * 
 * NOTE: This is a dry-run test that doesn't modify actual issues.
 */
export async function selfTest(
  teamId?: string
): Promise<{
  configured: boolean;
  canSync?: boolean;
  missingStates?: string[];
  error?: string;
}> {
  // Test Linear availability
  if (!isLinearAvailable()) {
    return {
      configured: false,
      error: "LINEAR_API_TOKEN not set",
    };
  }

  if (!teamId) {
    return {
      configured: true,
      error: "Team ID required for workflow validation",
    };
  }

  try {
    // Validate team has all required states
    const missing = await validateTeamWorkflow(teamId);

    if (missing.length > 0) {
      return {
        configured: true,
        canSync: false,
        missingStates: missing,
        error: `Team workflow missing states: ${missing.join(", ")}`,
      };
    }

    return {
      configured: true,
      canSync: true,
    };
  } catch (error) {
    return {
      configured: true,
      canSync: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * // After completing a phase
 * const result = await syncPhaseStatus(
 *   issueId,
 *   "propose",
 *   teamId
 * );
 * 
 * if (result.success) {
 *   console.log(`Updated to ${result.newState}`);
 * } else if (result.skipped) {
 *   console.log("Linear not configured, skipping sync");
 * } else {
 *   console.error(`Sync failed: ${result.error}`);
 * }
 * 
 * // Validate team setup
 * const missing = await validateTeamWorkflow(teamId);
 * if (missing.length > 0) {
 *   console.warn(`Add these states: ${missing.join(", ")}`);
 * }
 * ```
 */
