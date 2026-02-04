#!/usr/bin/env bun
/**
 * Linear Status Sync - Integration Test
 * 
 * Run with:
 * LINEAR_TEAM_ID=your-team-id bun run linear-status.integration-test.ts
 * 
 * Validates team workflow has all required states.
 */

import {
  getExpectedState,
  validateTeamWorkflow,
  type SpecFirstPhase,
} from "./linear-status";

console.log("Linear Status Sync - Manual Integration Test\n");

const teamId = process.env.LINEAR_TEAM_ID || "";
if (!teamId) {
  console.log("❌ Set LINEAR_TEAM_ID to run integration test");
  console.log("\nUsage:");
  console.log("  LINEAR_TEAM_ID=your-team-id bun run linear-status.integration-test.ts");
  process.exit(1);
}

console.log("Testing team workflow validation...");
const missing = await validateTeamWorkflow(teamId);

if (missing.length > 0) {
  console.log(`⚠️  Missing states: ${missing.join(", ")}`);
  console.log("\nAdd these states to your Linear team workflow:");
  for (const state of missing) {
    console.log(`  - ${state}`);
  }
  process.exit(1);
}

console.log("✅ All required states present in team workflow\n");

console.log("Phase to State Mapping:");
const phases: SpecFirstPhase[] = ["propose", "specify", "plan", "implement", "release"];
for (const phase of phases) {
  const state = getExpectedState(phase);
  console.log(`  ${phase.padEnd(10)} → ${state}`);
}

console.log("\n✅ Linear Status Sync ready for use");
