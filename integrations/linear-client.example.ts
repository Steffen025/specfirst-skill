/**
 * Linear Client Usage Examples
 * 
 * Shows how to use the Linear API client in SpecFirst
 */

import {
  getLinearClient,
  isLinearAvailable,
  LinearAPIError,
} from "./linear-client";

async function examples() {
  // Check if Linear is configured
  if (!isLinearAvailable()) {
    console.log("Linear integration not available");
    console.log("Set LINEAR_API_TOKEN to enable");
    return;
  }

  const client = getLinearClient();

  // Example 1: Get current milestone for a team
  try {
    const milestone = await client.getCurrentMilestone("YOUR_TEAM_ID");
    if (milestone) {
      console.log(`Current milestone: ${milestone.name}`);
      console.log(`Target date: ${milestone.targetDate}`);
    } else {
      console.log("No active milestone");
    }
  } catch (error) {
    if (error instanceof LinearAPIError) {
      console.error(`Linear error [${error.code}]: ${error.message}`);
      if (error.retryAfter) {
        console.log(`Retry after ${error.retryAfter} seconds`);
      }
    }
  }

  // Example 2: Get issue details
  try {
    const issue = await client.getIssue("PAI-123");
    if (issue) {
      console.log(`Issue: ${issue.identifier} - ${issue.title}`);
      console.log(`State: ${issue.state.name}`);
      if (issue.milestone) {
        console.log(`Milestone: ${issue.milestone.name}`);
      }
    }
  } catch (error) {
    console.error("Failed to fetch issue:", error);
  }

  // Example 3: Get team workflow states
  try {
    const states = await client.getTeamStates("YOUR_TEAM_ID");
    console.log(`Team has ${states.length} workflow states:`);
    states.forEach((state) => {
      console.log(`  - ${state.name} (${state.type})`);
    });
  } catch (error) {
    console.error("Failed to fetch states:", error);
  }

  // Example 4: Update issue state
  try {
    const success = await client.updateIssueState(
      "issue-id",
      "state-id"
    );
    console.log(`Update ${success ? "successful" : "failed"}`);
  } catch (error) {
    console.error("Failed to update issue:", error);
  }
}

// Graceful degradation pattern
async function withLinearOrFallback<T>(
  linearAction: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isLinearAvailable()) {
    console.log("Linear not available, using fallback");
    return fallback;
  }

  try {
    return await linearAction();
  } catch (error) {
    console.warn("Linear action failed, using fallback:", error);
    return fallback;
  }
}

// Usage in SpecFirst
async function getProjectMilestone(teamId: string): Promise<string> {
  return withLinearOrFallback(
    async () => {
      const client = getLinearClient();
      const milestone = await client.getCurrentMilestone(teamId);
      return milestone?.name || "No milestone";
    },
    "Milestone tracking unavailable"
  );
}
