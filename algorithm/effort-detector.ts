#!/usr/bin/env bun
/**
 * Effort Level Detector - SpecFirst 4.0
 * 
 * Determines SpecFirst execution mode based on EXPLICIT FLAGS.
 * Updated for Algorithm v1.8.0: 8 effort level tiers.
 * 
 * ISC Coverage:
 * - ISC #46: DETERMINED effort detection triggers SpecFirst capability activation
 * 
 * Algorithm v1.8.0 Effort Tiers:
 * | Tier           | Budget  | SpecFirst Activation |
 * |----------------|---------|---------------------|
 * | Instant        | <10s    | No                  |
 * | Fast           | <1min   | No                  |
 * | Standard       | <2min   | No                  |
 * | Extended       | <8min   | Yes                 |
 * | Advanced       | <16min  | Yes                 |
 * | Deep           | <32min  | Yes                 |
 * | Comprehensive  | <120min | Yes                 |
 * | Loop           | Unbnd   | Yes                 |
 * 
 * @module algorithm/effort-detector
 * @version 4.0.0
 */

/** All Algorithm v1.8.0 effort level tiers */
export type EffortLevel =
  | "INSTANT"
  | "FAST"
  | "STANDARD"
  | "EXTENDED"
  | "ADVANCED"
  | "DEEP"
  | "COMPREHENSIVE"
  | "LOOP"
  // Legacy compatibility
  | "MINIMAL"
  | "THOROUGH"
  | "DETERMINED";

/** All valid Algorithm v1.8.0 effort levels */
export const ALGORITHM_EFFORT_TIERS: EffortLevel[] = [
  "INSTANT", "FAST", "STANDARD", "EXTENDED",
  "ADVANCED", "DEEP", "COMPREHENSIVE", "LOOP",
];

/** Budget in seconds per tier */
export const EFFORT_BUDGETS: Record<string, number> = {
  INSTANT: 10,
  FAST: 60,
  STANDARD: 120,
  EXTENDED: 480,
  ADVANCED: 960,
  DEEP: 1920,
  COMPREHENSIVE: 7200,
  LOOP: Infinity,
  // Legacy mappings
  MINIMAL: 60,
  THOROUGH: 480,
  DETERMINED: 1920,
};

/**
 * CLI flags that explicitly control effort level.
 * Supports both legacy 3-flag system and new Algorithm v1.8.0 tier system.
 */
export interface EffortFlags {
  /** --quick: Fast effort (was MINIMAL) */
  quick?: boolean;
  /** --batch: Non-interactive mode for automation (Cedars) — maps to Deep */
  batch?: boolean;
  /** --thorough: Extended effort (was THOROUGH) */
  thorough?: boolean;
  /** --deep: Deep effort (<32min) — NEW in v4.0 */
  deep?: boolean;
  /** --comprehensive: Comprehensive effort (<120min) — NEW in v4.0 */
  comprehensive?: boolean;
  /** --tier: Explicit Algorithm tier name — NEW in v4.0 */
  tier?: EffortLevel;
}

export interface EffortDetection {
  effortLevel: EffortLevel;
  shouldActivateSpecFirst: boolean;
  reason: string;
  confidence: number; // 0-1
  /** v3.1: Indicates if detection came from explicit flag (high confidence) or heuristics (lower) */
  source: "explicit-flag" | "heuristic" | "default";
}

/**
 * Detects the effort level from EXPLICIT FLAGS (v3.1 - preferred).
 * 
 * FLAG PRIORITY (highest to lowest):
 * 1. --batch  → DETERMINED (non-interactive, automation/Cedars)
 * 2. --quick  → MINIMAL (essentials only)
 * 3. (none)   → STANDARD (interactive, full workflow)
 * 
 * @param flags - Explicit CLI flags
 * @returns EffortDetection with level, activation decision, and reasoning
 * 
 * @example
 * ```typescript
 * // Cedars spawns session with --batch
 * const result = detectEffortFromFlags({ batch: true });
 * // result.effortLevel === "DETERMINED"
 * // result.shouldActivateSpecFirst === true
 * 
 * // User wants quick spec
 * const result2 = detectEffortFromFlags({ quick: true });
 * // result2.effortLevel === "MINIMAL"
 * 
 * // Default interactive mode
 * const result3 = detectEffortFromFlags({});
 * // result3.effortLevel === "STANDARD"
 * ```
 */
export function detectEffortFromFlags(flags: EffortFlags): EffortDetection {
  // NEW v4.0: Explicit tier override takes highest priority
  if (flags.tier) {
    const normalized = flags.tier.toUpperCase() as EffortLevel;
    return {
      effortLevel: normalized,
      shouldActivateSpecFirst: shouldTriggerSpecFirst(normalized),
      reason: `Explicit --tier=${normalized}: Algorithm v1.8.0 tier`,
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  // Priority: comprehensive > deep > batch > thorough > quick > default
  if (flags.comprehensive) {
    return {
      effortLevel: "COMPREHENSIVE",
      shouldActivateSpecFirst: true,
      reason: "Explicit --comprehensive flag: full specification process (<120min)",
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  if (flags.deep) {
    return {
      effortLevel: "DEEP",
      shouldActivateSpecFirst: true,
      reason: "Explicit --deep flag: thorough specification process (<32min)",
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  if (flags.batch) {
    return {
      effortLevel: "DEEP",
      shouldActivateSpecFirst: true,
      reason: "Explicit --batch flag: non-interactive mode for automation (Cedars), mapped to DEEP",
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  if (flags.thorough) {
    return {
      effortLevel: "EXTENDED",
      shouldActivateSpecFirst: true,
      reason: "Explicit --thorough flag: extended specification process (<8min)",
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  if (flags.quick) {
    return {
      effortLevel: "FAST",
      shouldActivateSpecFirst: false,
      reason: "Explicit --quick flag: fast mode, skip optional sections",
      confidence: 1.0,
      source: "explicit-flag",
    };
  }
  
  // Default: STANDARD
  return {
    effortLevel: "STANDARD",
    shouldActivateSpecFirst: false,
    reason: "Default mode: standard specification workflow",
    confidence: 1.0,
    source: "default",
  };
}

/**
 * LEGACY: Detects effort level from Algorithm context (v3.0 behavior).
 * 
 * DEPRECATED in v3.1 - Use detectEffortFromFlags() instead.
 * Kept for backward compatibility with existing integrations.
 * 
 * @deprecated Use detectEffortFromFlags() with explicit flags instead
 * @param algorithmContext - Context from PAI Algorithm (can be string, object, or undefined)
 * @returns EffortDetection with level, activation decision, and reasoning
 */
export function detectEffortLevel(algorithmContext: unknown): EffortDetection {
  // Default to STANDARD with no activation
  let effortLevel: EffortLevel = "STANDARD";
  let reason = "No Algorithm context provided - defaulting to STANDARD";
  let confidence = 0.3;
  let source: "explicit-flag" | "heuristic" | "default" = "default";
  
  // Case 1: undefined/null context
  if (algorithmContext === undefined || algorithmContext === null) {
    return {
      effortLevel,
      shouldActivateSpecFirst: false,
      reason,
      confidence,
      source,
    };
  }
  
  // Case 2: Object with explicit flags (NEW in v3.1 - preferred)
  if (typeof algorithmContext === "object") {
    const contextObj = algorithmContext as Record<string, unknown>;
    
    // Check for new-style flags first
    if ("quick" in contextObj || "batch" in contextObj || "thorough" in contextObj) {
      return detectEffortFromFlags(contextObj as EffortFlags);
    }
    
    // Legacy: effortLevel property
    if ("effortLevel" in contextObj) {
      const level = (String(contextObj.effortLevel) || "").toUpperCase();
      
      if (["MINIMAL", "STANDARD", "THOROUGH", "DETERMINED"].includes(level)) {
        effortLevel = level as EffortLevel;
        reason = `Explicit effort level from Algorithm: ${effortLevel}`;
        confidence = 1.0;
        source = "explicit-flag";
      }
    }
  }
  
  // Case 3: String context - LEGACY heuristics (deprecated)
  if (typeof algorithmContext === "string") {
    const text = algorithmContext.toUpperCase();
    source = "heuristic";
    
    if (text.includes("DETERMINED")) {
      effortLevel = "DETERMINED";
      reason = "DETERMINED keyword detected in Algorithm context (legacy heuristic)";
      confidence = 0.9;
    } else if (text.includes("THOROUGH")) {
      effortLevel = "THOROUGH";
      reason = "THOROUGH keyword detected in Algorithm context (legacy heuristic)";
      confidence = 0.8;
    } else if (text.includes("MINIMAL")) {
      effortLevel = "MINIMAL";
      reason = "MINIMAL keyword detected in Algorithm context (legacy heuristic)";
      confidence = 0.8;
    }
    
    // Additional complexity indicators (legacy)
    const complexityIndicators = [
      "LARGE-SCALE",
      "MULTI-PHASE",
      "ARCHITECTURAL",
      "SPEC-DRIVEN",
      "COMPREHENSIVE",
    ];
    
    const indicatorCount = complexityIndicators.filter(ind => text.includes(ind)).length;
    
    if (indicatorCount >= 2 && effortLevel !== "DETERMINED") {
      effortLevel = "THOROUGH";
      reason = `Multiple complexity indicators detected (${indicatorCount}): suggests THOROUGH effort (legacy heuristic)`;
      confidence = 0.7;
    }
  }
  
  // Determine activation
  const shouldActivate = shouldTriggerSpecFirst(effortLevel);
  
  return {
    effortLevel,
    shouldActivateSpecFirst: shouldActivate,
    reason,
    confidence,
    source,
  };
}

/**
 * Determines if SpecFirst should be triggered based on effort level.
 * 
 * Activation rules:
 * - MINIMAL: No (too small for spec-driven process)
 * - STANDARD: No (regular development workflow sufficient)
 * - THOROUGH: Maybe (consider SpecFirst for complex tasks)
 * - DETERMINED: Yes (activate SpecFirst for large-scale projects)
 * 
 * ISC #46: DETERMINED effort detection triggers SpecFirst capability activation
 * 
 * @param effortLevel - The detected effort level
 * @returns true if SpecFirst should activate, false otherwise
 * 
 * @example
 * ```typescript
 * shouldTriggerSpecFirst("MINIMAL");     // false
 * shouldTriggerSpecFirst("STANDARD");    // false
 * shouldTriggerSpecFirst("THOROUGH");    // true (consider)
 * shouldTriggerSpecFirst("DETERMINED");  // true (activate)
 * ```
 */
export function shouldTriggerSpecFirst(effortLevel: string): boolean {
  const normalized = effortLevel.toUpperCase();
  
  switch (normalized) {
    // Algorithm v1.8.0 tiers
    case "INSTANT":
      return false; // Too trivial
    case "FAST":
      return false; // Too quick for spec process
    case "STANDARD":
      return false; // Regular development workflow sufficient
    case "EXTENDED":
      return true;  // Consider SpecFirst for complex tasks
    case "ADVANCED":
      return true;  // Activate SpecFirst
    case "DEEP":
      return true;  // Full SpecFirst process
    case "COMPREHENSIVE":
      return true;  // Maximum SpecFirst depth
    case "LOOP":
      return true;  // Loop mode uses SpecFirst PRDs
    // Legacy tiers (backward compatibility)
    case "MINIMAL":
      return false;
    case "THOROUGH":
      return true;
    case "DETERMINED":
      return true;
    default:
      return false; // Unknown level - don't activate
  }
}

/**
 * Creates a detection result for explicit DETERMINED effort.
 * Utility function for Algorithm to explicitly request SpecFirst.
 * 
 * @returns EffortDetection configured for DETERMINED activation
 */
export function createDeterminedDetection(): EffortDetection {
  return {
    effortLevel: "DETERMINED",
    shouldActivateSpecFirst: true,
    reason: "Explicit DETERMINED effort request - SpecFirst activation required",
    confidence: 1.0,
    source: "explicit-flag",
  };
}

/**
 * Validates that an object is a valid EffortDetection result.
 * 
 * @param obj - Object to validate
 * @returns true if valid EffortDetection, false otherwise
 */
export function isValidEffortDetection(obj: unknown): obj is EffortDetection {
  if (typeof obj !== "object" || obj === null) return false;
  
  const detection = obj as EffortDetection;
  
  const validLevels = [
    "INSTANT", "FAST", "STANDARD", "EXTENDED", "ADVANCED", "DEEP", "COMPREHENSIVE", "LOOP",
    "MINIMAL", "THOROUGH", "DETERMINED", // Legacy
  ];
  
  return (
    typeof detection.effortLevel === "string" &&
    validLevels.includes(detection.effortLevel) &&
    typeof detection.shouldActivateSpecFirst === "boolean" &&
    typeof detection.reason === "string" &&
    typeof detection.confidence === "number" &&
    detection.confidence >= 0 &&
    detection.confidence <= 1 &&
    typeof detection.source === "string" &&
    ["explicit-flag", "heuristic", "default"].includes(detection.source)
  );
}

// Export for testing
export const __testing = {
  detectEffortLevel,
  shouldTriggerSpecFirst,
  createDeterminedDetection,
  isValidEffortDetection,
};

// Self-test when run directly with: bun algorithm/effort-detector.ts
if (import.meta.main) {
  console.log("🧪 Testing Effort Detector v3.1 (Flag-Based)\n");
  
  // NEW v3.1 Tests: Flag-based detection
  console.log("=== NEW v3.1: Flag-Based Detection ===\n");
  
  // Test F1: --batch flag (v4.0 maps to DEEP)
  console.log("Test F1: --batch flag (DEEP in v4.0)");
  const testF1 = detectEffortFromFlags({ batch: true });
  console.log(`  Effort: ${testF1.effortLevel}`);
  console.log(`  Activate: ${testF1.shouldActivateSpecFirst}`);
  console.log(`  Source: ${testF1.source}`);
  console.log(`  Confidence: ${testF1.confidence}`);
  console.log(`  Result: ${testF1.effortLevel === "DEEP" && testF1.source === "explicit-flag" && testF1.shouldActivateSpecFirst ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test F2: --quick flag (v4.0 maps to FAST)
  console.log("Test F2: --quick flag (FAST in v4.0)");
  const testF2 = detectEffortFromFlags({ quick: true });
  console.log(`  Effort: ${testF2.effortLevel}`);
  console.log(`  Activate: ${testF2.shouldActivateSpecFirst}`);
  console.log(`  Source: ${testF2.source}`);
  console.log(`  Result: ${testF2.effortLevel === "FAST" && testF2.source === "explicit-flag" && !testF2.shouldActivateSpecFirst ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test F3: --thorough flag (v4.0 maps to EXTENDED)
  console.log("Test F3: --thorough flag (EXTENDED in v4.0)");
  const testF3 = detectEffortFromFlags({ thorough: true });
  console.log(`  Effort: ${testF3.effortLevel}`);
  console.log(`  Activate: ${testF3.shouldActivateSpecFirst}`);
  console.log(`  Source: ${testF3.source}`);
  console.log(`  Result: ${testF3.effortLevel === "EXTENDED" && testF3.source === "explicit-flag" && testF3.shouldActivateSpecFirst ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test F4: No flags (default STANDARD - no activation)
  console.log("Test F4: No flags (STANDARD default - no activation)");
  const testF4 = detectEffortFromFlags({});
  console.log(`  Effort: ${testF4.effortLevel}`);
  console.log(`  Activate: ${testF4.shouldActivateSpecFirst}`);
  console.log(`  Source: ${testF4.source}`);
  console.log(`  Result: ${testF4.effortLevel === "STANDARD" && testF4.source === "default" && !testF4.shouldActivateSpecFirst ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test F5: Flag priority (batch > quick)
  console.log("Test F5: Flag priority (batch > quick)");
  const testF5 = detectEffortFromFlags({ batch: true, quick: true });
  console.log(`  Effort: ${testF5.effortLevel}`);
  console.log(`  Result: ${testF5.effortLevel === "DEEP" ? "✅ PASS - batch takes priority" : "❌ FAIL"}`);
  console.log();
  
  console.log("=== LEGACY: Backward Compatibility Tests ===\n");
  
  // Test 1: No context (outside Algorithm)
  console.log("Test 1: No Algorithm context");
  const test1 = detectEffortLevel(undefined);
  console.log(`  Effort: ${test1.effortLevel}`);
  console.log(`  Activate: ${test1.shouldActivateSpecFirst}`);
  console.log(`  Reason: ${test1.reason}`);
  console.log(`  Result: ${!test1.shouldActivateSpecFirst ? "✅ PASS - Correctly no activation" : "❌ FAIL"}`);
  console.log();
  
  // Test 2: Explicit DETERMINED in object
  console.log("Test 2: Explicit DETERMINED effort");
  const test2 = detectEffortLevel({ effortLevel: "DETERMINED" });
  console.log(`  Effort: ${test2.effortLevel}`);
  console.log(`  Activate: ${test2.shouldActivateSpecFirst}`);
  console.log(`  Confidence: ${test2.confidence}`);
  console.log(`  Result: ${test2.shouldActivateSpecFirst && test2.effortLevel === "DETERMINED" ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 3: DETERMINED in string context
  console.log("Test 3: DETERMINED keyword in text");
  const test3 = detectEffortLevel("Running with DETERMINED effort on large-scale feature");
  console.log(`  Effort: ${test3.effortLevel}`);
  console.log(`  Activate: ${test3.shouldActivateSpecFirst}`);
  console.log(`  Reason: ${test3.reason}`);
  console.log(`  Result: ${test3.shouldActivateSpecFirst && test3.effortLevel === "DETERMINED" ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 4: THOROUGH effort level
  console.log("Test 4: THOROUGH effort level");
  const test4 = detectEffortLevel({ effortLevel: "THOROUGH" });
  console.log(`  Effort: ${test4.effortLevel}`);
  console.log(`  Activate: ${test4.shouldActivateSpecFirst}`);
  console.log(`  Result: ${test4.shouldActivateSpecFirst && test4.effortLevel === "THOROUGH" ? "✅ PASS - THOROUGH also triggers" : "❌ FAIL"}`);
  console.log();
  
  // Test 5: MINIMAL effort level
  console.log("Test 5: MINIMAL effort level");
  const test5 = detectEffortLevel({ effortLevel: "MINIMAL" });
  console.log(`  Effort: ${test5.effortLevel}`);
  console.log(`  Activate: ${test5.shouldActivateSpecFirst}`);
  console.log(`  Result: ${!test5.shouldActivateSpecFirst && test5.effortLevel === "MINIMAL" ? "✅ PASS - MINIMAL does not trigger" : "❌ FAIL"}`);
  console.log();
  
  // Test 6: Complexity indicators in string
  console.log("Test 6: Multiple complexity indicators");
  const test6 = detectEffortLevel("LARGE-SCALE MULTI-PHASE architectural project");
  console.log(`  Effort: ${test6.effortLevel}`);
  console.log(`  Activate: ${test6.shouldActivateSpecFirst}`);
  console.log(`  Reason: ${test6.reason}`);
  console.log(`  Result: ${test6.effortLevel === "THOROUGH" ? "✅ PASS - Complexity indicators detected" : "❌ FAIL"}`);
  console.log();
  
  // Test 7: ISC Criterion Verification
  console.log("Test 7: ISC Criterion Verification");
  
  // ISC #46: DETERMINED effort detection triggers SpecFirst capability activation
  const determinedTriggers = shouldTriggerSpecFirst("DETERMINED");
  console.log(`  ISC #46 (DETERMINED triggers SpecFirst): ${determinedTriggers ? "✅ PASS" : "❌ FAIL"}`);
  
  // Verify other levels behave correctly
  const minimalNoTrigger = !shouldTriggerSpecFirst("MINIMAL");
  const standardNoTrigger = !shouldTriggerSpecFirst("STANDARD");
  const thoroughTriggers = shouldTriggerSpecFirst("THOROUGH");
  
  console.log(`  MINIMAL does not trigger: ${minimalNoTrigger ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  STANDARD does not trigger: ${standardNoTrigger ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  THOROUGH triggers: ${thoroughTriggers ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 8: Validation function
  console.log("Test 8: EffortDetection validation");
  const validDetection = createDeterminedDetection();
  const isValid = isValidEffortDetection(validDetection);
  console.log(`  Valid detection: ${isValid ? "✅ PASS" : "❌ FAIL"}`);
  
  const invalidDetection = { effortLevel: "INVALID" };
  const isInvalid = !isValidEffortDetection(invalidDetection);
  console.log(`  Invalid detection rejected: ${isInvalid ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  console.log("🎯 Self-test complete");
  console.log("\n📖 Usage Examples:");
  console.log("\n1. Detect from Algorithm context:");
  console.log('   const result = detectEffortLevel(algorithmContext);');
  console.log('   if (result.shouldActivateSpecFirst) { /* activate */ }');
  console.log("\n2. Check specific effort level:");
  console.log('   const shouldActivate = shouldTriggerSpecFirst("DETERMINED");');
  console.log("\n3. Create explicit DETERMINED detection:");
  console.log('   const detection = createDeterminedDetection();');
}
