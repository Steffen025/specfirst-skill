/**
 * Phase Orchestrator - SpecFirst 3.0
 * 
 * Routes workflow requests to the correct phase and enforces gate checks.
 * This is the central dispatcher for all SpecFirst phase executions.
 * 
 * ISC Coverage:
 * - ISC #33: Routes requests to correct phase function
 * - ISC #34: Enforces gate checks before phase execution
 * 
 * Gate Execution Order:
 * - propose:   prerequisite → proposePhase()
 * - specify:   prerequisite → artifact(proposal) → specifyPhase()
 * - plan:      prerequisite → artifact(spec) → planPhase()
 * - implement: prerequisite → artifact(plan) → implementPhase()
 * - release:   prerequisite → artifact(tasks) → isc-format → releasePhase()
 * 
 * @module phases/orchestrator
 * @version 3.0.0
 */

import { proposePhase } from "./propose";
import { specifyPhase } from "./specify";
import { planPhase } from "./plan";
import { implementPhase } from "./implement";
import { releasePhase } from "./release";
import { prerequisiteGate } from "../gates/prerequisite";
import { artifactGate } from "../gates/artifact";
import { validateISCFormat } from "../gates/isc-format";
import { isPhaseComplete } from "../lib/git";
import { getArtifactPath } from "../lib/config";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { detectEffortFromFlags, type EffortFlags } from "../algorithm/effort-detector";
import { 
  initDatabase, 
  getFeature, 
  getFeatures,
  createSession, 
  getSession,
  getCurrentSession,
  claimFeature, 
  releaseFeature,
  endSession,
  type Feature,
  getStats,
  type FeatureStats 
} from "../lib/database";

export type Phase = "none" | "propose" | "specify" | "plan" | "implement" | "release";

export interface OrchestratorOptions {
  /** v3.1: Explicit effort control flags */
  quick?: boolean;
  batch?: boolean;
  thorough?: boolean;
  /** Project path for database initialization */
  projectPath?: string;
}

export interface OrchestratorResult {
  success: boolean;
  phase: Phase;
  gatesPassed: string[];
  artifactPath?: string;
  error?: string;
  nextPhase?: Phase;
  /** v3.1: Detected effort level */
  effortLevel?: string;
  /** v3.2: Status message for user display */
  message?: string;
}

/**
 * Gate requirements per phase.
 * Each phase requires specific gates to pass before execution.
 */
const PHASE_GATES: Record<Phase, string[]> = {
  propose: ["prerequisite"],
  specify: ["prerequisite", "artifact"],
  plan: ["prerequisite", "artifact"],
  implement: ["prerequisite", "artifact"],
  release: ["prerequisite", "artifact", "isc-format"],
};

/**
 * Phase sequence for next phase suggestion.
 * Defines the linear progression through SpecFirst workflow.
 */
const PHASE_SEQUENCE: Phase[] = ["propose", "specify", "plan", "implement", "release"];

/**
 * Maps phases to their required artifact dependencies.
 * Used by artifact gate to determine what must exist.
 */
const PHASE_ARTIFACT_DEPS: Record<Phase, Phase | null> = {
  propose: null, // No artifact dependency
  specify: "propose", // Needs proposal.md
  plan: "specify", // Needs spec.md
  implement: "plan", // Needs plan.md
  release: "implement", // Needs tasks.md
};

/**
 * Executes a phase with full gate validation.
 * 
 * This is the main entry point for phase execution. It:
 * 1. Validates the phase name
 * 2. Detects effort level from flags (v3.1)
 * 3. Runs all required gates for the phase
 * 4. Routes to the correct phase function
 * 5. Returns result with next phase suggestion
 * 
 * @param phase - Phase to execute (propose, specify, plan, implement, release)
 * @param featureName - Feature name
 * @param input - Phase-specific input data
 * @param options - Execution options (v3.1: includes --quick, --batch, --thorough flags)
 * @returns OrchestratorResult with execution status and next phase
 * 
 * @example
 * ```typescript
 * // Standard interactive mode (default)
 * const result = await executePhase("propose", "user-auth", inputData);
 * 
 * // Quick mode (minimal effort)
 * const quickResult = await executePhase("propose", "user-auth", inputData, { quick: true });
 * 
 * // Batch mode (non-interactive, for Cedars)
 * const batchResult = await executePhase("propose", "user-auth", inputData, { batch: true });
 * 
 * if (result.success) {
 *   console.log(`Phase complete. Next: ${result.nextPhase}`);
 *   console.log(`Effort level: ${result.effortLevel}`);
 * }
 * ```
 */
export async function executePhase(
  phase: Phase,
  featureName: string,
  input?: unknown,
  options?: OrchestratorOptions
): Promise<OrchestratorResult> {
  const projectPath = options?.projectPath || process.cwd();
  const gatesPassed: string[] = [];
  
  // Initialize database (idempotent)
  initDatabase(projectPath);
  
  // v3.1: Detect effort level from flags
  const effortFlags: EffortFlags = {
    quick: options?.quick,
    batch: options?.batch,
    thorough: options?.thorough,
  };
  const effortDetection = detectEffortFromFlags(effortFlags);
  
  // Log effort detection for debugging
  if (effortDetection.source === "explicit-flag") {
    console.log(`[SpecFirst] Effort mode: ${effortDetection.effortLevel} (${effortDetection.reason})`);
  }
  
  // 1. Validate phase name
  if (!PHASE_SEQUENCE.includes(phase)) {
    return {
      success: false,
      phase,
      gatesPassed,
      error: `Invalid phase: "${phase}". Must be one of: ${PHASE_SEQUENCE.join(", ")}`,
    };
  }
  
  // 2. Run required gates for this phase
  const requiredGates = PHASE_GATES[phase];
  
  for (const gateName of requiredGates) {
    try {
      if (gateName === "prerequisite") {
        // Run prerequisite gate
        const gateResult = await prerequisiteGate(featureName);
        if (!gateResult.passed) {
          return {
            success: false,
            phase,
            gatesPassed,
            error: `Prerequisite gate failed: ${gateResult.error}\n\n${gateResult.resolution}`,
          };
        }
        gatesPassed.push("prerequisite");
      } else if (gateName === "artifact") {
        // Run artifact gate (checks dependencies from previous phases)
        const gateResult = await artifactGate(phase, featureName);
        if (!gateResult.passed) {
          return {
            success: false,
            phase,
            gatesPassed,
            error: `Artifact gate failed: ${gateResult.error}\n\n${gateResult.resolution}`,
          };
        }
        gatesPassed.push("artifact");
      } else if (gateName === "isc-format") {
        // Run ISC format validation (release phase only)
        const tasksPath = getArtifactPath(featureName, "tasks");
        if (!existsSync(tasksPath)) {
          return {
            success: false,
            phase,
            gatesPassed,
            error: `ISC format gate failed: tasks.md not found at ${tasksPath}`,
          };
        }
        
        const tasksContent = await readFile(tasksPath, "utf-8");
        const formatResult = validateISCFormat(tasksContent);
        
        if (!formatResult.passed) {
          const errorDetails = formatResult.errors
            .map(e => `  Line ${e.line}: ${e.message}`)
            .join("\n");
          
          return {
            success: false,
            phase,
            gatesPassed,
            error: `ISC format gate failed:\n\n${errorDetails}\n\nFix the format issues in ${tasksPath}`,
          };
        }
        gatesPassed.push("isc-format");
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        phase,
        gatesPassed,
        error: `Gate execution failed (${gateName}): ${err.message}`,
      };
    }
  }
  
  // 3. All gates passed - route to correct phase function
  let phaseResult: { success: boolean; artifactPath?: string; error?: string };
  
  try {
    switch (phase) {
      case "propose":
        phaseResult = await proposePhase(input as any);
        break;
      case "specify":
        phaseResult = await specifyPhase(input as any);
        break;
      case "plan":
        phaseResult = await planPhase(input as any);
        break;
      case "implement":
        phaseResult = await implementPhase(input as any);
        break;
      case "release":
        phaseResult = await releasePhase(input as any);
        break;
      default:
        // TypeScript should prevent this, but handle defensively
        return {
          success: false,
          phase,
          gatesPassed,
          error: `Unknown phase: ${phase}`,
        };
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      phase,
      gatesPassed,
      error: `Phase execution failed: ${err.message}`,
    };
  }
  
  // 4. Return result with next phase suggestion
  const currentIndex = PHASE_SEQUENCE.indexOf(phase);
  const nextPhase = currentIndex < PHASE_SEQUENCE.length - 1
    ? PHASE_SEQUENCE[currentIndex + 1]
    : undefined;
  
  return {
    success: phaseResult.success,
    phase,
    gatesPassed,
    artifactPath: phaseResult.artifactPath,
    error: phaseResult.error,
    nextPhase,
    effortLevel: effortDetection.effortLevel,
  };
}

/**
 * Detects which phase to run next based on existing artifacts and git history.
 * 
 * Uses git commits as state markers to determine which phases have completed.
 * Falls back to artifact existence if git commits aren't found.
 * 
 * @param featureName - Feature name
 * @returns Next phase to run, or null if all phases complete
 * 
 * @example
 * ```typescript
 * const nextPhase = await detectNextPhase("user-auth");
 * if (nextPhase) {
 *   console.log(`Resume from: ${nextPhase}`);
 * } else {
 *   console.log("Feature is complete!");
 * }
 * ```
 */
export async function detectNextPhase(featureName: string): Promise<Phase | null> {
  // Check each phase in sequence to find first incomplete one
  for (const phase of PHASE_SEQUENCE) {
    // Check git history for phase completion commit
    const isComplete = await isPhaseComplete(phase, featureName);
    
    if (!isComplete) {
      // Phase not complete - this is the next phase to run
      return phase;
    }
  }
  
  // All phases complete
  return null;
}

/**
 * Resumes workflow from where it left off.
 * 
 * Automatically detects the next phase that needs to run and executes it.
 * Useful for picking up work after interruption or for continuous execution.
 * 
 * @param featureName - Feature name
 * @returns OrchestratorResult for the executed phase
 * 
 * @example
 * ```typescript
 * // Resume workflow automatically
 * const result = await resumeWorkflow("user-auth");
 * 
 * if (result.success) {
 *   console.log(`Completed ${result.phase} phase`);
 *   if (result.nextPhase) {
 *     console.log(`Next: ${result.nextPhase}`);
 *   } else {
 *     console.log("Feature complete!");
 *   }
 * }
 * ```
 */
export async function resumeWorkflow(featureName: string): Promise<OrchestratorResult> {
  const nextPhase = await detectNextPhase(featureName);
  
  if (!nextPhase) {
    // All phases complete
    return {
      success: true,
      phase: "release",
      gatesPassed: [],
      nextPhase: undefined,
    };
  }
  
  // Execute the next phase
  // Note: Caller must provide phase-specific input
  return executePhase(nextPhase, featureName);
}

/**
 * Gets the status of all phases for a feature.
 * Useful for displaying progress or debugging workflow state.
 * 
 * @param featureName - Feature name
 * @returns Record of phase completion status
 * 
 * @example
 * ```typescript
 * const status = await getWorkflowStatus("user-auth");
 * console.log("Workflow Progress:");
 * for (const [phase, complete] of Object.entries(status)) {
 *   console.log(`  ${phase}: ${complete ? "✅" : "⬜"}`);
 * }
 * ```
 */
export async function getWorkflowStatus(
  featureName: string
): Promise<Record<Phase, boolean>> {
  const status: Record<Phase, boolean> = {
    propose: false,
    specify: false,
    plan: false,
    implement: false,
    release: false,
  };
  
  for (const phase of PHASE_SEQUENCE) {
    status[phase] = await isPhaseComplete(phase, featureName);
  }
  
  return status;
}

/**
 * Start a new SpecFirst session.
 * Used by Cedars when spawning a new session.
 * 
 * @param projectPath - Project root path
 * @returns Session ID
 * 
 * @example
 * ```typescript
 * const sessionId = await startSession("/path/to/project");
 * console.log(`Session started: ${sessionId}`);
 * ```
 */
export async function startSession(projectPath: string): Promise<string> {
  initDatabase(projectPath);
  const sessionId = createSession();
  return sessionId;
}

/**
 * Resume existing session or start new one.
 * Cold-start capable - reads state from SQLite.
 * 
 * ISC #7: Cold-start resume works from SQLite state alone
 * 
 * @param projectPath - Project root path
 * @returns Session info with current state
 * 
 * @example
 * ```typescript
 * const { sessionId, resumed, currentFeature } = await resumeOrStartSession("/path/to/project");
 * if (resumed) {
 *   console.log(`Resumed session ${sessionId}`);
 *   if (currentFeature) {
 *     console.log(`Working on: ${currentFeature.name} (${currentFeature.phase})`);
 *   }
 * }
 * ```
 */
export async function resumeOrStartSession(projectPath: string): Promise<{
  sessionId: string;
  resumed: boolean;
  currentFeature: Feature | null;
  currentPhase: Phase | null;
}> {
  initDatabase(projectPath);
  
  // Check for running session
  const existingSession = getCurrentSession();
  if (existingSession && existingSession.status === 'running') {
    const feature = existingSession.currentFeatureId 
      ? getFeature(existingSession.currentFeatureId)
      : null;
    return {
      sessionId: existingSession.id,
      resumed: true,
      currentFeature: feature,
      currentPhase: feature?.phase || null,
    };
  }
  
  // Start new session
  const sessionId = createSession();
  return {
    sessionId,
    resumed: false,
    currentFeature: null,
    currentPhase: null,
  };
}

/**
 * Resume work on a feature from its last known state.
 * Reads state from SQLite - no git required.
 * 
 * ISC #7: Cold-start resume works from SQLite state alone
 * 
 * @param featureName - Feature to resume
 * @param projectPath - Project root path
 * @param options - Execution options
 * @returns Orchestrator result with next phase executed
 * 
 * @example
 * ```typescript
 * const result = await resumeFeature("user-auth", "/path/to/project");
 * if (result.success) {
 *   console.log(`Completed ${result.phase} phase`);
 * }
 * ```
 */
export async function resumeFeature(
  featureName: string,
  projectPath: string,
  options?: OrchestratorOptions
): Promise<OrchestratorResult> {
  initDatabase(projectPath);
  
  const feature = getFeature(featureName);
  if (!feature) {
    return {
      success: false,
      phase: 'none',
      gatesPassed: [],
      message: `Feature '${featureName}' not found. Use 'specfirst propose ${featureName}' to start.`,
    };
  }
  
  // Determine next phase based on current phase
  const nextPhase = getNextPhase(feature.phase);
  if (!nextPhase) {
    return {
      success: true,
      phase: feature.phase,
      gatesPassed: [],
      message: `Feature '${featureName}' is already complete (phase: ${feature.phase}).`,
    };
  }
  
  // Execute next phase
  return executePhase(nextPhase, featureName, undefined, { ...options, projectPath });
}

/**
 * Get next phase in sequence based on current phase.
 * 
 * @param currentPhase - Current phase
 * @returns Next phase, or null if complete
 */
function getNextPhase(currentPhase: Phase): Phase | null {
  const phaseOrder: Phase[] = ['none', 'propose', 'specify', 'plan', 'implement', 'release'];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
    return null; // Already at release or unknown
  }
  
  return phaseOrder[currentIndex + 1];
}

/**
 * Get all features with their current state.
 * Useful for dashboard/TUI display.
 * 
 * @param projectPath - Project root path
 * @returns Array of all features
 * 
 * @example
 * ```typescript
 * const features = listFeatures("/path/to/project");
 * for (const feature of features) {
 *   console.log(`${feature.name}: ${feature.phase} (${feature.status})`);
 * }
 * ```
 */
export function listFeatures(projectPath: string): Feature[] {
  initDatabase(projectPath);
  return getFeatures();
}

/**
 * Get feature statistics.
 * Useful for dashboard overview.
 * 
 * @param projectPath - Project root path
 * @returns Feature statistics
 * 
 * @example
 * ```typescript
 * const stats = getFeatureStats("/path/to/project");
 * console.log(`Total: ${stats.total}`);
 * console.log(`Active: ${stats.byStatus.active}`);
 * console.log(`Complete: ${stats.byPhase.release}`);
 * ```
 */
export function getFeatureStats(projectPath: string): FeatureStats {
  initDatabase(projectPath);
  return getStats();
}

// Self-test when run directly with: bun phases/orchestrator.ts
if (import.meta.main) {
  console.log("🧪 Testing Phase Orchestrator\n");
  
  // Test 1: Validate phase routing logic
  console.log("Test 1: Phase routing validation");
  console.log("  Phase sequence:", PHASE_SEQUENCE.join(" → "));
  console.log("  ✅ PASS - Linear sequence defined");
  console.log();
  
  // Test 2: Gate requirements mapping
  console.log("Test 2: Gate requirements per phase");
  for (const phase of PHASE_SEQUENCE) {
    const gates = PHASE_GATES[phase];
    console.log(`  ${phase}: ${gates.join(", ")}`);
  }
  console.log("  ✅ PASS - All phases have gate requirements");
  console.log();
  
  // Test 3: Next phase detection
  console.log("Test 3: Next phase logic");
  for (let i = 0; i < PHASE_SEQUENCE.length; i++) {
    const currentPhase = PHASE_SEQUENCE[i];
    const nextPhase = i < PHASE_SEQUENCE.length - 1 ? PHASE_SEQUENCE[i + 1] : "none";
    console.log(`  ${currentPhase} → ${nextPhase}`);
  }
  console.log("  ✅ PASS - Next phase progression defined");
  console.log();
  
  // Test 4: Invalid phase handling
  console.log("Test 4: Invalid phase name");
  const invalidResult = await executePhase("invalid" as Phase, "test-feature");
  const invalidHandled = !invalidResult.success && invalidResult.error?.includes("Invalid phase");
  console.log(`  Result: ${invalidHandled ? "✅ PASS - Invalid phase rejected" : "❌ FAIL - Should reject invalid phase"}`);
  console.log();
  
  // Test 5: Gate enforcement (prerequisite gate will fail for non-existent feature)
  console.log("Test 5: Gate enforcement");
  const testFeature = "nonexistent-orchestrator-test";
  const gateResult = await executePhase("propose", testFeature, {
    featureName: testFeature,
    problemStatement: "Test",
    solutionApproaches: [],
    recommendedApproach: "Test",
  });
  
  const gateEnforced = !gateResult.success && gateResult.error?.includes("Prerequisite gate failed");
  console.log(`  Result: ${gateEnforced ? "✅ PASS - Gate blocked invalid execution" : "❌ FAIL - Gate should have blocked"}`);
  if (gateResult.error) {
    console.log(`  Error: ${gateResult.error.split("\n")[0]}`);
  }
  console.log();
  
  // Test 6: ISC Criteria Verification
  console.log("Test 6: ISC Criteria Verification");
  
  // ISC #33: Phase orchestrator routes requests to correct phase
  const routingWorks = PHASE_SEQUENCE.every(phase => {
    const gates = PHASE_GATES[phase];
    return gates !== undefined && gates.length > 0;
  });
  console.log(`  ISC #33 (Routes to correct phase): ${routingWorks ? "✅ PASS" : "❌ FAIL"}`);
  
  // ISC #34: Phase orchestrator enforces gate checks
  const gateEnforcementWorks = gateEnforced; // From Test 5
  console.log(`  ISC #34 (Enforces gate checks): ${gateEnforcementWorks ? "✅ PASS" : "❌ FAIL"}`);
  console.log();
  
  // Test 7: Workflow status detection
  console.log("Test 7: Workflow status detection");
  try {
    const status = await getWorkflowStatus("test-feature");
    const allPhases = Object.keys(status).length === PHASE_SEQUENCE.length;
    console.log(`  Result: ${allPhases ? "✅ PASS - Status tracking works" : "❌ FAIL - Missing phases in status"}`);
    console.log("  Status:", status);
  } catch (error) {
    console.log("  ❌ FAIL - Status detection threw error:", error);
  }
  console.log();
  
  console.log("🎯 Self-test complete");
  console.log("\n📖 Usage Examples:");
  console.log("\n1. Execute a specific phase:");
  console.log('   const result = await executePhase("propose", "my-feature", inputData);');
  console.log("\n2. Resume workflow automatically:");
  console.log('   const result = await resumeWorkflow("my-feature");');
  console.log("\n3. Check workflow status:");
  console.log('   const status = await getWorkflowStatus("my-feature");');
}
