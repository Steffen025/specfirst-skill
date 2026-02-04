/**
 * Artifact Types - SpecFirst 3.0
 * 
 * Type definitions for all SpecFirst artifact structures.
 * 
 * @module artifacts/types
 * @version 3.0.0
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

export interface ISCCriterion {
  id: number;
  criterion: string;  // Exactly 8 words
  status: "⬜" | "🔄" | "✅" | "❌";
  evidence?: string;
  phase?: string;  // Implementation phase this belongs to
}

export interface AntiCriterion {
  id: string;  // A1, A2, etc.
  criterion: string;
  status: "👀" | "✅" | "❌";
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
