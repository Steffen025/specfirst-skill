/**
 * Artifacts Unit Tests - SpecFirst 3.0
 * 
 * ISC #53: Unit tests achieve eighty percent line coverage
 * 
 * Tests artifact generation and validation logic.
 * 
 * @module tests/unit/artifacts
 * @version 3.0.0
 */

import { describe, it, expect } from "bun:test";
import { generateProposal, type SolutionApproach } from "../../artifacts/proposal";
import { generateSpec, type ParsedProposal } from "../../artifacts/spec";
import { generatePlan, type ParsedSpec } from "../../artifacts/plan";
import { generateTasks, type ParsedPlan } from "../../artifacts/tasks";

describe("Artifact Generators", () => {
  describe("generateProposal()", () => {
    it("should generate proposal with required sections", () => {
      const approaches: SolutionApproach[] = [
        {
          name: "Email-based reset",
          description: "Send reset link via email",
          pros: ["Simple", "Secure"],
          cons: ["Requires email access"],
          estimatedComplexity: "Medium"
        }
      ];
      
      const proposal = generateProposal(
        "password-reset",
        "Users cannot reset their passwords",
        approaches,
        "Email-based reset"
      );
      
      expect(proposal).toContain("# Proposal");
      expect(proposal).toContain("Users cannot reset their passwords");
    });

    it("should include problem statement section", () => {
      const approaches: SolutionApproach[] = [
        {
          name: "Solution",
          description: "Test",
          pros: [],
          cons: [],
          estimatedComplexity: "Low"
        }
      ];
      
      const proposal = generateProposal(
        "test-feature",
        "test problem statement",
        approaches,
        "Solution"
      );
      
      expect(proposal).toContain("## PROBLEM");
      expect(proposal).toContain("test problem statement");
    });

    it("should return valid markdown", () => {
      const approaches: SolutionApproach[] = [{
        name: "Test",
        description: "Test",
        pros: [],
        cons: [],
        estimatedComplexity: "Low"
      }];
      
      const proposal = generateProposal("test", "problem", approaches, "Test");
      
      // Should have markdown headers
      expect(proposal).toMatch(/^#\s/m);
      expect(proposal).toMatch(/^##\s/m);
    });
  });

  describe("generateSpec()", () => {
    it("should generate spec from parsed proposal", () => {
      const parsed: ParsedProposal = {
        featureName: "test-feature",
        problem: "Test problem",
        approaches: [{
          name: "Test",
          description: "Test approach",
          pros: [],
          cons: [],
          estimatedComplexity: "Low"
        }],
        recommended: "Test",
        antiPatterns: [],
        openQuestions: []
      };
      
      const spec = generateSpec("test-feature", parsed);
      
      expect(spec).toBeDefined();
      expect(spec.length).toBeGreaterThan(0);
    });
  });

  describe("generatePlan()", () => {
    it("should generate plan from parsed spec", () => {
      const parsed: ParsedSpec = {
        featureName: "test-feature",
        requirements: [{
          id: "REQ-1",
          description: "Test requirement",
          priority: "High",
          acceptance: ["Criterion works correctly"]
        }],
        userStories: [{
          id: "US-1",
          description: "User can do something",
          acceptanceCriteria: []
        }],
        technicalDesign: {
          architecture: [],
          dataModel: [],
          apiEndpoints: []
        },
        securityConsiderations: [],
        performanceRequirements: []
      };
      
      const plan = generatePlan("test-feature", parsed);
      
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThan(0);
    });
  });

  describe("generateTasks()", () => {
    it("should generate ISC tasks from parsed plan", () => {
      const parsed: ParsedPlan = {
        featureName: "test-feature",
        phases: [{
          name: "Phase 1",
          description: "Test phase",
          tasks: ["Task 1", "Task 2"],
          estimatedDuration: "1 day"
        }],
        architecture: {
          components: [],
          dataFlow: [],
          integrationPoints: []
        },
        dependencies: [],
        risks: []
      };
      
      const tasks = generateTasks("test-feature", parsed);
      
      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks).toContain("ISC TRACKER");
    });
  });

  describe("Basic Validation", () => {
    it("proposal generator returns valid markdown", () => {
      const approaches: SolutionApproach[] = [{
        name: "Test",
        description: "Test",
        pros: [],
        cons: [],
        estimatedComplexity: "Low"
      }];
      
      const proposal = generateProposal("test", "problem", approaches, "Test");
      
      expect(proposal).toMatch(/^#\s/m);
    });
  });
});
