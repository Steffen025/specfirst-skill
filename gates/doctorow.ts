#!/usr/bin/env bun
/**
 * Doctorow Gate - SpecFirst 3.1
 * 
 * Pre-completion checklist inspired by Cory Doctorow's writing methodology.
 * 4 checks that must pass (or be explicitly acknowledged) before feature completion.
 * 
 * For Cedars/batch mode: Auto-approve with logging (non-interactive).
 * For interactive mode: Prompt user for each check.
 * 
 * @module gates/doctorow
 * @version 3.1.0
 */

import { stdin as input, stdout as output } from "process";
import * as readline from "readline";

export interface DoctorowCheck {
  id: "failure" | "assumption" | "rollback" | "debt";
  question: string;
  purpose: string;
  passed: boolean;
  notes?: string;
}

export interface DoctorowGateResult {
  passed: boolean;
  checks: DoctorowCheck[];
  mode: "interactive" | "batch";
  timestamp: string;
}

// Define the 4 checks
export const DOCTOROW_CHECKS: Omit<DoctorowCheck, "passed" | "notes">[] = [
  {
    id: "failure",
    question: "Have you tested what happens when this feature fails?",
    purpose: "Ensures error handling is considered",
  },
  {
    id: "assumption",
    question: "Have you validated your key assumptions?",
    purpose: "Catches hidden assumptions",
  },
  {
    id: "rollback",
    question: "Do you have a rollback plan?",
    purpose: "Ensures recoverability",
  },
  {
    id: "debt",
    question: "Have you documented any shortcuts?",
    purpose: "Acknowledges and tracks technical debt",
  },
];

/**
 * Run Doctorow Gate in batch mode (auto-approve with logging).
 * Used by Cedars for non-interactive sessions.
 * 
 * In batch mode, all checks are marked as passed with a note indicating
 * automatic approval. This allows the gate to function in automated pipelines
 * while still logging that the gate was run.
 * 
 * @returns DoctorowGateResult with all checks auto-approved
 * 
 * @example
 * ```typescript
 * const result = runDoctorowGateBatch();
 * console.log(`Batch mode: ${result.checks.length} checks auto-approved`);
 * ```
 */
export function runDoctorowGateBatch(): DoctorowGateResult {
  const checks: DoctorowCheck[] = DOCTOROW_CHECKS.map(check => ({
    ...check,
    passed: true,
    notes: "Auto-approved in batch mode",
  }));

  return {
    passed: true,
    checks,
    mode: "batch",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run Doctorow Gate interactively.
 * Prompts user for each check with yes/no/note options.
 * Returns result with all responses.
 * 
 * Each check requires explicit confirmation or acknowledgment.
 * User can provide notes to explain partial passes or issues found.
 * 
 * @returns Promise<DoctorowGateResult> with user responses
 * 
 * @example
 * ```typescript
 * const result = await runDoctorowGateInteractive();
 * if (!result.passed) {
 *   console.error("Doctorow gate failed - review checks before release");
 * }
 * ```
 */
export async function runDoctorowGateInteractive(): Promise<DoctorowGateResult> {
  const rl = readline.createInterface({ input, output });

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(prompt, answer => {
        resolve(answer.trim());
      });
    });
  };

  console.log("\n🚪 Doctorow Gate - Pre-Release Checklist\n");
  console.log("Answer each check with: yes/no/note\n");

  const checks: DoctorowCheck[] = [];

  for (const check of DOCTOROW_CHECKS) {
    console.log(`\n📋 ${check.purpose}`);
    console.log(`   ${check.question}`);
    
    const answer = await question("   → (yes/no/note): ");
    const normalizedAnswer = answer.toLowerCase();

    if (normalizedAnswer === "yes" || normalizedAnswer === "y") {
      checks.push({
        ...check,
        passed: true,
      });
    } else if (normalizedAnswer === "no" || normalizedAnswer === "n") {
      checks.push({
        ...check,
        passed: false,
        notes: "User indicated not completed",
      });
    } else {
      // Any other input is treated as a note
      checks.push({
        ...check,
        passed: true,
        notes: answer,
      });
    }
  }

  rl.close();

  const allPassed = checks.every(c => c.passed);

  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("✅ Doctorow Gate: PASSED");
  } else {
    console.log("❌ Doctorow Gate: FAILED");
    const failed = checks.filter(c => !c.passed);
    console.log(`\n${failed.length} check(s) failed:`);
    failed.forEach(c => {
      console.log(`  - ${c.id}: ${c.question}`);
      if (c.notes) console.log(`    Note: ${c.notes}`);
    });
  }
  console.log("=".repeat(60) + "\n");

  return {
    passed: allPassed,
    checks,
    mode: "interactive",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate a DoctorowGateResult object.
 * Type guard to ensure the object matches the expected structure.
 * 
 * @param obj - Object to validate
 * @returns True if obj is a valid DoctorowGateResult
 * 
 * @example
 * ```typescript
 * const data = JSON.parse(jsonString);
 * if (isValidDoctorowResult(data)) {
 *   console.log(`Gate ${data.passed ? 'passed' : 'failed'}`);
 * }
 * ```
 */
export function isValidDoctorowResult(obj: unknown): obj is DoctorowGateResult {
  if (!obj || typeof obj !== "object") return false;

  const result = obj as Partial<DoctorowGateResult>;

  // Check required fields
  if (typeof result.passed !== "boolean") return false;
  if (!Array.isArray(result.checks)) return false;
  if (result.mode !== "interactive" && result.mode !== "batch") return false;
  if (typeof result.timestamp !== "string") return false;

  // Validate each check
  for (const check of result.checks) {
    if (typeof check.id !== "string") return false;
    if (!["failure", "assumption", "rollback", "debt"].includes(check.id)) return false;
    if (typeof check.question !== "string") return false;
    if (typeof check.purpose !== "string") return false;
    if (typeof check.passed !== "boolean") return false;
    if (check.notes !== undefined && typeof check.notes !== "string") return false;
  }

  return true;
}

// Self-test when run directly with: bun gates/doctorow.ts
if (import.meta.main) {
  console.log("🧪 Testing Doctorow Gate\n");

  // Test 1: Check definitions
  console.log("Test 1: Check definitions");
  console.assert(DOCTOROW_CHECKS.length === 4, "Should have 4 checks");
  console.assert(
    DOCTOROW_CHECKS.every(c => c.id && c.question && c.purpose),
    "All checks should have id, question, and purpose"
  );
  console.log("  ✅ Check definitions valid\n");

  // Test 2: Batch mode
  console.log("Test 2: Batch mode auto-approval");
  const batchResult = runDoctorowGateBatch();
  console.assert(batchResult.passed === true, "Batch mode should pass");
  console.assert(batchResult.mode === "batch", "Should be batch mode");
  console.assert(batchResult.checks.length === 4, "Should have 4 checks");
  console.assert(
    batchResult.checks.every(c => c.passed === true),
    "All checks should be auto-approved"
  );
  console.assert(
    batchResult.checks.every(c => c.notes === "Auto-approved in batch mode"),
    "All checks should have batch note"
  );
  console.log("  ✅ Batch mode works correctly\n");

  // Test 3: Validation function
  console.log("Test 3: Validation function");
  
  // Valid result
  const validResult = runDoctorowGateBatch();
  console.assert(isValidDoctorowResult(validResult), "Should validate batch result");

  // Invalid results
  console.assert(!isValidDoctorowResult(null), "Should reject null");
  console.assert(!isValidDoctorowResult({}), "Should reject empty object");
  console.assert(!isValidDoctorowResult({ passed: true }), "Should reject incomplete object");
  
  const invalidCheck = {
    passed: true,
    checks: [{ id: "invalid", question: "", purpose: "", passed: true }],
    mode: "batch" as const,
    timestamp: new Date().toISOString(),
  };
  console.assert(!isValidDoctorowResult(invalidCheck), "Should reject invalid check id");
  
  console.log("  ✅ Validation function works correctly\n");

  // Test 4: Check structure
  console.log("Test 4: Check structure validation");
  const checkIds = DOCTOROW_CHECKS.map(c => c.id);
  console.assert(checkIds.includes("failure"), "Should include failure check");
  console.assert(checkIds.includes("assumption"), "Should include assumption check");
  console.assert(checkIds.includes("rollback"), "Should include rollback check");
  console.assert(checkIds.includes("debt"), "Should include debt check");
  console.log("  ✅ All required checks present\n");

  console.log("🎯 Self-test complete");
  console.log("\n📝 Usage:");
  console.log("  // Batch mode (automated)");
  console.log("  const result = runDoctorowGateBatch();");
  console.log("\n  // Interactive mode");
  console.log("  const result = await runDoctorowGateInteractive();");
  console.log("  if (!result.passed) {");
  console.log("    console.error('Release blocked by Doctorow gate');");
  console.log("  }");
}
