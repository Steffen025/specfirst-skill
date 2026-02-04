#!/usr/bin/env bun
/**
 * Phase Integration Module - SpecFirst 3.0
 * 
 * Maps SpecFirst phases to PAI Algorithm phases and determines when
 * SpecFirst can execute within the Algorithm workflow.
 * 
 * ISC Coverage:
 * - ISC #47: SpecFirst executes within Algorithm PLAN BUILD phases
 * 
 * Phase Mapping Strategy:
 * - Algorithm PLAN phase:
 *   - SpecFirst propose → Generate proposal.md
 *   - SpecFirst specify → Generate spec.md
 *   - SpecFirst plan → Generate plan.md and tasks.md
 * 
 * - Algorithm BUILD phase:
 *   - SpecFirst implement → Execute tasks from tasks.md
 *   - SpecFirst release → Deploy and verify
 * 
 * - Algorithm VERIFY phase:
 *   - SpecFirst verification → Check ISC criteria completion
 * 
 * @module algorithm/phase-integration
 * @version 3.0.0
 */

export type SpecFirstPhase = "propose" | "specify" | "plan" | "implement" | "release";
export type AlgorithmPhase = "OBSERVE" | "THINK" | "PLAN" | "BUILD" | "EXECUTE" | "VERIFY" | "LEARN";

export interface PhaseMapping {
  specFirstPhase: SpecFirstPhase;
  algorithmPhase: AlgorithmPhase;
  canExecute: boolean;
  reason: string;
}

export interface PhaseCompatibility {
  compatible: boolean;
  suggestedAlgorithmPhase: AlgorithmPhase | null;
  reason: string;
}

/**
 * Phase mapping configuration.
 * Defines which SpecFirst phases map to which Algorithm phases.
 * 
 * ISC #47: SpecFirst executes within Algorithm PLAN BUILD phases
 */
const PHASE_MAP: Record<SpecFirstPhase, AlgorithmPhase> = {
  propose: "PLAN",    // Planning phase: Generate proposal
  specify: "PLAN",    // Planning phase: Generate specification
  plan: "PLAN",       // Planning phase: Generate implementation plan
  implement: "BUILD", // Build phase: Execute implementation tasks
  release: "BUILD",   // Build phase: Deploy and release
};

/**
 * Maps a SpecFirst phase to its corresponding Algorithm phase.
 * 
 * ISC #47: All SpecFirst phases execute within PLAN or BUILD phases
 * 
 * @param specFirstPhase - The SpecFirst phase to map
 * @returns The corresponding Algorithm phase (PLAN or BUILD)
 * 
 * @example
 * ```typescript
 * mapToAlgorithmPhase("propose");   // "PLAN"
 * mapToAlgorithmPhase("specify");   // "PLAN"
 * mapToAlgorithmPhase("plan");      // "PLAN"
 * mapToAlgorithmPhase("implement"); // "BUILD"
 * mapToAlgorithmPhase("release");   // "BUILD"
 * ```
 */
export function mapToAlgorithmPhase(specFirstPhase: string): AlgorithmPhase {
  const normalized = specFirstPhase.toLowerCase() as SpecFirstPhase;
  
  if (!(normalized in PHASE_MAP)) {
    throw new Error(
      `Invalid SpecFirst phase: "${specFirstPhase}". ` +
      `Must be one of: ${Object.keys(PHASE_MAP).join(", ")}`
    );
  }
  
  return PHASE_MAP[normalized];
}

/**
 * Checks if a SpecFirst phase can execute in the current Algorithm phase.
 * 
 * Execution rules:
 * - SpecFirst phases MUST execute in their mapped Algorithm phase
 * - propose/specify/plan execute in PLAN
 * - implement/release execute in BUILD
 * - Execution in other phases (OBSERVE, THINK, VERIFY, LEARN) is not allowed
 * 
 * ISC #47: SpecFirst executes within Algorithm PLAN BUILD phases
 * 
 * @param specFirstPhase - The SpecFirst phase to check
 * @param currentAlgorithmPhase - The current Algorithm phase
 * @returns true if execution is allowed, false otherwise
 * 
 * @example
 * ```typescript
 * canExecuteInPhase("propose", "PLAN");   // true
 * canExecuteInPhase("propose", "BUILD");  // false
 * canExecuteInPhase("implement", "BUILD"); // true
 * canExecuteInPhase("implement", "PLAN"); // false
 * ```
 */
export function canExecuteInPhase(
  specFirstPhase: string,
  currentAlgorithmPhase: string
): boolean {
  try {
    const requiredPhase = mapToAlgorithmPhase(specFirstPhase);
    const normalizedCurrent = currentAlgorithmPhase.toUpperCase();
    
    return requiredPhase === normalizedCurrent;
  } catch {
    return false; // Invalid phase name
  }
}

/**
 * Gets complete phase mapping with execution permission.
 * 
 * @param specFirstPhase - The SpecFirst phase
 * @param currentAlgorithmPhase - Current Algorithm phase
 * @returns PhaseMapping with execution decision and reasoning
 * 
 * @example
 * ```typescript
 * const mapping = getPhaseMapping("propose", "PLAN");
 * // {
 * //   specFirstPhase: "propose",
 * //   algorithmPhase: "PLAN",
 * //   canExecute: true,
 * //   reason: "propose phase executes in PLAN phase"
 * // }
 * ```
 */
export function getPhaseMapping(
  specFirstPhase: string,
  currentAlgorithmPhase: string
): PhaseMapping {
  const normalized = specFirstPhase.toLowerCase() as SpecFirstPhase;
  const normalizedCurrent = currentAlgorithmPhase.toUpperCase() as AlgorithmPhase;
  
  if (!(normalized in PHASE_MAP)) {
    return {
      specFirstPhase: normalized,
      algorithmPhase: normalizedCurrent,
      canExecute: false,
      reason: `Invalid SpecFirst phase: "${specFirstPhase}"`,
    };
  }
  
  const requiredPhase = PHASE_MAP[normalized];
  const canExec = requiredPhase === normalizedCurrent;
  
  const reason = canExec
    ? `${normalized} phase executes in ${requiredPhase} phase`
    : `${normalized} phase requires ${requiredPhase} phase, but currently in ${normalizedCurrent}`;
  
  return {
    specFirstPhase: normalized,
    algorithmPhase: requiredPhase,
    canExecute: canExec,
    reason,
  };
}

/**
 * Checks if SpecFirst is compatible with current Algorithm phase.
 * If not compatible, suggests which phase SpecFirst should wait for.
 * 
 * @param currentAlgorithmPhase - Current Algorithm phase
 * @returns PhaseCompatibility with suggestion
 * 
 * @example
 * ```typescript
 * // Currently in OBSERVE phase
 * const compat = checkPhaseCompatibility("OBSERVE");
 * // {
 * //   compatible: false,
 * //   suggestedAlgorithmPhase: "PLAN",
 * //   reason: "SpecFirst requires PLAN or BUILD phase. Currently in OBSERVE. Wait for PLAN."
 * // }
 * 
 * // Currently in PLAN phase
 * const compat2 = checkPhaseCompatibility("PLAN");
 * // {
 * //   compatible: true,
 * //   suggestedAlgorithmPhase: null,
 * //   reason: "SpecFirst can execute in PLAN phase"
 * // }
 * ```
 */
export function checkPhaseCompatibility(
  currentAlgorithmPhase: string
): PhaseCompatibility {
  const normalized = currentAlgorithmPhase.toUpperCase() as AlgorithmPhase;
  
  // SpecFirst executes in PLAN or BUILD phases only (ISC #47)
  const compatiblePhases: AlgorithmPhase[] = ["PLAN", "BUILD"];
  
  if (compatiblePhases.includes(normalized)) {
    return {
      compatible: true,
      suggestedAlgorithmPhase: null,
      reason: `SpecFirst can execute in ${normalized} phase`,
    };
  }
  
  // Not compatible - suggest next compatible phase
  const phaseSequence: AlgorithmPhase[] = [
    "OBSERVE",
    "THINK",
    "PLAN",
    "BUILD",
    "EXECUTE",
    "VERIFY",
    "LEARN",
  ];
  
  const currentIndex = phaseSequence.indexOf(normalized);
  let suggestedPhase: AlgorithmPhase | null = null;
  
  // Find next compatible phase
  for (let i = currentIndex + 1; i < phaseSequence.length; i++) {
    if (compatiblePhases.includes(phaseSequence[i])) {
      suggestedPhase = phaseSequence[i];
      break;
    }
  }
  
  // If no future compatible phase, suggest PLAN (start of next cycle)
  if (!suggestedPhase) {
    suggestedPhase = "PLAN";
  }
  
  return {
    compatible: false,
    suggestedAlgorithmPhase: suggestedPhase,
    reason: `SpecFirst requires PLAN or BUILD phase. Currently in ${normalized}. Wait for ${suggestedPhase}.`,
  };
}

/**
 * Gets all SpecFirst phases that can execute in a given Algorithm phase.
 * 
 * @param algorithmPhase - Algorithm phase to check
 * @returns Array of SpecFirst phases that can execute
 * 
 * @example
 * ```typescript
 * getExecutablePhasesFor("PLAN");
 * // ["propose", "specify", "plan"]
 * 
 * getExecutablePhasesFor("BUILD");
 * // ["implement", "release"]
 * 
 * getExecutablePhasesFor("OBSERVE");
 * // []
 * ```
 */
export function getExecutablePhasesFor(algorithmPhase: string): SpecFirstPhase[] {
  const normalized = algorithmPhase.toUpperCase() as AlgorithmPhase;
  
  return Object.entries(PHASE_MAP)
    .filter(([_, algPhase]) => algPhase === normalized)
    .map(([specPhase, _]) => specPhase as SpecFirstPhase);
}

/**
 * Gets the complete phase execution matrix.
 * Useful for debugging and documentation.
 * 
 * @returns Matrix showing which SpecFirst phases execute in which Algorithm phases
 */
export function getPhaseMatrix(): Record<SpecFirstPhase, AlgorithmPhase> {
  return { ...PHASE_MAP };
}

// Export for testing
export const __testing = {
  PHASE_MAP,
  mapToAlgorithmPhase,
  canExecuteInPhase,
  getPhaseMapping,
  checkPhaseCompatibility,
  getExecutablePhasesFor,
  getPhaseMatrix,
};

// Self-test when run directly with: bun algorithm/phase-integration.ts
if (import.meta.main) {
  console.log("🧪 Testing Phase Integration\n");
  
  // Test 1: Phase mapping
  console.log("Test 1: SpecFirst → Algorithm phase mapping");
  const phases: SpecFirstPhase[] = ["propose", "specify", "plan", "implement", "release"];
  phases.forEach(phase => {
    const algPhase = mapToAlgorithmPhase(phase);
    console.log(`  ${phase.padEnd(10)} → ${algPhase}`);
  });
  console.log("  ✅ PASS - All phases mapped");
  console.log();
  
  // Test 2: Execution permission in PLAN phase
  console.log("Test 2: Execution permission in PLAN phase");
  const planPhases = ["propose", "specify", "plan"];
  const planAllowed = planPhases.every(p => canExecuteInPhase(p, "PLAN"));
  console.log(`  propose/specify/plan can execute in PLAN: ${planAllowed ? "✅ PASS" : "❌ FAIL"}`);
  
  const buildPhasesBlocked = ["implement", "release"].every(p => !canExecuteInPhase(p, "PLAN"));
  console.log(`  implement/release blocked in PLAN: ${buildPhasesBlocked ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 3: Execution permission in BUILD phase
  console.log("Test 3: Execution permission in BUILD phase");
  const buildPhases = ["implement", "release"];
  const buildAllowed = buildPhases.every(p => canExecuteInPhase(p, "BUILD"));
  console.log(`  implement/release can execute in BUILD: ${buildAllowed ? "✅ PASS" : "❌ FAIL"}`);
  
  const planPhasesBlocked = ["propose", "specify", "plan"].every(p => !canExecuteInPhase(p, "BUILD"));
  console.log(`  propose/specify/plan blocked in BUILD: ${planPhasesBlocked ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 4: ISC Criterion Verification
  console.log("Test 4: ISC Criterion Verification");
  
  // ISC #47: SpecFirst executes within Algorithm PLAN BUILD phases
  const allInPlanOrBuild = phases.every(phase => {
    const algPhase = mapToAlgorithmPhase(phase);
    return algPhase === "PLAN" || algPhase === "BUILD";
  });
  console.log(`  ISC #47 (All phases in PLAN or BUILD): ${allInPlanOrBuild ? "✅ PASS" : "❌ FAIL"}`);
  
  // Verify no execution in other phases
  const otherPhases: AlgorithmPhase[] = ["OBSERVE", "THINK", "EXECUTE", "VERIFY", "LEARN"];
  const noExecInOther = otherPhases.every(algPhase =>
    phases.every(specPhase => !canExecuteInPhase(specPhase, algPhase))
  );
  console.log(`  No execution in OBSERVE/THINK/EXECUTE/VERIFY/LEARN: ${noExecInOther ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 5: Phase compatibility check
  console.log("Test 5: Phase compatibility check");
  
  const planCompat = checkPhaseCompatibility("PLAN");
  console.log(`  PLAN phase compatible: ${planCompat.compatible ? "✅ PASS" : "❌ FAIL"}`);
  
  const buildCompat = checkPhaseCompatibility("BUILD");
  console.log(`  BUILD phase compatible: ${buildCompat.compatible ? "✅ PASS" : "❌ FAIL"}`);
  
  const observeCompat = checkPhaseCompatibility("OBSERVE");
  console.log(`  OBSERVE phase incompatible: ${!observeCompat.compatible ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`    Suggested phase: ${observeCompat.suggestedAlgorithmPhase}`);
  console.log();
  
  // Test 6: Get executable phases for Algorithm phase
  console.log("Test 6: Executable phases per Algorithm phase");
  
  const planExec = getExecutablePhasesFor("PLAN");
  console.log(`  PLAN phase: ${planExec.join(", ")}`);
  const planCorrect = planExec.length === 3 && planExec.includes("propose");
  console.log(`    ${planCorrect ? "✅ PASS - propose/specify/plan" : "❌ FAIL"}`);
  
  const buildExec = getExecutablePhasesFor("BUILD");
  console.log(`  BUILD phase: ${buildExec.join(", ")}`);
  const buildCorrect = buildExec.length === 2 && buildExec.includes("implement");
  console.log(`    ${buildCorrect ? "✅ PASS - implement/release" : "❌ FAIL"}`);
  
  const observeExec = getExecutablePhasesFor("OBSERVE");
  console.log(`  OBSERVE phase: ${observeExec.length > 0 ? observeExec.join(", ") : "none"}`);
  const observeCorrect = observeExec.length === 0;
  console.log(`    ${observeCorrect ? "✅ PASS - no phases" : "❌ FAIL"}`);
  console.log();
  
  // Test 7: Phase mapping with reason
  console.log("Test 7: Phase mapping with execution reason");
  const mapping1 = getPhaseMapping("propose", "PLAN");
  console.log(`  propose in PLAN: ${mapping1.canExecute ? "✅ ALLOWED" : "❌ BLOCKED"}`);
  console.log(`    Reason: ${mapping1.reason}`);
  
  const mapping2 = getPhaseMapping("implement", "PLAN");
  console.log(`  implement in PLAN: ${!mapping2.canExecute ? "✅ BLOCKED" : "❌ ALLOWED (should block)"}`);
  console.log(`    Reason: ${mapping2.reason}`);
  console.log();
  
  // Test 8: Invalid phase handling
  console.log("Test 8: Invalid phase handling");
  try {
    mapToAlgorithmPhase("invalid");
    console.log("  ❌ FAIL - Should throw error for invalid phase");
  } catch (error) {
    const err = error as Error;
    console.log(`  ✅ PASS - Invalid phase rejected: ${err.message.split(".")[0]}`);
  }
  console.log();
  
  // Test 9: Phase matrix
  console.log("Test 9: Phase matrix display");
  const matrix = getPhaseMatrix();
  console.log("  Phase Matrix:");
  Object.entries(matrix).forEach(([spec, alg]) => {
    console.log(`    ${spec.padEnd(10)} → ${alg}`);
  });
  console.log("  ✅ PASS - Matrix accessible");
  console.log();
  
  console.log("🎯 Self-test complete");
  console.log("\n📖 Usage Examples:");
  console.log("\n1. Map SpecFirst phase to Algorithm phase:");
  console.log('   const algPhase = mapToAlgorithmPhase("propose"); // "PLAN"');
  console.log("\n2. Check if execution is allowed:");
  console.log('   const allowed = canExecuteInPhase("implement", "BUILD"); // true');
  console.log("\n3. Get complete mapping with reason:");
  console.log('   const mapping = getPhaseMapping("propose", "PLAN");');
  console.log("\n4. Check phase compatibility:");
  console.log('   const compat = checkPhaseCompatibility("OBSERVE");');
}
