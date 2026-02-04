/**
 * Session Isolation Tests - SpecFirst 3.0
 * 
 * ISC #50: Session isolation verified through kill resume testing
 * 
 * Tests that SpecFirst can correctly detect workflow state after a simulated
 * session kill. All state must come from files (git commits, artifacts), with
 * no reliance on in-memory state.
 * 
 * @module tests/session-isolation
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { detectNextPhase, getWorkflowStatus } from "../phases/orchestrator";
import { isPhaseComplete, createPhaseCommit } from "../lib/git";
import { existsSync } from "fs";
import { mkdir, writeFile, rm, copyFile } from "fs/promises";
import { join } from "path";

const FIXTURES_DIR = join(import.meta.dir, "fixtures", "test-feature");

// Generate unique test feature names to avoid git commit pollution
let testCounter = 0;
function getUniqueFeatureName() {
  return `session-isolation-${Date.now()}-${testCounter++}`;
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

describe("Session Isolation", () => {
  it("should detect correct phase after simulated session kill", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // 1. Create test artifacts to simulate work done in previous session
      await setupTestDir(testFeature);
      
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      const fixtureProposal = await Bun.file(join(FIXTURES_DIR, "proposal.md")).text();
      await writeFile(proposalPath, fixtureProposal);
      
      // Create git commit to mark phase completion
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      // 2. "Kill" session - simulate by clearing any module-level state
      // In a real kill, all runtime state is lost
      // Here we just call detection functions fresh
      
      // 3. Resume with detectNextPhase() - should detect from files alone
      const nextPhase = await detectNextPhase(testFeature);
      
      // 4. Verify correct phase detected
      expect(nextPhase).toBe("specify"); // propose is done, specify is next
      
      // Verify propose phase is marked complete
      const proposeComplete = await isPhaseComplete("propose", testFeature);
      expect(proposeComplete).toBe(true);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should preserve all artifact content across sessions", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Create artifact with specific content
      await setupTestDir(testFeature);
      
      const originalContent = "# Original Content\nThis is test content for session isolation.";
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await writeFile(proposalPath, originalContent);
      
      // Commit the artifact
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      // "Kill session" - simulate by reading file fresh
      const resumedContent = await Bun.file(proposalPath).text();
      
      // Verify content is identical
      expect(resumedContent).toBe(originalContent);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should detect workflow state without any runtime context", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Simulate multiple phases completed
      await setupTestDir(testFeature);
      
      // Create proposal
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      const fixtureProposal = await Bun.file(join(FIXTURES_DIR, "proposal.md")).text();
      await writeFile(proposalPath, fixtureProposal);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      // Create spec
      const specPath = getTestArtifactPath(testFeature, "spec");
      const fixtureSpec = await Bun.file(join(FIXTURES_DIR, "spec.md")).text();
      await writeFile(specPath, fixtureSpec);
      await createPhaseCommit("specify", testFeature, specPath);
      
      // "Kill session" and detect state
      const status = await getWorkflowStatus(testFeature);
      
      // Verify state detected correctly from git/files
      expect(status.propose).toBe(true);
      expect(status.specify).toBe(true);
      expect(status.plan).toBe(false);
      expect(status.implement).toBe(false);
      expect(status.release).toBe(false);
      
      // Verify next phase detection
      const nextPhase = await detectNextPhase(testFeature);
      expect(nextPhase).toBe("plan");
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should handle empty state (no artifacts yet)", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // No artifacts created - fresh start
      const nextPhase = await detectNextPhase(testFeature);
      
      // Should detect propose as first phase
      expect(nextPhase).toBe("propose");
      
      // Verify no phases are complete
      const status = await getWorkflowStatus(testFeature);
      expect(status.propose).toBe(false);
      expect(status.specify).toBe(false);
      expect(status.plan).toBe(false);
      expect(status.implement).toBe(false);
      expect(status.release).toBe(false);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });
});
