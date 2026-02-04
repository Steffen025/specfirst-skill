/**
 * Gates Unit Tests - SpecFirst 3.0
 * 
 * ISC #53: Unit tests achieve eighty percent line coverage
 * 
 * Tests all gate validation logic: prerequisite, artifact, isc-format, phase-complete.
 * 
 * @module tests/unit/gates
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { prerequisiteGate } from "../../gates/prerequisite";
import { artifactGate } from "../../gates/artifact";
import { validateISCFormat } from "../../gates/isc-format";
import { phaseCompleteGate } from "../../gates/phase-complete";
import { existsSync } from "fs";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { join } from "path";

const TEST_FIXTURES_DIR = join(import.meta.dir, "../fixtures/test-feature");

// Test feature helpers
let testCounter = 0;
function getUniqueFeatureName() {
  return `gates-test-${Date.now()}-${testCounter++}`;
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

describe("Gates", () => {
  describe("Prerequisite Gate", () => {
    it("should fail when constitution is missing", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await prerequisiteGate(testFeature);
        
        expect(result.passed).toBe(false);
        expect(result.error).toContain("Constitution file missing");
        expect(result.resolution).toBeDefined();
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should provide resolution guidance for missing constitution", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await prerequisiteGate(testFeature);
        
        expect(result.resolution).toContain("CONSTITUTION.md");
        expect(result.resolution).toContain("Project Constitution");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("Artifact Gate", () => {
    it("should check for constitution in propose phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        // Without constitution, should fail
        const result = await artifactGate("propose", testFeature);
        
        expect(result.passed).toBe(false);
        expect(result.missingArtifacts).toBeDefined();
        expect(result.missingArtifacts!.some(a => a.includes("constitution"))).toBe(true);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should fail specify phase without proposal", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await artifactGate("specify", testFeature);
        
        expect(result.passed).toBe(false);
        expect(result.missingArtifacts).toBeDefined();
        expect(result.missingArtifacts!.some(a => a.includes("proposal"))).toBe(true);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should list all missing artifacts", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await artifactGate("plan", testFeature);
        
        expect(result.passed).toBe(false);
        expect(result.missingArtifacts).toBeDefined();
        expect(result.missingArtifacts!.length).toBeGreaterThanOrEqual(2);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should suggest previous phase in resolution", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await artifactGate("specify", testFeature);
        
        expect(result.resolution).toContain("propose");
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("ISC Format Gate", () => {
    it("should fail for invalid ISC format", async () => {
      const invalidISC = `
# Invalid ISC

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | This criterion is way too long and exceeds eight words limit | ⬜ | - |
`;
      
      const result = validateISCFormat(invalidISC);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should pass for valid ISC format", async () => {
      const validISC = `
## IDEAL
Test feature working correctly with all functionality

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Criterion one has exactly eight words total | ⬜ | - |
| 2 | Criterion two also has exactly eight words | ⬜ | - |

## ANTI-CRITERIA

| ! | Anti-Criterion | Status |
|---|----------------|--------|
| 1 | System must not crash on invalid input | 👀 |

## PROGRESS
0/2 verified
`;
      
      const result = validateISCFormat(validISC);
      
      if (!result.passed) {
        console.log("Validation errors:", result.errors);
        console.log("Validation warnings:", result.warnings);
      }
      
      expect(result.passed).toBe(true);
    });

    it("should detect word count violations", async () => {
      const invalidISC = `
## IDEAL
Test

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | This has way too many words and will definitely fail | ⬜ | - |

## ANTI-CRITERIA

| ! | Anti-Criterion | Status |
|---|----------------|--------|
| 1 | Test anti-criterion with correct length words | 👀 |

## PROGRESS
0/1 verified
`;
      
      const result = validateISCFormat(invalidISC);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes("word"))).toBe(true);
    });

    it("should detect missing required sections", async () => {
      const invalidISC = `
# Tasks

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Criterion one has exactly eight words total | ⬜ | - |
`;
      
      const result = validateISCFormat(invalidISC);
      
      expect(result.passed).toBe(false);
      // Missing IDEAL, ANTI-CRITERIA, PROGRESS sections
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Phase Complete Gate", () => {
    it("should fail when phase not committed", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await phaseCompleteGate("propose", testFeature);
        
        // Will fail either because artifact doesn't exist or not committed
        expect(result.passed).toBe(false);
        expect(result.error).toBeDefined();
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should provide resolution guidance", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const result = await phaseCompleteGate("propose", testFeature);
        
        // Should provide some resolution guidance
        expect(result.resolution).toBeDefined();
        expect(result.resolution!.length).toBeGreaterThan(0);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("Gate Performance", () => {
    it("all gates should complete quickly", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        // Run all gates (they will fail but should be fast)
        await prerequisiteGate(testFeature);
        await artifactGate("propose", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        // Each gate should be well under 5 seconds
        // Combined should be under 1 second for missing files
        expect(elapsed).toBeLessThan(1000);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });
});
