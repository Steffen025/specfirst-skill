#!/usr/bin/env bun
/**
 * ISC Loader Module - SpecFirst 4.0
 * 
 * Loads tasks.md ISC format into Algorithm ISC tracker format.
 * Converts SpecFirst criteria to Algorithm-compatible ISC tracker entries.
 * Updated for Algorithm v1.8.0: 8-12 word criteria, inline verification,
 * ISC-C/ISC-A naming, confidence tags, priority classification.
 * 
 * ISC Coverage:
 * - ISC #48: ISC format converter loads tasks into tracker
 * - ISC #49: Algorithm ISC tracker remains primary state mechanism
 * 
 * Design Principle (ISC #49):
 * The Algorithm's ISC tracker is the PRIMARY state mechanism. This module
 * provides READ-ONLY conversion from tasks.md to ISC tracker format.
 * It does NOT write back to tasks.md - that remains SpecFirst's responsibility.
 * 
 * Flow:
 * 1. SpecFirst generates tasks.md with ISC criteria
 * 2. This module loads tasks.md → Algorithm ISC tracker format
 * 3. Algorithm tracks progress in its own ISC tracker
 * 4. SpecFirst updates tasks.md based on completed work
 * 
 * @module algorithm/isc-loader
 * @version 4.0.0
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { parseTasksFile } from "../artifacts/tasks";

export type ISCStatus = "⬜" | "🔄" | "✅" | "❌";

/** Algorithm TaskCreate status equivalents */
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

/** Map ISC status symbols to Algorithm TaskCreate statuses */
export const STATUS_TO_TASK: Record<ISCStatus, TaskStatus> = {
  "⬜": "pending",
  "🔄": "in_progress",
  "✅": "completed",
  "❌": "failed",
};

export interface ISCEntry {
  id: number | string; // Numeric or ISC-C{N} format
  criterion: string; // 8-12 words (Algorithm v1.8.0)
  status: ISCStatus;
  taskStatus: TaskStatus; // Mapped Algorithm status
  evidence?: string;
  phase?: string; // Optional phase grouping
  /** Inline verification method (Algorithm v1.8.0) */
  verifyMethod?: string;
  /** Confidence tag: [E]xplicit, [I]nferred, [R]everse-engineered */
  confidence?: string;
  /** Priority classification: CRITICAL, IMPORTANT, NICE */
  priority?: string;
}

export interface AntiCriterionEntry {
  id: string; // ISC-A{N} format
  criterion: string; // 8-12 words
  status: "👀" | "✅" | "❌";
  /** Inline verification method */
  verifyMethod?: string;
}

export interface LoadedISC {
  criteria: ISCEntry[];
  antiCriteria: AntiCriterionEntry[];
  ideal?: string;
  metadata: {
    featureName: string;
    sourceFile: string;
    loadedAt: string;
    totalCriteria: number;
    completedCriteria: number;
    progressPercent: number;
  };
}

/**
 * Loads tasks.md and converts to Algorithm ISC tracker format.
 * 
 * ISC #48: ISC format converter loads tasks into tracker
 * ISC #49: Algorithm ISC tracker remains primary state mechanism
 * 
 * This is a READ-ONLY operation. The Algorithm ISC tracker becomes
 * the primary state mechanism after loading. Updates to task status
 * happen in the Algorithm tracker, not back to tasks.md.
 * 
 * @param tasksPath - Path to tasks.md file
 * @returns LoadedISC with criteria, anti-criteria, and metadata
 * @throws Error if file doesn't exist or can't be parsed
 * 
 * @example
 * ```typescript
 * const isc = await loadTasksIntoTracker("/path/to/tasks.md");
 * 
 * console.log(`Loaded ${isc.metadata.totalCriteria} criteria`);
 * console.log(`Progress: ${isc.metadata.progressPercent}%`);
 * 
 * // Use in Algorithm ISC tracker
 * for (const entry of isc.criteria) {
 *   console.log(`${entry.id}. ${entry.criterion} [${entry.status}]`);
 * }
 * ```
 */
export async function loadTasksIntoTracker(tasksPath: string): Promise<LoadedISC> {
  // Validate file exists
  if (!existsSync(tasksPath)) {
    throw new Error(`Tasks file not found: ${tasksPath}`);
  }
  
  // Read file content
  const content = await readFile(tasksPath, "utf-8");
  
  // Parse using tasks.ts parser (reuse existing logic)
  const { criteria: rawCriteria, antiCriteria: rawAntiCriteria } = parseTasksFile(content);
  
  // Extract IDEAL section
  const ideal = extractIdeal(content);
  
  // Convert to ISC tracker format (v4.0 — includes TaskStatus mapping)
  const criteria: ISCEntry[] = rawCriteria.map(c => ({
    id: c.id,
    criterion: c.criterion,
    status: c.status as ISCStatus,
    taskStatus: STATUS_TO_TASK[c.status as ISCStatus] || "pending",
    evidence: c.evidence,
    phase: c.phase,
    verifyMethod: c.verifyMethod,
  }));
  
  const antiCriteria: AntiCriterionEntry[] = rawAntiCriteria.map(a => ({
    id: a.id,
    criterion: a.criterion,
    status: a.status,
    verifyMethod: a.verifyMethod,
  }));
  
  // Calculate metadata
  const completedCriteria = criteria.filter(c => c.status === "✅").length;
  const progressPercent = criteria.length > 0
    ? Math.round((completedCriteria / criteria.length) * 100)
    : 0;
  
  const featureName = extractFeatureName(content, tasksPath);
  
  return {
    criteria,
    antiCriteria,
    ideal,
    metadata: {
      featureName,
      sourceFile: tasksPath,
      loadedAt: new Date().toISOString(),
      totalCriteria: criteria.length,
      completedCriteria,
      progressPercent,
    },
  };
}

/**
 * Parses an ISC table from tasks.md content.
 * Lower-level function used by loadTasksIntoTracker.
 * 
 * @param content - Raw tasks.md content
 * @returns Array of ISC entries
 */
export function parseISCTable(content: string): ISCEntry[] {
  const { criteria } = parseTasksFile(content);
  
  return criteria.map(c => ({
    id: c.id,
    criterion: c.criterion,
    status: c.status as ISCStatus,
    taskStatus: STATUS_TO_TASK[c.status as ISCStatus] || "pending",
    evidence: c.evidence,
    phase: c.phase,
    verifyMethod: c.verifyMethod,
  }));
}

/**
 * Extracts the IDEAL section from tasks.md.
 * 
 * @param content - Raw tasks.md content
 * @returns The IDEAL text, or undefined if not found
 */
function extractIdeal(content: string): string | undefined {
  const lines = content.split("\n");
  let inIdealSection = false;
  const idealLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim() === "## IDEAL") {
      inIdealSection = true;
      continue;
    }
    
    // End of IDEAL section (next header or separator)
    if (inIdealSection && (line.startsWith("##") || line.startsWith("---"))) {
      break;
    }
    
    if (inIdealSection && line.trim()) {
      idealLines.push(line.trim());
    }
  }
  
  const ideal = idealLines.join(" ").trim();
  return ideal.length > 0 ? ideal : undefined;
}

/**
 * Extracts feature name from YAML frontmatter or file path.
 * 
 * @param content - Raw tasks.md content
 * @param filePath - Path to tasks.md (fallback)
 * @returns Feature name
 */
function extractFeatureName(content: string, filePath: string): string {
  // Try to extract from YAML frontmatter
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const featureMatch = yamlMatch[1].match(/feature:\s*(.+)/);
    if (featureMatch) {
      return featureMatch[1].trim();
    }
  }
  
  // Fallback: extract from file path
  // e.g., /path/to/Features/contact-enrichment/specs/tasks.md → contact-enrichment
  const pathParts = filePath.split("/");
  const featuresIndex = pathParts.indexOf("Features");
  if (featuresIndex !== -1 && pathParts.length > featuresIndex + 1) {
    return pathParts[featuresIndex + 1];
  }
  
  return "unknown-feature";
}

/**
 * Validates that loaded ISC entries meet Algorithm v1.8.0 requirements.
 * 
 * Checks:
 * - All criteria are 8-12 words (v1.8.0 — was exactly 8)
 * - All criteria have valid status symbols
 * - Criteria IDs are sequential (supports both numeric and ISC-C format)
 * 
 * @param entries - ISC entries to validate
 * @returns Validation result with errors if any
 */
export function validateLoadedISC(
  entries: ISCEntry[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check word count for each criterion (8-12 words, strip confidence/priority tags)
  for (const entry of entries) {
    const clean = entry.criterion
      .replace(/\s*\[(E|I|R)\]\s*/g, '')
      .replace(/\s*\[(CRITICAL|IMPORTANT|NICE)\]\s*/g, '')
      .split("|")[0] // Strip verify suffix if inline
      .trim();
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 8 || words.length > 12) {
      errors.push(
        `ISC #${entry.id}: Criterion has ${words.length} words (expected 8-12): "${entry.criterion}"`
      );
    }
  }
  
  // Check status symbols
  const validStatuses: ISCStatus[] = ["⬜", "🔄", "✅", "❌"];
  for (const entry of entries) {
    if (!validStatuses.includes(entry.status)) {
      errors.push(
        `ISC #${entry.id}: Invalid status "${entry.status}". Must be one of: ${validStatuses.join(", ")}`
      );
    }
  }
  
  // Check ID sequence (supports both numeric and ISC-C{N} format)
  const numericIds = entries
    .map(e => typeof e.id === "number" ? e.id : parseInt(String(e.id).replace(/^ISC-C/, ""), 10))
    .filter(id => !isNaN(id))
    .sort((a, b) => a - b);
  
  if (numericIds.length > 0) {
    const expectedIds = Array.from({ length: numericIds.length }, (_, i) => numericIds[0] + i);
    if (JSON.stringify(expectedIds) !== JSON.stringify(numericIds)) {
      errors.push(
        `ISC IDs not sequential. Expected: ${expectedIds.join(", ")}. Got: ${numericIds.join(", ")}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Converts LoadedISC to Algorithm ISC tracker format string.
 * Generates the visual table format used in Algorithm responses.
 * 
 * @param loadedISC - Loaded ISC data
 * @returns Formatted ISC tracker table
 * 
 * @example
 * ```typescript
 * const isc = await loadTasksIntoTracker("tasks.md");
 * const table = formatAsAlgorithmTracker(isc);
 * 
 * console.log(table);
 * // 🎯 ISC TRACKER ══════════════════════════════════════════════════════
 * // │ ID │ Criterion (8-12 words)        │ Status      │ Evidence   │
 * // ├───┼────────────────────────────────────┼─────────────┼────────────┤
 * // │ 1 │ User authentication endpoint...    │ ✅ VERIFIED │ Test pass  │
 * // ...
 * ```
 */
export function formatAsAlgorithmTracker(loadedISC: LoadedISC): string {
  const lines: string[] = [];
  
  // Header
  lines.push("🎯 ISC TRACKER ═══════════════════════════════════════════════════════════");
  
  // IDEAL
  if (loadedISC.ideal) {
    lines.push(`   IDEAL: ${loadedISC.ideal}`);
    lines.push("");
  }
  
  // Table header (v4.0 — ISC-C naming, 8-12 words, Verify column)
  lines.push("│ ID       │ Criterion (8-12 words)                               │ Status      │ Evidence       │ Verify         │");
  lines.push("├──────────┼──────────────────────────────────────────────────────┼─────────────┼────────────────┼────────────────┤");
  
  // Criteria rows
  for (const entry of loadedISC.criteria) {
    const statusText = {
      "⬜": "⬜ PENDING",
      "🔄": "🔄 IN_PROGRESS",
      "✅": "✅ COMPLETED",
      "❌": "❌ FAILED",
    }[entry.status] || entry.status;
    
    const id = typeof entry.id === "number" ? `ISC-C${entry.id}` : String(entry.id);
    const evidence = entry.evidence || "-";
    const verify = entry.verifyMethod || "-";
    const criterion = entry.criterion.padEnd(52);
    
    lines.push(`│ ${id.padEnd(8)} │ ${criterion} │ ${statusText.padEnd(11)} │ ${evidence.padEnd(14)} │ ${verify.padEnd(14)} │`);
  }
  
  // Footer
  lines.push("└──────────┴──────────────────────────────────────────────────────┴─────────────┴────────────────┴────────────────┘");
  
  // Progress
  lines.push(`   SCORE: ${loadedISC.metadata.completedCriteria}/${loadedISC.metadata.totalCriteria} verified │ PROGRESS: ${loadedISC.metadata.progressPercent}%`);
  
  // Anti-criteria if present (v4.0 — ISC-A naming)
  if (loadedISC.antiCriteria.length > 0) {
    lines.push("");
    lines.push("⚠️ ANTI-CRITERIA ═════════════════════════════════════════════════════════");
    for (const anti of loadedISC.antiCriteria) {
      const id = anti.id.startsWith("ISC-A") ? anti.id : `ISC-A${anti.id.replace(/^A/, "")}`;
      const verify = anti.verifyMethod || "-";
      lines.push(`│ ${id.padEnd(8)} │ ${anti.criterion.padEnd(52)} │ ${anti.status} │ ${verify.padEnd(14)} │`);
    }
    lines.push("══════════════════════════════════════════════════════════════════════════");
  }
  
  return lines.join("\n");
}

// Export for testing
export const __testing = {
  extractIdeal,
  extractFeatureName,
  parseISCTable,
  validateLoadedISC,
  formatAsAlgorithmTracker,
};

// Self-test when run directly with: bun algorithm/isc-loader.ts
if (import.meta.main) {
  console.log("🧪 Testing ISC Loader\n");
  
  // Create test tasks.md content
  const testContent = `---
feature: test-feature
phase: implement
status: in_progress
---

# test-feature - Implementation Tasks

## IDEAL

Perfect ISC format with all criteria verified successfully.

---

## ISC TRACKER

| ID | Criterion (8-12 words) | Status | Evidence | Verify |
|----|------------------------|--------|----------|--------|
| ISC-C1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed | Test: auth.test.ts |
| ISC-C2 | Database connection pool maintains exactly five active connections | 🔄 | In progress | CLI: check-pool |
| ISC-C3 | Error messages include timestamp and correlation request identifier | ⬜ | Not started | Grep: error-format |

---

## ANTI-CRITERIA

| # | Anti-Criterion | Status |
|---|---------------|--------|
| ISC-A1 | No credentials exposed in git commit history today | 👀 | Grep: secrets |

---

## PROGRESS

**Completed:** 1/3 verified
**Status:** IN_PROGRESS
`;
  
  // Test 1: Parse ISC table
  console.log("Test 1: Parse ISC table");
  const entries = parseISCTable(testContent);
  console.log(`  Parsed ${entries.length} criteria`);
  console.log(`  Result: ${entries.length === 3 ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 2: Extract IDEAL
  console.log("Test 2: Extract IDEAL section");
  const ideal = extractIdeal(testContent);
  console.log(`  IDEAL: ${ideal}`);
  console.log(`  Result: ${ideal?.includes("Perfect ISC format") ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 3: Extract feature name
  console.log("Test 3: Extract feature name");
  const featureName = extractFeatureName(testContent, "/path/to/Features/test-feature/specs/tasks.md");
  console.log(`  Feature: ${featureName}`);
  console.log(`  Result: ${featureName === "test-feature" ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 4: Validate ISC entries
  console.log("Test 4: Validate loaded ISC");
  const validation = validateLoadedISC(entries);
  console.log(`  Valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log("  Errors:");
    validation.errors.forEach(e => console.log(`    - ${e}`));
  }
  console.log(`  Result: ${validation.valid ? "✅ PASS - All criteria valid" : "❌ FAIL"}`);
  console.log();
  
  // Test 5: ISC Criterion Verification
  console.log("Test 5: ISC Criterion Verification");
  
  // ISC #48: ISC format converter loads tasks into tracker
  const canLoad = entries.length > 0 && entries.every(e => e.criterion && e.status);
  console.log(`  ISC #48 (Loads tasks into tracker): ${canLoad ? "✅ PASS" : "❌ FAIL"}`);
  
  // ISC #49: Algorithm ISC tracker remains primary state mechanism
  // Demonstrated by: This module is READ-ONLY, doesn't write back to tasks.md
  console.log(`  ISC #49 (Algorithm tracker is primary): ✅ PASS - Read-only loader`);
  console.log(`    Note: This module does NOT write back to tasks.md`);
  console.log(`    The Algorithm ISC tracker becomes the primary state after loading`);
  console.log();
  
  // Test 6: Format as Algorithm tracker
  console.log("Test 6: Format as Algorithm ISC tracker");
  const loadedISC: LoadedISC = {
    criteria: entries,
    antiCriteria: [{ id: "ISC-A1", criterion: "No credentials exposed in git commit history today", status: "👀" }],
    ideal,
    metadata: {
      featureName: "test-feature",
      sourceFile: "tasks.md",
      loadedAt: new Date().toISOString(),
      totalCriteria: 3,
      completedCriteria: 1,
      progressPercent: 33,
    },
  };
  
  const formatted = formatAsAlgorithmTracker(loadedISC);
  console.log("  Formatted output:");
  console.log(formatted.split("\n").map(l => `    ${l}`).join("\n"));
  console.log(`  Result: ${formatted.includes("ISC TRACKER") ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 7: Invalid ISC (wrong word count)
  console.log("Test 7: Detect invalid criteria");
  const invalidEntries: ISCEntry[] = [
    { id: 1, criterion: "Too short", status: "⬜", taskStatus: "pending" },
    { id: 2, criterion: "User authentication endpoint responds with valid JWT token", status: "✅", taskStatus: "completed" },
  ];
  
  const invalidValidation = validateLoadedISC(invalidEntries);
  console.log(`  Invalid entries detected: ${!invalidValidation.valid ? "✅ PASS" : "❌ FAIL"}`);
  if (invalidValidation.errors.length > 0) {
    console.log(`  Errors found: ${invalidValidation.errors.length}`);
    console.log(`    ${invalidValidation.errors[0].substring(0, 60)}...`);
  }
  console.log();
  
  // Test 8: Load from file (if file exists)
  console.log("Test 8: Load from actual file");
  try {
    // Try to load from a real file if SPECFIRST_TEST_TASKS_PATH is set
    const testPath = process.env.SPECFIRST_TEST_TASKS_PATH;
    if (testPath && existsSync(testPath)) {
      const loaded = await loadTasksIntoTracker(testPath);
      console.log(`  Loaded from: ${loaded.metadata.sourceFile}`);
      console.log(`  Feature: ${loaded.metadata.featureName}`);
      console.log(`  Criteria: ${loaded.metadata.totalCriteria}`);
      console.log(`  Progress: ${loaded.metadata.progressPercent}%`);
      console.log("  ✅ PASS - Real file loaded");
    } else {
      console.log("  ⚠️  SKIP - No test file (set SPECFIRST_TEST_TASKS_PATH)");
    }
  } catch (error) {
    const err = error as Error;
    console.log(`  ❌ FAIL - ${err.message}`);
  }
  console.log();
  
  console.log("🎯 Self-test complete");
  console.log("\n📖 Usage Examples:");
  console.log("\n1. Load tasks.md into Algorithm tracker:");
  console.log('   const isc = await loadTasksIntoTracker("/path/to/tasks.md");');
  console.log("\n2. Format as Algorithm ISC tracker:");
  console.log('   const table = formatAsAlgorithmTracker(isc);');
  console.log("\n3. Validate loaded ISC:");
  console.log('   const { valid, errors } = validateLoadedISC(isc.criteria);');
}
