/**
 * Integration Tests for Plan Phase - SpecFirst 3.0
 * 
 * Tests the complete plan phase workflow with file I/O.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { planPhase, type PlanInput } from "./plan";
import { getArtifactPath } from "../lib/config";

const TEST_FEATURE = "plan-phase-test";

/**
 * Helper to create all required prerequisite artifacts.
 */
async function createPrerequisites(featureName: string): Promise<void> {
  // Create constitution
  const constitutionPath = getArtifactPath(featureName, "constitution");
  const constitutionDir = constitutionPath.substring(0, constitutionPath.lastIndexOf("/"));
  await mkdir(constitutionDir, { recursive: true });
  await writeFile(constitutionPath, "# Test Constitution\n\nMock constitution for testing.", "utf-8");
  
  // Create proposal
  const proposalPath = getArtifactPath(featureName, "proposal");
  const proposalDir = proposalPath.substring(0, proposalPath.lastIndexOf("/"));
  await mkdir(proposalDir, { recursive: true });
  await writeFile(proposalPath, "# Test Proposal\n\nMock proposal for testing.", "utf-8");
  
  // Create spec
  const specPath = getArtifactPath(featureName, "spec");
  const specDir = specPath.substring(0, specPath.lastIndexOf("/"));
  await mkdir(specDir, { recursive: true });
  await writeFile(specPath, "# Test Spec\n\nMock spec for testing.", "utf-8");
}

describe("Plan Phase Integration Tests", () => {
  
  beforeAll(async () => {
    // Create prerequisites for main test feature
    await createPrerequisites(TEST_FEATURE);
  });
  
  afterAll(async () => {
    // Cleanup is handled by system - tests run in .claude/MEMORY/execution/Features
  });
  
  test("planPhase creates plan.md with all required sections", async () => {
    const input: PlanInput = {
      featureName: TEST_FEATURE,
      executiveSummary: "Integration test plan generation",
      adrs: [
        {
          id: "ADR-001",
          title: "Use TypeScript",
          status: "accepted",
          date: "2026-01-25",
          context: "Need type safety",
          decision: "Use TypeScript for all code",
          rationale: "Type safety reduces bugs",
          alternatives: [
            { name: "JavaScript", reason: "No type safety" }
          ],
          consequences: ["Better tooling", "Compilation step needed"]
        }
      ],
      implementationPhases: [
        {
          number: 1,
          name: "Foundation",
          objective: "Setup core infrastructure",
          deliverables: ["Type definitions", "Config files"],
          acceptanceCriteria: ["Types compile", "Config loads"],
          estimatedEffort: "2 days",
          dependencies: [],
          risks: ["TypeScript version compatibility"]
        },
        {
          number: 2,
          name: "Implementation",
          objective: "Build features",
          deliverables: ["Feature modules", "Tests"],
          acceptanceCriteria: ["All tests pass"],
          estimatedEffort: "5 days",
          dependencies: ["Phase 1"],
          risks: ["Breaking changes in dependencies", "Performance issues"]
        }
      ],
      testingStrategy: {
        unitTests: "Bun test framework",
        integrationTests: "Full workflow tests",
        e2eTests: "Manual verification",
        performanceTests: "Benchmark critical paths",
        coverageTarget: "80%"
      },
      risks: [
        {
          id: "R-001",
          description: "Scope creep",
          probability: "medium",
          impact: "high",
          mitigation: "Strict feature freeze after planning"
        }
      ],
      dependencies: [
        {
          name: "Bun runtime",
          type: "external",
          risk: "low",
          mitigation: "Pin to stable version"
        }
      ],
      rollbackProcedures: "Revert git commits and restore from backup"
    };
    
    const result = await planPhase(input);
    
    // Verify success
    expect(result.success).toBe(true);
    expect(result.artifactPath).toBeDefined();
    expect(result.error).toBeUndefined();
    
    // Verify file exists
    const planPath = getArtifactPath(TEST_FEATURE, "plan");
    expect(existsSync(planPath)).toBe(true);
    
    // Verify content
    const { readFile } = await import("fs/promises");
    const content = await readFile(planPath, "utf-8");
    
    // Check frontmatter
    expect(content).toContain("---");
    expect(content).toContain(`feature: ${TEST_FEATURE}`);
    
    // Check sections
    expect(content).toContain("## Executive Summary");
    expect(content).toContain("## Architecture Decision Records");
    expect(content).toContain("## Implementation Phases");
    expect(content).toContain("## Testing Strategy");
    expect(content).toContain("## Risk Matrix");
    expect(content).toContain("## Dependencies");
    expect(content).toContain("## Rollback Procedures");
    
    // Check phases (Criterion 27)
    expect(content).toContain("### Phase 1: Foundation");
    expect(content).toContain("### Phase 2: Implementation");
    
    // Check phase risks (Criterion 28)
    expect(content).toContain("TypeScript version compatibility");
    expect(content).toContain("Breaking changes in dependencies");
    expect(content).toContain("Performance issues");
  });
  
  test("planPhase fails when spec.md missing", async () => {
    const input: PlanInput = {
      featureName: "nonexistent-feature",
      executiveSummary: "Should fail",
      adrs: [],
      implementationPhases: [
        {
          number: 1,
          name: "Test",
          objective: "Test",
          deliverables: ["Test"],
          acceptanceCriteria: ["Test"],
          estimatedEffort: "1 day",
          dependencies: [],
          risks: ["Test risk"]
        }
      ],
      testingStrategy: {
        unitTests: "Test",
        integrationTests: "Test",
        e2eTests: "Test",
        performanceTests: "Test",
        coverageTarget: "80%"
      },
      risks: [],
      dependencies: [],
      rollbackProcedures: "Test"
    };
    
    const result = await planPhase(input);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Artifact gate failed");
  });
  
  test("planPhase fails when phase has no risks", async () => {
    // Create all prerequisites for this test
    const testFeature = `${TEST_FEATURE}-no-risks`;
    await createPrerequisites(testFeature);
    
    const input: PlanInput = {
      featureName: testFeature,
      executiveSummary: "Should fail validation",
      adrs: [],
      implementationPhases: [
        {
          number: 1,
          name: "Invalid Phase",
          objective: "Test",
          deliverables: ["Test"],
          acceptanceCriteria: ["Test"],
          estimatedEffort: "1 day",
          dependencies: [],
          risks: [] // INVALID - empty risks
        }
      ],
      testingStrategy: {
        unitTests: "Test",
        integrationTests: "Test",
        e2eTests: "Test",
        performanceTests: "Test",
        coverageTarget: "80%"
      },
      risks: [],
      dependencies: [],
      rollbackProcedures: "Test"
    };
    
    const result = await planPhase(input);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("missing risk assessment");
    expect(result.error).toContain("Criterion 28");
  });
});
