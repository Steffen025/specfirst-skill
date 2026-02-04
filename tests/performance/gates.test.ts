/**
 * Gate Performance Tests - SpecFirst 3.0
 * 
 * ISC #57: Performance tests verify gates under five seconds
 * 
 * Tests that all quality gates complete within performance requirements.
 * Each gate must execute in < 5 seconds to maintain fast feedback cycles.
 * 
 * @module tests/performance/gates
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { prerequisiteGate } from "../../gates/prerequisite";
import { artifactGate } from "../../gates/artifact";
import { validateISCFormat } from "../../gates/isc-format";
import { phaseCompleteGate } from "../../gates/phase-complete";
import { existsSync } from "fs";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const PERFORMANCE_THRESHOLD_MS = 5000; // 5 seconds max per gate
const FAST_THRESHOLD_MS = 100; // Most gates should be much faster

let testCounter = 0;
function getUniqueFeatureName() {
  return `perf-test-${Date.now()}-${testCounter++}`;
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
  await writeFile(constitutionPath, "# Test Constitution\n");
  return constitutionPath;
}

describe("Gate Performance", () => {
  describe("Prerequisite Gate Performance", () => {
    it("should complete in under 5 seconds when constitution missing", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await prerequisiteGate(testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Prerequisite gate (missing): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds when constitution exists", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        const startTime = performance.now();
        
        await prerequisiteGate(testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Prerequisite gate (exists): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should be fast for missing files (< 100ms)", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await prerequisiteGate(testFeature);
        
        const elapsed = performance.now() - startTime;
        
        // File existence checks should be extremely fast
        expect(elapsed).toBeLessThan(FAST_THRESHOLD_MS);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("Artifact Gate Performance", () => {
    it("should complete in under 5 seconds for propose phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await artifactGate("propose", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Artifact gate (propose): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds for specify phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await artifactGate("specify", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Artifact gate (specify): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds for plan phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await artifactGate("plan", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Artifact gate (plan): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds for implement phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await artifactGate("implement", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Artifact gate (implement): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds for release phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await artifactGate("release", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Artifact gate (release): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should handle multiple artifact checks quickly", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        // Release checks 5 artifacts - should still be fast
        await artifactGate("release", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        // Even checking 5 files should be under 100ms
        expect(elapsed).toBeLessThan(FAST_THRESHOLD_MS);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("ISC Format Gate Performance", () => {
    it("should complete in under 5 seconds for small ISC", async () => {
      const smallISC = `
## IDEAL
Test feature

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Criterion one has exactly eight words total | ⬜ | - |
| 2 | Criterion two also has exactly eight words | ⬜ | - |

## ANTI-CRITERIA

| ! | Anti-Criterion | Status |
|---|----------------|--------|
| 1 | System must not crash during normal operation | 👀 |

## PROGRESS
0/2 verified
`;
      
      const startTime = performance.now();
      
      validateISCFormat(smallISC);
      
      const elapsed = performance.now() - startTime;
      
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      console.log(`  ⏱️  ISC format gate (small): ${elapsed.toFixed(2)}ms`);
    });

    it("should complete in under 5 seconds for large ISC", async () => {
      // Generate 100 criteria (realistic large ISC)
      const criteria = Array.from({ length: 100 }, (_, i) => 
        `| ${i + 1} | Criterion number ${String(i + 1).padStart(2, '0')} has eight words | ⬜ | - |`
      ).join("\n");
      
      const largeISC = `
## IDEAL
Large feature test

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
${criteria}

## ANTI-CRITERIA

| ! | Anti-Criterion | Status |
|---|----------------|--------|
| 1 | System must not crash during normal operation | 👀 |

## PROGRESS
0/100 verified
`;
      
      const startTime = performance.now();
      
      validateISCFormat(largeISC);
      
      const elapsed = performance.now() - startTime;
      
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      console.log(`  ⏱️  ISC format gate (100 criteria): ${elapsed.toFixed(2)}ms`);
    });

    it("should handle minimal ISC quickly", async () => {
      const minimalISC = `
## IDEAL
Test

## ISC TRACKER

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Test criterion with exactly eight words here | ⬜ | - |

## ANTI-CRITERIA

| ! | Anti-Criterion | Status |
|---|----------------|--------|
| 1 | Must not fail during normal operation tests | 👀 |

## PROGRESS
0/1 verified
`;
      
      const startTime = performance.now();
      
      validateISCFormat(minimalISC);
      
      const elapsed = performance.now() - startTime;
      
      // Should be very fast
      expect(elapsed).toBeLessThan(FAST_THRESHOLD_MS);
    });
  });

  describe("Phase Complete Gate Performance", () => {
    it("should complete in under 5 seconds for propose phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await phaseCompleteGate("propose", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Phase complete gate (propose): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should complete in under 5 seconds for specify phase", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        await phaseCompleteGate("specify", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        console.log(`  ⏱️  Phase complete gate (specify): ${elapsed.toFixed(2)}ms`);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });

    it("should handle git operations efficiently", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const startTime = performance.now();
        
        // Even with git log checks, should be fast
        await phaseCompleteGate("plan", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        // Git operations add overhead but should still be reasonable
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("Combined Gate Performance", () => {
    it("should run all gates in sequence under total time budget", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        await createConstitution(testFeature);
        await setupTestDir(testFeature);
        
        const startTime = performance.now();
        
        // Run all gates as they would be in real workflow
        await prerequisiteGate(testFeature);
        await artifactGate("propose", testFeature);
        await phaseCompleteGate("propose", testFeature);
        
        const elapsed = performance.now() - startTime;
        
        // Combined execution should still be fast
        // 3 gates * 5s max = 15s budget, but should be much faster
        expect(elapsed).toBeLessThan(15000);
        console.log(`  ⏱️  All gates combined: ${elapsed.toFixed(2)}ms`);
        
        // In practice, should be under 1 second for missing files
        expect(elapsed).toBeLessThan(1000);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });

  describe("Performance Regression Detection", () => {
    it("should maintain consistent performance across runs", async () => {
      const testFeature = getUniqueFeatureName();
      
      try {
        const timings: number[] = [];
        
        // Run same test 5 times
        for (let i = 0; i < 5; i++) {
          const startTime = performance.now();
          await prerequisiteGate(testFeature);
          const elapsed = performance.now() - startTime;
          timings.push(elapsed);
        }
        
        // Calculate variance
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        const variance = timings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / timings.length;
        const stdDev = Math.sqrt(variance);
        
        console.log(`  📊 Average: ${avg.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`);
        
        // Consistency check: standard deviation should be small
        // If stdDev is > 50% of average, performance is inconsistent
        expect(stdDev).toBeLessThan(avg * 0.5);
      } finally {
        await cleanupTestDir(testFeature);
      }
    });
  });
});
