/**
 * Artifact Generators - SpecFirst 3.0
 * 
 * Re-exports all artifact generators for convenient imports.
 * 
 * @module artifacts
 * @version 3.0.0
 */

// Types
export type {
  ArtifactFrontmatter,
  ProposalArtifact,
  SolutionApproach,
  SpecArtifact,
  FunctionalRequirement,
  NonFunctionalRequirement,
  UserStory,
  SuccessCriterion,
  PlanArtifact,
  ADR,
  Alternative,
  ImplementationPhase,
  TestingStrategy,
  Risk,
  Dependency,
  TasksArtifact,
  ISCCriterion,
  AntiCriterion,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./types";

// Proposal
export {
  generateProposal,
  createProposalTemplate,
  validateProposal,
} from "./proposal";

// Spec
export {
  generateSpec,
  createSpecTemplate,
  validateSpec,
} from "./spec";

// Plan
export {
  generatePlan,
  createPlanTemplate,
  validatePlan,
} from "./plan";

// Tasks (ISC format)
export {
  generateTasks,
  createTasksTemplate,
  validateTasks,
  validateCriterionWordCount,
  parseTasksFile,
} from "./tasks";
