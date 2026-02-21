/**
 * Artifact Types - SpecFirst 4.0
 * 
 * Type definitions for all SpecFirst artifact structures.
 * Updated for Algorithm v1.8.0 compatibility.
 * 
 * @module artifacts/types
 * @version 4.0.0
 */

/**
 * YAML frontmatter common to all artifacts
 */
export interface ArtifactFrontmatter {
  feature: string;
  phase: string;
  status: "draft" | "review" | "complete";
  created: string;  // ISO date
  updated?: string; // ISO date
  version?: string;
  author?: string;
}

/**
 * Proposal artifact structure
 */
export interface ProposalArtifact {
  frontmatter: ArtifactFrontmatter & {
    phase: "propose";
  };
  problemStatement: string;
  solutionApproaches: SolutionApproach[];
  recommendedApproach: string;
  antiPatterns: string[];
  openQuestions?: string[];
}

export interface SolutionApproach {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

/**
 * Spec artifact structure
 */
export interface SpecArtifact {
  frontmatter: ArtifactFrontmatter & {
    phase: "specify";
    based_on: string;  // proposal.md reference
    milestone?: string; // Linear milestone
  };
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  userStories: UserStory[];
  successCriteria: SuccessCriterion[];
  architectureDiagram?: string;
}

export interface FunctionalRequirement {
  id: string;  // FR-001
  description: string;
  priority: "must" | "should" | "could" | "wont";
  verificationMethod: string;
}

export interface NonFunctionalRequirement {
  id: string;  // NFR-001
  description: string;
  metric: string;
  target: string;
}

export interface UserStory {
  id: string;  // US-001
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface SuccessCriterion {
  id: string;  // SC-001
  description: string;
  verificationMethod: string;
}

/**
 * Plan artifact structure
 */
export interface PlanArtifact {
  frontmatter: ArtifactFrontmatter & {
    phase: "plan";
    based_on: string;  // spec.md reference
  };
  executiveSummary: string;
  adrs: ADR[];
  implementationPhases: ImplementationPhase[];
  testingStrategy: TestingStrategy;
  riskMatrix: Risk[];
  rollbackProcedures: string;
  dependencies: Dependency[];
}

export interface ADR {
  id: string;  // ADR-001
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  date: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives: Alternative[];
  consequences: string[];
}

export interface Alternative {
  name: string;
  reason: string;
}

export interface ImplementationPhase {
  number: number;
  name: string;
  objective: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  estimatedEffort: string;
  dependencies: string[];
  risks: string[];
}

export interface TestingStrategy {
  unitTests: string;
  integrationTests: string;
  e2eTests: string;
  performanceTests: string;
  coverageTarget: string;
}

export interface Risk {
  id: string;  // R-001
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}

export interface Dependency {
  name: string;
  type: "internal" | "external";
  risk: "low" | "medium" | "high";
  mitigation: string;
}

/**
 * Tasks artifact structure (ISC format)
 */
export interface TasksArtifact {
  frontmatter: ArtifactFrontmatter & {
    phase: "implement";
    based_on: string;  // plan.md reference
  };
  ideal: string;  // 1-2 sentence ideal outcome
  criteria: ISCCriterion[];
  antiCriteria: AntiCriterion[];
  progress: {
    completed: number;
    total: number;
    status: "pending" | "in_progress" | "complete";
  };
  parallelizationOpportunities?: string[];
  implementationNotes?: string;
}

/** Confidence tag indicating how the criterion was derived */
export type ConfidenceTag = "E" | "I" | "R"; // Explicit, Inferred, Reverse-engineered

/** Priority classification for criteria */
export type PriorityLevel = "CRITICAL" | "IMPORTANT" | "NICE";

/** Verification method category (Algorithm v1.8.0) */
export type VerifyMethod = "CLI" | "Test" | "Static" | "Browser" | "Grep" | "Read" | "Custom";

/** ISC criterion status — maps to Algorithm TaskCreate statuses */
export type ISCStatus = "⬜" | "🔄" | "✅" | "❌";

/** Algorithm TaskCreate status equivalents */
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

/** Map ISC status symbols to Algorithm TaskCreate statuses */
export const STATUS_MAP: Record<ISCStatus, TaskStatus> = {
  "⬜": "pending",
  "🔄": "in_progress",
  "✅": "completed",
  "❌": "failed",
};

export interface ISCCriterion {
  id: number | string;  // Numeric or ISC-C{N} format
  criterion: string;  // 8-12 words (Algorithm v1.8.0)
  status: ISCStatus;
  evidence?: string;
  phase?: string;  // Implementation phase this belongs to
  /** Inline verification method (Algorithm v1.8.0) — e.g. "CLI: bun test" */
  verifyMethod?: string;
  /** Verification method category */
  verifyType?: VerifyMethod;
  /** Confidence tag: [E]xplicit, [I]nferred, [R]everse-engineered */
  confidence?: ConfidenceTag;
  /** Priority classification */
  priority?: PriorityLevel;
}

export interface AntiCriterion {
  id: string;  // ISC-A{N} format (was A1, A2, etc.)
  criterion: string;  // 8-12 words (Algorithm v1.8.0)
  status: "👀" | "✅" | "❌";
  /** Inline verification method (Algorithm v1.8.0) */
  verifyMethod?: string;
  /** Verification method category */
  verifyType?: VerifyMethod;
  /** Confidence tag */
  confidence?: ConfidenceTag;
  /** Priority classification */
  priority?: PriorityLevel;
}

/**
 * Validation result for artifacts
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  line?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  line?: number;
}
