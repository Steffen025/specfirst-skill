/**
 * Workflow Integration Tests - SpecFirst 3.0
 * 
 * ISC #54: Integration tests cover all six user stories
 * 
 * User Stories:
 * - US-001: Developer starts new feature specification
 * - US-002: Developer creates spec from proposal
 * - US-003: Developer generates implementation plan
 * - US-004: Developer generates ISC tasks
 * - US-005: Developer releases completed feature
 * - US-006: Developer resumes interrupted workflow
 * 
 * @module tests/integration/workflow
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { detectNextPhase, getWorkflowStatus } from "../../phases/orchestrator";
import { createPhaseCommit, isPhaseComplete } from "../../lib/git";
import { prerequisiteGate } from "../../gates/prerequisite";
import { artifactGate } from "../../gates/artifact";
import { ensureFeatureDirectories } from "../../lib/config";
import { existsSync } from "fs";
import { mkdir, writeFile, rm, copyFile } from "fs/promises";
import { join } from "path";

const FIXTURES_DIR = join(import.meta.dir, "../fixtures/test-feature");

let testCounter = 0;
function getUniqueFeatureName() {
  return `workflow-test-${Date.now()}-${testCounter++}`;
}

async function setupTestDir(featureName: string) {
  const specsDir = join(process.cwd(), ".specfirst", featureName, "specs");
  if (existsSync(specsDir)) {
    await rm(specsDir, { recursive: true, force: true });
  }
  await mkdir(specsDir, { recursive: true });
  return specsDir;
}

async function cleanupTestDir(featureName: string) {
  const baseDir = join(process.cwd(), ".specfirst", featureName);
  if (existsSync(baseDir)) {
    await rm(baseDir, { recursive: true, force: true });
  }
}

async function createConstitution(featureName: string) {
  const baseDir = join(process.cwd(), ".specfirst", featureName);
  await mkdir(baseDir, { recursive: true });
  const constitutionPath = join(baseDir, "CONSTITUTION.md");
  await writeFile(constitutionPath, `# Test Constitution

## Tech Stack
- TypeScript, Bun

## Quality Gates
- 80% test coverage required
`);
  return constitutionPath;
}

describe("User Story Integration Tests", () => {
  describe("US-001: Developer starts new feature specification", () => {
    it("should guide developer through initial setup", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        // Step 1: Developer tries to start without prerequisites
        const prereqCheck = await prerequisiteGate(testFeature);
        expect(prereqCheck.passed).toBe(false);
        expect(prereqCheck.error).toContain("Constitution");
        
        // Step 2: Developer creates constitution
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        // Step 3: Prerequisites now pass
        const prereqCheck2 = await prerequisiteGate(testFeature);
        expect(prereqCheck2.passed).toBe(true);
        
        // Step 4: System detects propose as first phase
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("propose");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should validate constitution exists before any work", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await artifactGate("propose", testFeature);
        
        expect(result.passed).toBe(false);
        expect(result.missingArtifacts).toBeDefined();
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("US-002: Developer creates spec from proposal", () => {
    it("should require proposal before allowing spec", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        // Try to run specify without proposal
        const artifactCheck = await artifactGate("specify", testFeature);
        
        expect(artifactCheck.passed).toBe(false);
        expect(artifactCheck.missingArtifacts!.some(a => a.includes("proposal"))).toBe(true);
        expect(artifactCheck.resolution).toContain("propose");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should allow specify after proposal created and committed", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Create and commit proposal
        const proposalPath = join(specsDir, "proposal.md");
        const fixtureProposal = await Bun.file(join(FIXTURES_DIR, "proposal.md")).text();
        await writeFile(proposalPath, fixtureProposal);
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        // Now specify should be allowed
        const artifactCheck = await artifactGate("specify", testFeature);
        expect(artifactCheck.passed).toBe(true);
        
        // And detected as next phase
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("specify");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("US-003: Developer generates implementation plan", () => {
    it("should require spec before allowing plan", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        // Try to run plan without spec
        const artifactCheck = await artifactGate("plan", testFeature);
        
        expect(artifactCheck.passed).toBe(false);
        expect(artifactCheck.missingArtifacts!.some(a => a.includes("spec"))).toBe(true);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should track propose->specify->plan progression", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Create proposal
        const proposalPath = join(specsDir, "proposal.md");
        const fixtureProposal = await Bun.file(join(FIXTURES_DIR, "proposal.md")).text();
        await writeFile(proposalPath, fixtureProposal);
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        // Create spec
        const specPath = join(specsDir, "spec.md");
        const fixtureSpec = await Bun.file(join(FIXTURES_DIR, "spec.md")).text();
        await writeFile(specPath, fixtureSpec);
        await createPhaseCommit("specify", testFeature, specPath);
        
        // Verify workflow status
        const status = await getWorkflowStatus(testFeature);
        expect(status.propose).toBe(true);
        expect(status.specify).toBe(true);
        expect(status.plan).toBe(false);
        
        // Next phase should be plan
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("plan");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("US-004: Developer generates ISC tasks", () => {
    it("should require plan before tasks", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        // Try to run implement without plan
        const artifactCheck = await artifactGate("implement", testFeature);
        
        expect(artifactCheck.passed).toBe(false);
        expect(artifactCheck.missingArtifacts!.some(a => a.includes("plan"))).toBe(true);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should generate tasks from plan", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Create proposal, spec, plan
        const proposalPath = join(specsDir, "proposal.md");
        await writeFile(proposalPath, await Bun.file(join(FIXTURES_DIR, "proposal.md")).text());
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        const specPath = join(specsDir, "spec.md");
        await writeFile(specPath, await Bun.file(join(FIXTURES_DIR, "spec.md")).text());
        await createPhaseCommit("specify", testFeature, specPath);
        
        const planPath = join(specsDir, "plan.md");
        await writeFile(planPath, await Bun.file(join(FIXTURES_DIR, "plan.md")).text());
        await createPhaseCommit("plan", testFeature, planPath);
        
        // Now implement should be next
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("implement");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("US-005: Developer releases completed feature", () => {
    it("should require all artifacts before release", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        // Try to release with nothing
        const artifactCheck = await artifactGate("release", testFeature);
        
        expect(artifactCheck.passed).toBe(false);
        expect(artifactCheck.missingArtifacts!.length).toBeGreaterThanOrEqual(4);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should only allow release after all phases complete", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Create all artifacts
        const proposalPath = join(specsDir, "proposal.md");
        await writeFile(proposalPath, await Bun.file(join(FIXTURES_DIR, "proposal.md")).text());
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        const specPath = join(specsDir, "spec.md");
        await writeFile(specPath, await Bun.file(join(FIXTURES_DIR, "spec.md")).text());
        await createPhaseCommit("specify", testFeature, specPath);
        
        const planPath = join(specsDir, "plan.md");
        await writeFile(planPath, await Bun.file(join(FIXTURES_DIR, "plan.md")).text());
        await createPhaseCommit("plan", testFeature, planPath);
        
        const tasksPath = join(specsDir, "tasks.md");
        await writeFile(tasksPath, await Bun.file(join(FIXTURES_DIR, "tasks.md")).text());
        await createPhaseCommit("implement", testFeature, tasksPath);
        
        // Now release should be next
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("release");
        
        // Verify all phases are complete
        const status = await getWorkflowStatus(testFeature);
        expect(status.propose).toBe(true);
        expect(status.specify).toBe(true);
        expect(status.plan).toBe(true);
        expect(status.implement).toBe(true);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("US-006: Developer resumes interrupted workflow", () => {
    it("should detect state from files after session kill", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Simulate work done before "kill"
        const proposalPath = join(specsDir, "proposal.md");
        await writeFile(proposalPath, await Bun.file(join(FIXTURES_DIR, "proposal.md")).text());
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        const specPath = join(specsDir, "spec.md");
        await writeFile(specPath, await Bun.file(join(FIXTURES_DIR, "spec.md")).text());
        await createPhaseCommit("specify", testFeature, specPath);
        
        // "Kill session" - all runtime state lost
        // Resume by detecting next phase
        const nextPhase = await detectNextPhase(testFeature);
        
        // Should detect plan as next
        expect(nextPhase).toBe("plan");
        
        // Verify previous phases detected as complete
        expect(await isPhaseComplete("propose", testFeature)).toBe(true);
        expect(await isPhaseComplete("specify", testFeature)).toBe(true);
        expect(await isPhaseComplete("plan", testFeature)).toBe(false);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should handle resume at any phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        const specsDir = await setupTestDir(testFeature);
        
        // Complete only propose
        const proposalPath = join(specsDir, "proposal.md");
        await writeFile(proposalPath, await Bun.file(join(FIXTURES_DIR, "proposal.md")).text());
        await createPhaseCommit("propose", testFeature, proposalPath);
        
        // Resume detection
        const nextPhase = await detectNextPhase(testFeature);
        expect(nextPhase).toBe("specify");
        
        const status = await getWorkflowStatus(testFeature);
        expect(status.propose).toBe(true);
        expect(status.specify).toBe(false);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });
});
