/**
 * Self-test for Linear Status Sync
 * 
 * Run with: bun test linear-status.test.ts
 * 
 * Tests ISC 39-43:
 * - Phase to state mapping is correct
 * - Graceful degradation when Linear unavailable
 * - Error handling for missing states
 */

import { describe, it, expect } from "bun:test";
import {
  getExpectedState,
  syncPhaseStatus,
  syncAllPhases,
  validateTeamWorkflow,
  type SpecFirstPhase,
} from "./linear-status";

describe("Linear Status Sync", () => {
  describe("Phase to State Mapping", () => {
    it("ISC 39: propose → Specified", () => {
      expect(getExpectedState("propose")).toBe("Specified");
    });

    it("ISC 40: specify → Planned", () => {
      expect(getExpectedState("specify")).toBe("Planned");
    });

    it("ISC 41: plan → Ready for Dev", () => {
      expect(getExpectedState("plan")).toBe("Ready for Dev");
    });

    it("ISC 42: implement → In Progress", () => {
      expect(getExpectedState("implement")).toBe("In Progress");
    });

    it("ISC 43: release → Done", () => {
      expect(getExpectedState("release")).toBe("Done");
    });
  });

  describe("Graceful Degradation", () => {
    it("handles Linear not configured", async () => {
      // Save current token
      const originalToken = process.env.LINEAR_API_TOKEN;
      
      // Temporarily unset
      delete process.env.LINEAR_API_TOKEN;

      const result = await syncPhaseStatus(
        "test-issue-id",
        "propose",
        "test-team-id"
      );

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toContain("not configured");

      // Restore token
      if (originalToken) {
        process.env.LINEAR_API_TOKEN = originalToken;
      }
    });

    it("syncAllPhases handles empty array", async () => {
      const results = await syncAllPhases(
        "test-issue-id",
        [],
        "test-team-id"
      );

      expect(results).toEqual([]);
    });

    it("syncAllPhases syncs only latest phase", async () => {
      // Save current token
      const originalToken = process.env.LINEAR_API_TOKEN;
      delete process.env.LINEAR_API_TOKEN;

      const phases: SpecFirstPhase[] = ["propose", "specify", "plan"];
      const results = await syncAllPhases(
        "test-issue-id",
        phases,
        "test-team-id"
      );

      // Should only sync the latest phase
      expect(results.length).toBe(1);
      expect(results[0].phase).toBe("plan");

      // Restore token
      if (originalToken) {
        process.env.LINEAR_API_TOKEN = originalToken;
      }
    });
  });

  describe("Validation", () => {
    it("validateTeamWorkflow returns empty when Linear unavailable", async () => {
      const originalToken = process.env.LINEAR_API_TOKEN;
      delete process.env.LINEAR_API_TOKEN;

      const missing = await validateTeamWorkflow("test-team-id");
      expect(missing).toEqual([]);

      if (originalToken) {
        process.env.LINEAR_API_TOKEN = originalToken;
      }
    });
  });
});

/**
 * Run integration test with:
 * LINEAR_TEAM_ID=your-team-id bun run linear-status.integration-test.ts
 */
