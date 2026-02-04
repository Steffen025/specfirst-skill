/**
 * Stateless Resumption Tests - SpecFirst 3.0
 * 
 * ISC #52: Phase resumption requires zero in memory state
 * 
 * Tests that phase resumption works without any in-memory state.
 * All state must be derived from git commits and artifact files.
 * Verifies no module-level mutable state exists.
 * 
 * @module tests/stateless-resumption
 * @version 3.0.0
 */

import { describe, it, expect } from "bun:test";
import { detectNextPhase, getWorkflowStatus } from "../phases/orchestrator";
import { isPhaseComplete } from "../lib/git";
import { existsSync } from "fs";
import { mkdir, rm, copyFile } from "fs/promises";
import { join } from "path";
import { createPhaseCommit } from "../lib/git";

const FIXTURES_DIR = join(import.meta.dir, "fixtures", "test-feature");

// Generate unique test feature names to avoid git commit pollution
let testCounter = 0;
function getUniqueFeatureName() {
  return `stateless-${Date.now()}-${testCounter++}`;
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

describe("Stateless Resumption", () => {
  it("should resume from any phase without runtime state", async () => {
    // Test resuming from each phase
    // Each test includes all previous phases to simulate realistic state
    const testCases = [
      {
        name: "After propose",
        phases: [{ phase: "propose" as const, artifact: "proposal" }],
        expected: "specify" as const,
      },
      {
        name: "After specify",
        phases: [
          { phase: "propose" as const, artifact: "proposal" },
          { phase: "specify" as const, artifact: "spec" },
        ],
        expected: "plan" as const,
      },
      {
        name: "After plan",
        phases: [
          { phase: "propose" as const, artifact: "proposal" },
          { phase: "specify" as const, artifact: "spec" },
          { phase: "plan" as const, artifact: "plan" },
        ],
        expected: "implement" as const,
      },
      {
        name: "After implement",
        phases: [
          { phase: "propose" as const, artifact: "proposal" },
          { phase: "specify" as const, artifact: "spec" },
          { phase: "plan" as const, artifact: "plan" },
          { phase: "implement" as const, artifact: "tasks" },
        ],
        expected: "release" as const,
      },
    ];
    
    for (const { name, phases, expected } of testCases) {
      const testFeature = getUniqueFeatureName();
      
      try {
        // Set up artifacts for all completed phases
        await setupTestDir(testFeature);
        
        for (const { phase, artifact } of phases) {
          const artifactPath = getTestArtifactPath(testFeature, artifact);
          await copyFile(join(FIXTURES_DIR, `${artifact}.md`), artifactPath);
          await createPhaseCommit(phase, testFeature, artifactPath);
        }
        
        // Resume with zero state
        const nextPhase = await detectNextPhase(testFeature);
        
        // Verify correct next phase
        expect(nextPhase).toBe(expected);
      } finally {
        await cleanupTestDir(testFeature);
      }
    }
  });

  it("should not rely on any module-level variables", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // This test verifies behavior is consistent across multiple calls
      // If module state existed, calling functions multiple times would produce different results
      await setupTestDir(testFeature);
      
      // Create proposal artifact
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      // Call detection multiple times
      const result1 = await detectNextPhase(testFeature);
      const result2 = await detectNextPhase(testFeature);
      const result3 = await detectNextPhase(testFeature);
      
      // All calls should produce identical results
      expect(result1).toBe("specify");
      expect(result2).toBe("specify");
      expect(result3).toBe("specify");
      
      // Same for status checks
      const status1 = await getWorkflowStatus(testFeature);
      const status2 = await getWorkflowStatus(testFeature);
      
      expect(status1).toEqual(status2);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should derive all state from git and artifacts", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Set up complete workflow state via git/artifacts
      await setupTestDir(testFeature);
      
      const artifacts = [
        { name: "proposal", phase: "propose" as const },
        { name: "spec", phase: "specify" as const },
        { name: "plan", phase: "plan" as const },
      ];
      
      // Create artifacts and commits
      for (const { name, phase } of artifacts) {
        const artifactPath = getTestArtifactPath(testFeature, name);
        await copyFile(join(FIXTURES_DIR, `${name}.md`), artifactPath);
        await createPhaseCommit(phase, testFeature, artifactPath);
      }
      
      // Now query state - should come entirely from git/fs
      const status = await getWorkflowStatus(testFeature);
      const nextPhase = await detectNextPhase(testFeature);
      
      // Verify state matches what we committed
      expect(status.propose).toBe(true);
      expect(status.specify).toBe(true);
      expect(status.plan).toBe(true);
      expect(status.implement).toBe(false);
      expect(status.release).toBe(false);
      expect(nextPhase).toBe("implement");
      
      // Each phase completion can be verified via git
      for (const { phase } of artifacts) {
        const complete = await isPhaseComplete(phase, testFeature);
        expect(complete).toBe(true);
      }
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should handle concurrent reads without state corruption", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Simulate multiple concurrent reads (as if multiple sessions/processes)
      await setupTestDir(testFeature);
      
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      // Launch multiple concurrent reads
      const reads = await Promise.all([
        detectNextPhase(testFeature),
        detectNextPhase(testFeature),
        detectNextPhase(testFeature),
        getWorkflowStatus(testFeature),
        getWorkflowStatus(testFeature),
      ]);
      
      // All should return consistent results
      expect(reads[0]).toBe("specify");
      expect(reads[1]).toBe("specify");
      expect(reads[2]).toBe("specify");
      expect(reads[3]).toEqual(reads[4]); // Both status objects identical
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should resume workflow without caching phase detection", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Verify detectNextPhase always queries files fresh
      await setupTestDir(testFeature);
      
      // Start with proposal
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      const phase1 = await detectNextPhase(testFeature);
      expect(phase1).toBe("specify");
      
      // Add spec artifact
      const specPath = getTestArtifactPath(testFeature, "spec");
      await copyFile(join(FIXTURES_DIR, "spec.md"), specPath);
      await createPhaseCommit("specify", testFeature, specPath);
      
      // Detection should immediately reflect new state
      const phase2 = await detectNextPhase(testFeature);
      expect(phase2).toBe("plan");
      
      // Not cached at "specify"
      expect(phase2).not.toBe(phase1);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });

  it("should work after process restart simulation", async () => {
    const testFeature = getUniqueFeatureName();
    
    try {
      // Phase 1: Create artifacts in "first session"
      await setupTestDir(testFeature);
      
      const proposalPath = getTestArtifactPath(testFeature, "proposal");
      await copyFile(join(FIXTURES_DIR, "proposal.md"), proposalPath);
      await createPhaseCommit("propose", testFeature, proposalPath);
      
      const firstSessionNext = await detectNextPhase(testFeature);
      
      // Phase 2: Simulate process restart by clearing all imports/state
      // In real scenario, this would be a full process restart
      // Here we just re-import and call functions fresh
      
      const { detectNextPhase: freshDetect, getWorkflowStatus: freshStatus } = await import("../phases/orchestrator");
      
      // "Second session" detection
      const secondSessionNext = await freshDetect(testFeature);
      const secondSessionStatus = await freshStatus(testFeature);
      
      // Should produce identical results
      expect(secondSessionNext).toBe(firstSessionNext);
      expect(secondSessionNext).toBe("specify");
      expect(secondSessionStatus.propose).toBe(true);
    } finally {
      await cleanupTestDir(testFeature);
    }
  });
});
