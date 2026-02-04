#!/usr/bin/env bun
/**
 * Effort Level Detector - SpecFirst 3.0
 * 
 * Detects when the PAI Algorithm is running at DETERMINED effort level
 * and determines whether SpecFirst should be activated.
 * 
 * ISC Coverage:
 * - ISC #46: DETERMINED effort detection triggers SpecFirst capability activation
 * 
 * The PAI Algorithm uses effort levels to communicate the scale and complexity
 * of a task. SpecFirst is designed for large-scale, spec-driven development
 * projects and should activate when the Algorithm determines DETERMINED effort
 * is required.
 * 
 * @module algorithm/effort-detector
 * @version 3.0.0
 */

export type EffortLevel = "MINIMAL" | "STANDARD" | "THOROUGH" | "DETERMINED";

export interface EffortDetection {
  effortLevel: EffortLevel;
  shouldActivateSpecFirst: boolean;
  reason: string;
  confidence: number; // 0-1
}

/**
 * Detects the effort level from Algorithm context.
 * 
 * The Algorithm context can be:
 * - A string containing effort level indicators
 * - An object with effortLevel property
 * - undefined/null if running outside Algorithm
 * 
 * Detection priorities:
 * 1. Explicit effortLevel property
 * 2. DETERMINED keyword in context string
 * 3. Task complexity indicators (size, scope, phases)
 * 4. Default to STANDARD if no clear indicators
 * 
 * @param algorithmContext - Context from PAI Algorithm (can be string, object, or undefined)
 * @returns EffortDetection with level, activation decision, and reasoning
 * 
 * @example
 * ```typescript
 * // From Algorithm with explicit effort
 * const result = detectEffortLevel({ effortLevel: "DETERMINED" });
 * // result.shouldActivateSpecFirst === true
 * 
 * // From text containing DETERMINED
 * const result2 = detectEffortLevel("Running with DETERMINED effort on large feature");
 * // result2.shouldActivateSpecFirst === true
 * 
 * // No context (outside Algorithm)
 * const result3 = detectEffortLevel(undefined);
 * // result3.shouldActivateSpecFirst === false
 * ```
 */
export function detectEffortLevel(algorithmContext: unknown): EffortDetection {
  // Default to STANDARD with no activation
  let effortLevel: EffortLevel = "STANDARD";
  let reason = "No Algorithm context provided - defaulting to STANDARD";
  let confidence = 0.3;
  
  // Case 1: undefined/null context
  if (algorithmContext === undefined || algorithmContext === null) {
    return {
      effortLevel,
      shouldActivateSpecFirst: false,
      reason,
      confidence,
    };
  }
  
  // Case 2: Object with effortLevel property
  if (typeof algorithmContext === "object" && "effortLevel" in algorithmContext) {
    const contextObj = algorithmContext as { effortLevel?: string };
    const level = (contextObj.effortLevel || "").toUpperCase();
    
    if (["MINIMAL", "STANDARD", "THOROUGH", "DETERMINED"].includes(level)) {
      effortLevel = level as EffortLevel;
      reason = `Explicit effort level from Algorithm: ${effortLevel}`;
      confidence = 1.0;
    }
  }
  
  // Case 3: String context - scan for effort indicators
  if (typeof algorithmContext === "string") {
    const text = algorithmContext.toUpperCase();
    
    if (text.includes("DETERMINED")) {
      effortLevel = "DETERMINED";
      reason = "DETERMINED keyword detected in Algorithm context";
      confidence = 0.9;
    } else if (text.includes("THOROUGH")) {
      effortLevel = "THOROUGH";
      reason = "THOROUGH keyword detected in Algorithm context";
      confidence = 0.8;
    } else if (text.includes("MINIMAL")) {
      effortLevel = "MINIMAL";
      reason = "MINIMAL keyword detected in Algorithm context";
      confidence = 0.8;
    }
    
    // Additional complexity indicators
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
      reason = `Multiple complexity indicators detected (${indicatorCount}): suggests THOROUGH effort`;
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
    case "MINIMAL":
      return false; // Too small for spec-driven process
    case "STANDARD":
      return false; // Regular development workflow sufficient
    case "THOROUGH":
      return true;  // Consider SpecFirst for complex tasks
    case "DETERMINED":
      return true;  // Activate SpecFirst for large-scale projects
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
  
  return (
    typeof detection.effortLevel === "string" &&
    ["MINIMAL", "STANDARD", "THOROUGH", "DETERMINED"].includes(detection.effortLevel) &&
    typeof detection.shouldActivateSpecFirst === "boolean" &&
    typeof detection.reason === "string" &&
    typeof detection.confidence === "number" &&
    detection.confidence >= 0 &&
    detection.confidence <= 1
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
  console.log("🧪 Testing Effort Detector\n");
  
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
