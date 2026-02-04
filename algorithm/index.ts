/**
 * Algorithm Integration Module - SpecFirst 3.0
 * 
 * Connects SpecFirst with the PAI Algorithm by providing:
 * - Effort level detection (DETERMINED triggers SpecFirst)
 * - Phase integration (SpecFirst executes in PLAN/BUILD phases)
 * - ISC format conversion (tasks.md → Algorithm ISC tracker)
 * 
 * ISC Coverage:
 * - ISC #46: DETERMINED effort detection triggers SpecFirst capability activation
 * - ISC #47: SpecFirst executes within Algorithm PLAN BUILD phases
 * - ISC #48: ISC format converter loads tasks into tracker
 * - ISC #49: Algorithm ISC tracker remains primary state mechanism
 * 
 * @module algorithm
 * @version 3.0.0
 */

// Effort Detection (ISC #46)
export {
  detectEffortLevel,
  shouldTriggerSpecFirst,
  createDeterminedDetection,
  isValidEffortDetection,
  type EffortLevel,
  type EffortDetection,
} from "./effort-detector";

// Phase Integration (ISC #47)
export {
  mapToAlgorithmPhase,
  canExecuteInPhase,
  getPhaseMapping,
  checkPhaseCompatibility,
  getExecutablePhasesFor,
  getPhaseMatrix,
  type SpecFirstPhase,
  type AlgorithmPhase,
  type PhaseMapping,
  type PhaseCompatibility,
} from "./phase-integration";

// ISC Loader (ISC #48, #49)
export {
  loadTasksIntoTracker,
  parseISCTable,
  validateLoadedISC,
  formatAsAlgorithmTracker,
  type ISCStatus,
  type ISCEntry,
  type AntiCriterionEntry,
  type LoadedISC,
} from "./isc-loader";
