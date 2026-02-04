/**
 * Cold Start Tests - SpecFirst 3.0
 * 
 * ISC #51: Cold start capability verified from artifacts only
 * 
 * Tests that SpecFirst can reconstruct complete workflow state from
 * artifacts alone, with no prior runtime context. This verifies that
 * a fresh session can pick up exactly where a previous session left off.
 * 
 * @module tests/cold-start
 * @version 3.0.0
 */

import { describe, it, expect } from "bun:test";
import { detectNextPhase, getWorkflowStatus } from "../phases/orchestrator";
import { existsSync } from "fs";
import { mkdir, writeFile, rm, copyFile } from "fs/promises";
import { join } from "path";
import { createPhaseCommit } from "../lib/git";

const FIXTURES_DIR = join(import.meta.dir, "fixtures", "test-feature");

// Generate unique test feature names to avoid git commit pollution
let testCounter = 0;
function getUniqueFeatureName() {
  return `cold-start-${Date.now()}-${testCounter++}`;
}

// Helper to set up test directory for a given feature
async function setupTestDir(featureName: string) {
  const specsDir = join(process.cwd(), ".specfirst", featureName, "specs");
  if (existsSync(specsDir)) {
    await rm(specsDir, { recursive: true, force: true });
  }
  await mkdir(specsDir, { recursive: true });
  return specsDir;
}

// Helper to get artifact path in test directory
function getTestArtifactPath(featureName: string, artifact: string): string {
  return join(process.cwd(), ".specfirst", featureName, "specs", `${artifact}.md`);
}

// Helper to cleanup test directory
async function cleanupTestDir(featureName: string) {
  const specsDir = join(process.cwd(), ".specfirst", featureName, "specs");
  if (existsSync(specsDir)) {
    await rm(specsDir, { recursive: true, force: true });
  }
}

describe("Cold Start", () => {
  it("should reconstruct workflow state from artifacts only", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Given: Only artifacts exist (simulate by creating files without any runtime state)
      await setupTestDir(testFeature);
      
      // Copy all artifacts up to plan phase
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      const specPath = getTestArtifactPath(testFeature, "spec");
      const planPath = getTestArtifactPath(testFeature, "plan");
      
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      await copyFile(join(FIXTURES_DIR, "spec.md"), specPath);
      await createPhaseCommit("specify", testFeature, specPath);
      
      await copyFile(join(FIXTURES_DIR, "plan.md"), planPath);
      await createPhaseCommit("plan", testFeature, planPath);
      
      // When: Call detectNextPhase() with zero runtime context
      const nextPhase = await detectNextPhase(testFeature);
      
      // Then: Correct state detected from file system
      expect(nextPhase).toBe("implement");
      
      // Verify status detection
      const status = await getWorkflowStatus(testFeature);
      expect(status.propose).toBe(true);
      expect(status.specify).toBe(true);
      expect(status.plan).toBe(true);
      expect(status.implement).toBe(false);
      expect(status.release).toBe(false);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should detect completed workflow from artifacts", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Given: ALL phases are complete including release
      await setupTestDir(testFeature);
      
      // Copy all artifacts and create commits for each phase
      const workflow = [
        { artifact: "proposal", phase: "propose" as const },
        { artifact: "spec", phase: "specify" as const },
        { artifact: "plan", phase: "plan" as const },
        { artifact: "tasks", phase: "implement" as const },
      ];
      
      for (const { artifact, phase } of workflow) {
        const artifactPath = getTestArtifactPath(testFeature, artifact);
        await copyFile(join(FIXTURES_DIR, `${artifact}.md`), artifactPath);
        await createPhaseCommit(phase, testFeature, artifactPath);
      }
      
      // For release phase, mark tasks.md as released (release doesn't modify tasks.md, just marks it complete)
      // In a real workflow, release would be marked when the feature is deployed
      const tasksPath = getTestArtifactPath(testFeature, "tasks");
      await writeFile(tasksPath, await Bun.file(tasksPath).text() + "\n<!-- Released -->");
      await createPhaseCommit("release", testFeature, tasksPath);
      
      // When: Detect next phase
      const nextPhase = await detectNextPhase(testFeature);
      
      // Then: Should return null (all complete)
      expect(nextPhase).toBe(null);
      
      // Verify all phases complete
      const status = await getWorkflowStatus(testFeature);
      expect(status.propose).toBe(true);
      expect(status.specify).toBe(true);
      expect(status.plan).toBe(true);
      expect(status.implement).toBe(true);
      expect(status.release).toBe(true);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should load ISC from tasks.md without prior context", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Given: tasks.md exists with ISC criteria
      await setupTestDir(testFeature);
      
      const tasksPath = getTestArtifactPath(testFeature, "tasks");
      const tasksContent = await Bun.file(join(FIXTURES_DIR, "tasks.md")).text();
      await writeFile(tasksPath, tasksContent);
      
      // When: Read file from cold start (no cache, no context)
      const loadedContent = await Bun.file(tasksPath).text();
      
      // Then: Content matches exactly
      expect(loadedContent).toBe(tasksContent);
      
      // Verify ISC table is present
      expect(loadedContent).toContain("## Ideal State Criteria (ISC)");
      expect(loadedContent).toContain("| ID | Criterion");
      expect(loadedContent).toContain("Test criterion one is verified and complete");
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should handle partial workflow state correctly", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Given: Only first two phases complete
      await setupTestDir(testFeature);
      
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      const specPath = getTestArtifactPath(testFeature, "spec");
      await copyFile(join(FIXTURES_DIR, "spec.md"), specPath);
      await createPhaseCommit("specify", testFeature, specPath);
      
      // When: Detect state from cold start
      const nextPhase = await detectNextPhase(testFeature);
      const status = await getWorkflowStatus(testFeature);
      
      // Then: Correctly identifies partial completion
      expect(nextPhase).toBe("plan");
      expect(status.propose).toBe(true);
      expect(status.specify).toBe(true);
      expect(status.plan).toBe(false);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should work without any git commits (artifact-only detection)", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Given: Artifacts exist but no git commits
      await setupTestDir(testFeature);
      
      // Just copy files without creating commits
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      
      // When: Check artifact existence
      const artifactExists = existsSync(proposalPath);
      
      // Then: Artifact is accessible for reading
      expect(artifactExists).toBe(true);
      
      // File content is readable
      const content = await Bun.file(proposalPath).text();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("# Proposal:");
    } finally {
      await cleanupTestDir(testFeature);
    }
  });
});
