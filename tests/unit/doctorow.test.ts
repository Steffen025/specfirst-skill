/**
 * Unit Tests - Doctorow Gate
 * 
 * Tests the pre-release checklist gate with 4 checks:
 * - Failure testing
 * - Assumption validation
 * - Rollback strategy
 * - Technical debt documentation
 * 
 * @module tests/unit/doctorow
 */

import { describe, test, expect } from "bun:test";
import {
  DOCTOROW_CHECKS,
  runDoctorowGateBatch,
  isValidDoctorowResult,
  type DoctorowCheck,
  type DoctorowGateResult,
} from "../../gates/doctorow";

describe("Doctorow Gate", () => {
  describe("Check Definitions", () => {
    test("should have exactly 4 checks", () => {
      expect(DOCTOROW_CHECKS).toHaveLength(4);
    });

    test("should include all required check types", () => {
      const checkIds = DOCTOROW_CHECKS.map(c => c.id);
      expect(checkIds).toContain("failure");
      expect(checkIds).toContain("assumption");
      expect(checkIds).toContain("rollback");
      expect(checkIds).toContain("debt");
    });

    test("each check should have required fields", () => {
      for (const check of DOCTOROW_CHECKS) {
        expect(check.id).toBeTruthy();
        expect(check.question).toBeTruthy();
        expect(check.purpose).toBeTruthy();
        expect(typeof check.question).toBe("string");
        expect(typeof check.purpose).toBe("string");
      }
    });

    test("failure check should ask about error handling", () => {
      const failureCheck = DOCTOROW_CHECKS.find(c => c.id === "failure");
      expect(failureCheck).toBeDefined();
      expect(failureCheck!.question).toMatch(/fail/i);
      expect(failureCheck!.purpose).toMatch(/error handling/i);
    });

    test("assumption check should ask about validation", () => {
      const assumptionCheck = DOCTOROW_CHECKS.find(c => c.id === "assumption");
      expect(assumptionCheck).toBeDefined();
      expect(assumptionCheck!.question).toMatch(/assumption/i);
      expect(assumptionCheck!.purpose).toMatch(/assumption/i);
    });

    test("rollback check should ask about recovery", () => {
      const rollbackCheck = DOCTOROW_CHECKS.find(c => c.id === "rollback");
      expect(rollbackCheck).toBeDefined();
      expect(rollbackCheck!.question).toMatch(/rollback/i);
      expect(rollbackCheck!.purpose).toMatch(/recover/i);
    });

    test("debt check should ask about documentation", () => {
      const debtCheck = DOCTOROW_CHECKS.find(c => c.id === "debt");
      expect(debtCheck).toBeDefined();
      expect(debtCheck!.question).toMatch(/document/i);
      expect(debtCheck!.purpose).toMatch(/debt/i);
    });
  });

  describe("Batch Mode", () => {
    test("should auto-approve all checks", () => {
      const result = runDoctorowGateBatch();
      expect(result.passed).toBe(true);
      expect(result.mode).toBe("batch");
      expect(result.checks).toHaveLength(4);
      
      for (const check of result.checks) {
        expect(check.passed).toBe(true);
      }
    });

    test("should add batch mode note to all checks", () => {
      const result = runDoctorowGateBatch();
      
      for (const check of result.checks) {
        expect(check.notes).toBe("Auto-approved in batch mode");
      }
    });

    test("should include timestamp", () => {
      const result = runDoctorowGateBatch();
      expect(result.timestamp).toBeTruthy();
      
      // Should be valid ISO timestamp
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toString()).not.toBe("Invalid Date");
    });

    test("should include all check metadata", () => {
      const result = runDoctorowGateBatch();
      
      for (let i = 0; i < result.checks.length; i++) {
        const check = result.checks[i];
        const template = DOCTOROW_CHECKS[i];
        
        expect(check.id).toBe(template.id);
        expect(check.question).toBe(template.question);
        expect(check.purpose).toBe(template.purpose);
      }
    });
  });

  describe("Validation Function", () => {
    test("should accept valid batch result", () => {
      const result = runDoctorowGateBatch();
      expect(isValidDoctorowResult(result)).toBe(true);
    });

    test("should accept valid interactive result structure", () => {
      const validResult: DoctorowGateResult = {
        passed: true,
        mode: "interactive",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "failure",
            question: "Test question",
            purpose: "Test purpose",
            passed: true,
            notes: "User confirmed",
          },
          {
            id: "assumption",
            question: "Test question 2",
            purpose: "Test purpose 2",
            passed: false,
          },
          {
            id: "rollback",
            question: "Test question 3",
            purpose: "Test purpose 3",
            passed: true,
          },
          {
            id: "debt",
            question: "Test question 4",
            purpose: "Test purpose 4",
            passed: true,
          },
        ],
      };

      expect(isValidDoctorowResult(validResult)).toBe(true);
    });

    test("should reject null", () => {
      expect(isValidDoctorowResult(null)).toBe(false);
    });

    test("should reject undefined", () => {
      expect(isValidDoctorowResult(undefined)).toBe(false);
    });

    test("should reject empty object", () => {
      expect(isValidDoctorowResult({})).toBe(false);
    });

    test("should reject incomplete result", () => {
      const incomplete = {
        passed: true,
        mode: "batch",
        // missing checks and timestamp
      };
      expect(isValidDoctorowResult(incomplete)).toBe(false);
    });

    test("should reject invalid mode", () => {
      const invalid = {
        passed: true,
        mode: "invalid",
        timestamp: new Date().toISOString(),
        checks: [],
      };
      expect(isValidDoctorowResult(invalid)).toBe(false);
    });

    test("should reject invalid check id", () => {
      const invalid = {
        passed: true,
        mode: "batch",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "invalid-id",
            question: "Test",
            purpose: "Test",
            passed: true,
          },
        ],
      };
      expect(isValidDoctorowResult(invalid)).toBe(false);
    });

    test("should reject check with missing required fields", () => {
      const invalid = {
        passed: true,
        mode: "batch",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "failure",
            // missing question and purpose
            passed: true,
          },
        ],
      };
      expect(isValidDoctorowResult(invalid)).toBe(false);
    });

    test("should accept check with optional notes", () => {
      const valid = {
        passed: true,
        mode: "batch",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "failure",
            question: "Test",
            purpose: "Test",
            passed: true,
            notes: "Optional note",
          },
        ],
      };
      expect(isValidDoctorowResult(valid)).toBe(true);
    });

    test("should reject check with non-string notes", () => {
      const invalid = {
        passed: true,
        mode: "batch",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "failure",
            question: "Test",
            purpose: "Test",
            passed: true,
            notes: 123, // should be string
          },
        ],
      };
      expect(isValidDoctorowResult(invalid)).toBe(false);
    });
  });

  describe("Gate Blocking Behavior", () => {
    test("batch mode result should always pass", () => {
      const result = runDoctorowGateBatch();
      expect(result.passed).toBe(true);
    });

    test("manually created failing result should fail", () => {
      const failingResult: DoctorowGateResult = {
        passed: false,
        mode: "interactive",
        timestamp: new Date().toISOString(),
        checks: [
          {
            id: "failure",
            question: "Test",
            purpose: "Test",
            passed: false,
            notes: "User said no",
          },
          {
            id: "assumption",
            question: "Test 2",
            purpose: "Test 2",
            passed: true,
          },
          {
            id: "rollback",
            question: "Test 3",
            purpose: "Test 3",
            passed: true,
          },
          {
            id: "debt",
            question: "Test 4",
            purpose: "Test 4",
            passed: true,
          },
        ],
      };

      expect(failingResult.passed).toBe(false);
      expect(isValidDoctorowResult(failingResult)).toBe(true);
    });
  });
});
