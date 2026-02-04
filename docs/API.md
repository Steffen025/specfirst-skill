# SpecFirst 3.0 API Reference

**Complete API documentation for all SpecFirst public interfaces.**

---

## Table of Contents

- [Platform Detection](#platform-detection) (`lib/platform`)
- [Configuration](#configuration) (`lib/config`)
- [Git Automation](#git-automation) (`lib/git`)
- [Quality Gates](#quality-gates) (`gates/`)
- [Phase Orchestration](#phase-orchestration) (`phases/orchestrator`)
- [Phase Implementations](#phase-implementations) (`phases/`)
- [Algorithm Integration](#algorithm-integration) (`algorithm/`)
- [Artifact Types](#artifact-types) (`artifacts/types`)
- [Linear Integration](#linear-integration) (`integrations/`)

---

## Platform Detection

**Module:** `lib/platform.ts`

Platform-agnostic path resolution for OpenCode and Claude Code.

### Types

```typescript
type Platform = "opencode" | "claudecode" | "unknown";

interface PlatformInfo {
  platform: Platform;
  rootDir: string;
  skillsDir: string;
  memoryDir: string;
  executionDir: string;
  projectsDir: string;
}
```

### Functions

#### `detectPlatform()`

Detects the current platform based on environment variables and directory structure.

**Returns:** `Platform`

**Priority Order:**
1. `OPENCODE_DIR` environment variable
2. `PAI_DIR` environment variable
3. Directory structure detection (`~/.opencode` vs `~/.claude`)

**Example:**
```typescript
import { detectPlatform } from "./lib/platform";

const platform = detectPlatform();
console.log(platform); // "opencode" | "claudecode" | "unknown"
```

---

#### `getRootDir()`

Gets the root directory for the current platform.

**Returns:** `string` - Absolute path to platform root

**Throws:** `Error` if platform cannot be detected

**Example:**
```typescript
import { getRootDir } from "./lib/platform";

const rootDir = getRootDir();
console.log(rootDir); // "/Users/steffen/.opencode"
```

---

#### `getPlatformInfo()`

Gets complete platform information including all standard directories.

**Returns:** `PlatformInfo`

**Example:**
```typescript
import { getPlatformInfo } from "./lib/platform";

const info = getPlatformInfo();
console.log(info);
// {
//   platform: "opencode",
//   rootDir: "/Users/steffen/.opencode",
//   skillsDir: "/Users/steffen/.opencode/skills",
//   memoryDir: "/Users/steffen/.opencode/MEMORY",
//   executionDir: "/Users/steffen/.opencode/MEMORY/execution",
//   projectsDir: "/Users/steffen/.opencode/MEMORY/projects"
// }
```

---

#### `resolvePath(relativePath: string)`

Resolves a relative path to an absolute path based on platform root.

**Parameters:**
- `relativePath` - Path relative to platform root (e.g., "skills/SpecFirst")

**Returns:** `string` - Absolute path

**Example:**
```typescript
import { resolvePath } from "./lib/platform";

const path = resolvePath("skills/SpecFirst");
// "/Users/steffen/.opencode/skills/SpecFirst"

const homePath = resolvePath("~/Documents");
// "/Users/steffen/Documents"
```

---

#### `getFeatureDir(featureName: string)`

Gets the feature execution directory for a given feature name.

**Parameters:**
- `featureName` - Name of the feature (e.g., "contact-enrichment")

**Returns:** `string` - Absolute path to feature directory

**Example:**
```typescript
import { getFeatureDir } from "./lib/platform";

const featureDir = getFeatureDir("user-auth");
// "/Users/steffen/.opencode/MEMORY/execution/Features/user-auth"
```

---

#### `getProjectDir(projectName: string)`

Gets the project directory for a given project name.

**Parameters:**
- `projectName` - Name of the project (e.g., "specfirst-3.0")

**Returns:** `string` - Absolute path to project directory

**Example:**
```typescript
import { getProjectDir } from "./lib/platform";

const projectDir = getProjectDir("my-project");
// "/Users/steffen/.opencode/MEMORY/projects/my-project"
```

---

#### `getSpecsDir(featureName: string)`

Gets the specs directory for a given feature.

**Parameters:**
- `featureName` - Name of the feature

**Returns:** `string` - Absolute path to specs directory

**Example:**
```typescript
import { getSpecsDir } from "./lib/platform";

const specsDir = getSpecsDir("webhook-support");
// "/Users/steffen/.opencode/MEMORY/execution/Features/webhook-support/specs"
```

---

#### `isOpenCode()` / `isClaudeCode()`

Platform check convenience functions.

**Returns:** `boolean`

**Example:**
```typescript
import { isOpenCode, isClaudeCode } from "./lib/platform";

if (isOpenCode()) {
  console.log("Running on OpenCode");
}
```

---

## Configuration

**Module:** `lib/config.ts`

Environment-based configuration with zero hardcoded paths.

### Types

```typescript
interface SpecFirstConfig {
  platform: PlatformInfo;
  skillDir: string;
  templatesDir: string;
  workflowsDir: string;
  getFeaturePaths: (featureName: string) => FeaturePaths;
  linearApiToken: string | undefined;
  linearTeamId: string | undefined;
  linearEnabled: boolean;
  gitAutoCommit: boolean;
  gitBranch: string | undefined;
  iscWordCount: number;
  artifactMaxSizeKb: number;
  gateTimeoutMs: number;
}

interface FeaturePaths {
  featureDir: string;
  specsDir: string;
  proposalPath: string;
  specPath: string;
  planPath: string;
  tasksPath: string;
  constitutionPath: string;
}
```

### Functions

#### `getConfig()`

Gets the complete SpecFirst configuration.

**Returns:** `SpecFirstConfig`

**Configuration Sources (priority order):**
1. Environment variables
2. Platform defaults

**Example:**
```typescript
import { getConfig } from "./lib/config";

const config = getConfig();
console.log(config.linearEnabled); // true if LINEAR_API_TOKEN set
console.log(config.iscWordCount); // 8 (always)
```

---

#### `validateEnvironment()`

Validates that required environment variables are set.

**Returns:** `{ valid: boolean; missing: string[] }`

**Example:**
```typescript
import { validateEnvironment } from "./lib/config";

const validation = validateEnvironment();
if (!validation.valid) {
  console.error("Missing:", validation.missing);
}
```

---

#### `getArtifactPath(featureName, artifactType)`

Gets artifact path for a specific artifact type in a feature.

**Parameters:**
- `featureName` - Feature name
- `artifactType` - `"proposal" | "spec" | "plan" | "tasks" | "constitution"`

**Returns:** `string` - Absolute path to artifact

**Example:**
```typescript
import { getArtifactPath } from "./lib/config";

const specPath = getArtifactPath("webhook-support", "spec");
// ".../.opencode/MEMORY/execution/Features/webhook-support/specs/spec.md"
```

---

#### `ensureFeatureDirectories(featureName)`

Ensures all required directories exist for a feature.

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<void>`

**Example:**
```typescript
import { ensureFeatureDirectories } from "./lib/config";

await ensureFeatureDirectories("webhook-support");
// Creates specs/ and project directories
```

---

## Git Automation

**Module:** `lib/git.ts`

Git operations for phase completion tracking.

### Types

```typescript
type Phase = "propose" | "specify" | "plan" | "implement" | "release";

interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

interface CommitInfo {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
}
```

### Functions

#### `isGitRepository(cwd?)`

Checks if the current directory is a git repository.

**Parameters:**
- `cwd` (optional) - Working directory to check

**Returns:** `Promise<boolean>`

**Example:**
```typescript
import { isGitRepository } from "./lib/git";

const isRepo = await isGitRepository();
if (!isRepo) {
  console.error("Not a git repository");
}
```

---

#### `getCurrentBranch(cwd?)`

Gets the current branch name.

**Parameters:**
- `cwd` (optional) - Working directory

**Returns:** `Promise<string | undefined>`

**Example:**
```typescript
import { getCurrentBranch } from "./lib/git";

const branch = await getCurrentBranch();
console.log(branch); // "main" | "feature/xyz" | undefined
```

---

#### `hasUncommittedChanges(cwd?)`

Checks if there are uncommitted changes.

**Parameters:**
- `cwd` (optional) - Working directory

**Returns:** `Promise<boolean>`

**Example:**
```typescript
import { hasUncommittedChanges } from "./lib/git";

if (await hasUncommittedChanges()) {
  console.log("You have uncommitted changes");
}
```

---

#### `createPhaseCommit(phase, featureName, artifactPath, cwd?)`

Creates a SpecFirst phase completion commit.

**Commit message format:**
```
SpecFirst: {phase} phase complete for {feature-name}

Artifact: specs/{artifact-name}
Status: complete
Timestamp: {ISO-8601}
```

**Parameters:**
- `phase` - Phase that completed
- `featureName` - Name of the feature
- `artifactPath` - Path to the artifact file
- `cwd` (optional) - Working directory

**Returns:** `Promise<GitResult>`

**Example:**
```typescript
import { createPhaseCommit } from "./lib/git";

const result = await createPhaseCommit(
  "propose",
  "webhook-support",
  "specs/proposal.md"
);

if (result.success) {
  console.log("Commit created:", result.stdout);
}
```

---

#### `isPhaseComplete(phase, featureName, cwd?)`

Checks if a specific phase has been completed for a feature.

**Parameters:**
- `phase` - Phase to check
- `featureName` - Feature name
- `cwd` (optional) - Working directory

**Returns:** `Promise<boolean>`

**Example:**
```typescript
import { isPhaseComplete } from "./lib/git";

const proposeComplete = await isPhaseComplete("propose", "webhook-support");
if (proposeComplete) {
  console.log("Propose phase already complete");
}
```

---

#### `getPhaseCommit(phase, featureName, cwd?)`

Gets the commit info for a phase completion.

**Parameters:**
- `phase` - Phase to look up
- `featureName` - Feature name
- `cwd` (optional) - Working directory

**Returns:** `Promise<CommitInfo | undefined>`

**Example:**
```typescript
import { getPhaseCommit } from "./lib/git";

const commit = await getPhaseCommit("propose", "webhook-support");
if (commit) {
  console.log(`Completed ${commit.timestamp} by ${commit.author}`);
}
```

---

#### `getFeatureCommits(featureName, cwd?)`

Gets all phase commits for a feature in chronological order.

**Parameters:**
- `featureName` - Feature name
- `cwd` (optional) - Working directory

**Returns:** `Promise<CommitInfo[]>`

**Example:**
```typescript
import { getFeatureCommits } from "./lib/git";

const commits = await getFeatureCommits("webhook-support");
commits.forEach(commit => {
  console.log(`${commit.message} (${commit.timestamp})`);
});
```

---

#### `stageFile(filePath, cwd?)`

Stages a file for commit.

**Parameters:**
- `filePath` - Path to file to stage
- `cwd` (optional) - Working directory

**Returns:** `Promise<GitResult>`

---

#### `getStagedFiles(cwd?)`

Gets the list of staged files.

**Parameters:**
- `cwd` (optional) - Working directory

**Returns:** `Promise<string[]>`

---

## Quality Gates

Quality gates validate prerequisites before phase execution.

### Prerequisite Gate

**Module:** `gates/prerequisite.ts`

Validates that constitution file exists and git repository is initialized.

#### Types

```typescript
interface GateResult {
  passed: boolean;
  error?: string;
  resolution?: string;
}
```

#### `prerequisiteGate(featureName)`

Validates that all prerequisites exist for SpecFirst execution.

**Parameters:**
- `featureName` - Feature name to validate prerequisites for

**Returns:** `Promise<GateResult>`

**Checks:**
1. Constitution file exists
2. Git repository exists

**Example:**
```typescript
import { prerequisiteGate } from "./gates/prerequisite";

const result = await prerequisiteGate("webhook-support");
if (!result.passed) {
  console.error(result.error);
  console.log(result.resolution);
  process.exit(1);
}
```

---

#### `validatePrerequisites(featureName)`

Validates prerequisites and prints results (CLI helper).

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<boolean>` - true if passed, false if failed

---

### Artifact Gate

**Module:** `gates/artifact.ts`

Validates that required artifacts exist before a phase can run.

#### Types

```typescript
type Phase = "propose" | "specify" | "plan" | "implement" | "release";

interface GateResult {
  passed: boolean;
  error?: string;
  missingArtifacts?: string[];
  resolution?: string;
}
```

#### Phase Requirements

| Phase | Required Artifacts |
|-------|-------------------|
| propose | constitution |
| specify | constitution, proposal |
| plan | constitution, proposal, spec |
| implement | constitution, proposal, spec, plan |
| release | constitution, proposal, spec, plan, tasks |

#### `artifactGate(phase, featureName)`

Validates that all required artifacts exist for a given phase.

**Parameters:**
- `phase` - The phase to validate
- `featureName` - The feature name

**Returns:** `Promise<GateResult>`

**Example:**
```typescript
import { artifactGate } from "./gates/artifact";

const result = await artifactGate("plan", "webhook-support");
if (!result.passed) {
  console.error(result.error);
  console.log(`Missing: ${result.missingArtifacts?.join(", ")}`);
  console.log(result.resolution);
}
```

---

### ISC Format Gate

**Module:** `gates/isc-format.ts`

Validates that tasks.md follows the correct ISC (Ideal State Criteria) format.

#### Types

```typescript
interface ValidationError {
  line: number;
  message: string;
  criterion?: string;
  actual?: number;
  expected?: number;
}

interface GateResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

#### Requirements

- Criteria must be **EXACTLY 8 words**
- Only valid status symbols: `⬜ 🔄 ✅ ❌` (criteria), `👀 ✅ ❌` (anti-criteria)
- Four-column table structure: `# | Criterion | Status | Evidence`
- Required sections: `IDEAL`, `ISC TRACKER`, `ANTI-CRITERIA`, `PROGRESS`

#### `validateISCFormat(content)`

Validates ISC format in tasks.md content.

**Parameters:**
- `content` - The tasks.md file content

**Returns:** `GateResult`

**Example:**
```typescript
import { validateISCFormat } from "./gates/isc-format";
import { readFile } from "fs/promises";

const content = await readFile("specs/tasks.md", "utf-8");
const result = validateISCFormat(content);

if (!result.passed) {
  console.error(`${result.errors.length} errors found`);
  result.errors.forEach(err => {
    console.error(`Line ${err.line}: ${err.message}`);
  });
}
```

---

#### `formatValidationResult(result)`

Formats validation result for display.

**Parameters:**
- `result` - GateResult from validateISCFormat

**Returns:** `string` - Formatted output

---

## Phase Orchestration

**Module:** `phases/orchestrator.ts`

Routes workflow requests to the correct phase and enforces gate checks.

### Types

```typescript
type Phase = "propose" | "specify" | "plan" | "implement" | "release";

interface OrchestratorResult {
  success: boolean;
  phase: Phase;
  gatesPassed: string[];
  artifactPath?: string;
  error?: string;
  nextPhase?: Phase;
}
```

### Functions

#### `executePhase(phase, featureName, input?)`

Executes a phase with full gate validation.

**Process:**
1. Validates the phase name
2. Runs all required gates for the phase
3. Routes to the correct phase function
4. Returns result with next phase suggestion

**Parameters:**
- `phase` - Phase to execute
- `featureName` - Feature name
- `input` (optional) - Phase-specific input data

**Returns:** `Promise<OrchestratorResult>`

**Example:**
```typescript
import { executePhase } from "./phases/orchestrator";

const result = await executePhase("propose", "webhook-support", {
  featureName: "webhook-support",
  problemStatement: "Need real-time notifications",
  solutionApproaches: [...],
  recommendedApproach: "Queue-based webhooks"
});

if (result.success) {
  console.log(`Phase complete. Next: ${result.nextPhase}`);
  console.log(`Artifact: ${result.artifactPath}`);
  console.log(`Gates passed: ${result.gatesPassed.join(", ")}`);
}
```

---

#### `detectNextPhase(featureName)`

Detects which phase to run next based on existing artifacts and git history.

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<Phase | null>` - Next phase to run, or null if all phases complete

**Example:**
```typescript
import { detectNextPhase } from "./phases/orchestrator";

const nextPhase = await detectNextPhase("webhook-support");
if (nextPhase) {
  console.log(`Resume from: ${nextPhase}`);
} else {
  console.log("Feature is complete!");
}
```

---

#### `resumeWorkflow(featureName)`

Resumes workflow from where it left off.

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<OrchestratorResult>`

**Example:**
```typescript
import { resumeWorkflow } from "./phases/orchestrator";

const result = await resumeWorkflow("webhook-support");

if (result.success) {
  console.log(`Completed ${result.phase} phase`);
  if (result.nextPhase) {
    console.log(`Next: ${result.nextPhase}`);
  }
}
```

---

#### `getWorkflowStatus(featureName)`

Gets the status of all phases for a feature.

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<Record<Phase, boolean>>`

**Example:**
```typescript
import { getWorkflowStatus } from "./phases/orchestrator";

const status = await getWorkflowStatus("webhook-support");
console.log("Workflow Progress:");
for (const [phase, complete] of Object.entries(status)) {
  console.log(`  ${phase}: ${complete ? "✅" : "⬜"}`);
}
```

---

## Phase Implementations

Each phase module exports a main function and types.

### Propose Phase

**Module:** `phases/propose.ts`

#### Types

```typescript
interface ProposalInput {
  featureName: string;
  problemStatement: string;
  solutionApproaches: SolutionApproach[];
  recommendedApproach: string;
  antiPatterns?: string[];
  openQuestions?: string[];
}

interface SolutionApproach {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

interface PhaseResult {
  success: boolean;
  artifactPath?: string;
  error?: string;
}
```

#### `proposePhase(input)`

Creates proposal.md with problem statement and solution approaches.

**Parameters:**
- `input` - ProposalInput

**Returns:** `Promise<PhaseResult>`

---

### Specify Phase

**Module:** `phases/specify.ts`

*Not yet implemented - placeholder for Phase 2 implementation.*

---

### Plan Phase

**Module:** `phases/plan.ts`

#### Types

```typescript
interface PlanInput {
  featureName: string;
  executiveSummary: string;
  adrs: ADR[];
  implementationPhases: ImplementationPhase[];
  testingStrategy: TestingStrategy;
  risks: Risk[];
  dependencies: Dependency[];
  rollbackProcedures: string;
}
```

#### `planPhase(input)`

Creates plan.md with implementation roadmap and risk analysis.

**Parameters:**
- `input` - PlanInput

**Returns:** `Promise<PhaseResult>`

---

### Implement Phase

**Module:** `phases/implement.ts`

#### Types

```typescript
interface ImplementInput {
  featureName: string;
  ideal: string;
  criteria: ISCCriterion[];
  antiCriteria: AntiCriterion[];
}

interface ISCCriterion {
  id: number;
  criterion: string;  // Exactly 8 words
  status: "⬜" | "🔄" | "✅" | "❌";
  evidence?: string;
  phase?: string;
}
```

#### `implementPhase(input)`

Creates tasks.md in ISC format from plan.md.

**Parameters:**
- `input` - ImplementInput

**Returns:** `Promise<PhaseResult>` - Includes handoff message for Algorithm

**Example:**
```typescript
import { implementPhase, extractCriteriaFromPlan } from "./phases/implement";

// Option 1: Provide criteria directly
const result = await implementPhase({
  featureName: "webhook-support",
  ideal: "Webhook system queues and delivers events reliably",
  criteria: [...],
  antiCriteria: [...]
});

// Option 2: Extract from plan.md automatically
const input = await extractCriteriaFromPlan("webhook-support");
const result = await implementPhase(input);

console.log(result.handoffMessage);
// ✅ SpecFirst Implement phase complete for webhook-support
// 📋 Generated 8 ISC criteria in tasks.md
// 🎯 Algorithm: Load ISC from /path/to/tasks.md
```

---

#### `extractCriteriaFromPlan(featureName)`

Extracts ISC criteria from plan.md automatically.

**Parameters:**
- `featureName` - Feature name

**Returns:** `Promise<ImplementInput>` - Ready to pass to implementPhase

---

#### `convertTo8Words(text)`

Ensures text is exactly 8 words (for ISC compliance).

**Parameters:**
- `text` - Input text

**Returns:** `string` - 8-word version

---

### Release Phase

**Module:** `phases/release.ts`

*Not yet implemented - placeholder for Phase 5 implementation.*

---

## Algorithm Integration

Modules that connect SpecFirst with the PAI Algorithm.

### Effort Detector

**Module:** `algorithm/effort-detector.ts`

Detects when the PAI Algorithm is running at DETERMINED effort level.

#### Types

```typescript
type EffortLevel = "MINIMAL" | "STANDARD" | "THOROUGH" | "DETERMINED";

interface EffortDetection {
  effortLevel: EffortLevel;
  shouldActivateSpecFirst: boolean;
  reason: string;
  confidence: number; // 0-1
}
```

#### `detectEffortLevel(algorithmContext)`

Detects effort level from Algorithm context.

**Parameters:**
- `algorithmContext` - Context from PAI Algorithm

**Returns:** `EffortDetection`

**Example:**
```typescript
import { detectEffortLevel } from "./algorithm/effort-detector";

const detection = detectEffortLevel({ effortLevel: "DETERMINED" });

if (detection.shouldActivateSpecFirst) {
  console.log("Activating SpecFirst 3.0");
  console.log(`Reason: ${detection.reason}`);
  console.log(`Confidence: ${detection.confidence}`);
}
```

---

#### `shouldTriggerSpecFirst(effortLevel)`

Determines if SpecFirst should activate based on effort level.

**Parameters:**
- `effortLevel` - Effort level string

**Returns:** `boolean`

---

#### `createDeterminedDetection()`

Creates an explicit DETERMINED detection.

**Returns:** `EffortDetection`

---

### Phase Integration

**Module:** `algorithm/phase-integration.ts`

Maps SpecFirst phases to Algorithm phases.

#### Types

```typescript
type SpecFirstPhase = "propose" | "specify" | "plan" | "implement" | "release";
type AlgorithmPhase = "OBSERVE" | "THINK" | "PLAN" | "BUILD" | "EXECUTE" | "VERIFY" | "LEARN";

interface PhaseMapping {
  specFirstPhase: SpecFirstPhase;
  algorithmPhase: AlgorithmPhase;
  canExecute: boolean;
  reason: string;
}

interface PhaseCompatibility {
  compatible: boolean;
  suggestedAlgorithmPhase: AlgorithmPhase | null;
  reason: string;
}
```

#### Phase Mapping Table

| SpecFirst Phase | Algorithm Phase | Purpose |
|----------------|-----------------|---------|
| propose | PLAN | Generate proposal.md |
| specify | PLAN | Generate spec.md |
| plan | PLAN | Generate plan.md and tasks.md |
| implement | BUILD | Execute implementation tasks |
| release | BUILD | Deploy and verify |

#### `mapToAlgorithmPhase(specFirstPhase)`

Maps SpecFirst phase to Algorithm phase.

**Parameters:**
- `specFirstPhase` - SpecFirst phase name

**Returns:** `AlgorithmPhase`

---

#### `canExecuteInPhase(specFirstPhase, currentAlgorithmPhase)`

Checks if SpecFirst phase can execute in current Algorithm phase.

**Parameters:**
- `specFirstPhase` - SpecFirst phase
- `currentAlgorithmPhase` - Current Algorithm phase

**Returns:** `boolean`

**Example:**
```typescript
import { canExecuteInPhase } from "./algorithm/phase-integration";

if (canExecuteInPhase("propose", "PLAN")) {
  console.log("Can execute propose phase in PLAN");
}
```

---

#### `checkPhaseCompatibility(currentAlgorithmPhase)`

Checks if SpecFirst can run in current Algorithm phase.

**Parameters:**
- `currentAlgorithmPhase` - Current Algorithm phase

**Returns:** `PhaseCompatibility`

**Example:**
```typescript
import { checkPhaseCompatibility } from "./algorithm/phase-integration";

const compat = checkPhaseCompatibility("OBSERVE");
if (!compat.compatible) {
  console.log(`Wait for ${compat.suggestedAlgorithmPhase} phase`);
}
```

---

### ISC Loader

**Module:** `algorithm/isc-loader.ts`

Loads tasks.md ISC format into Algorithm ISC tracker format. **READ-ONLY converter.**

#### Types

```typescript
type ISCStatus = "⬜" | "🔄" | "✅" | "❌";

interface ISCEntry {
  id: number;
  criterion: string; // Exactly 8 words
  status: ISCStatus;
  evidence?: string;
  phase?: string;
}

interface AntiCriterionEntry {
  id: string; // e.g., "A1", "A2"
  criterion: string;
  status: "👀" | "✅" | "❌";
}

interface LoadedISC {
  criteria: ISCEntry[];
  antiCriteria: AntiCriterionEntry[];
  ideal?: string;
  metadata: {
    featureName: string;
    sourceFile: string;
    loadedAt: string;
    totalCriteria: number;
    completedCriteria: number;
    progressPercent: number;
  };
}
```

#### `loadTasksIntoTracker(tasksPath)`

Loads tasks.md and converts to ISC tracker format.

**Parameters:**
- `tasksPath` - Path to tasks.md file

**Returns:** `Promise<LoadedISC>`

**Example:**
```typescript
import { loadTasksIntoTracker, formatAsAlgorithmTracker } from "./algorithm/isc-loader";

// Load tasks.md
const isc = await loadTasksIntoTracker("/path/to/tasks.md");

console.log(`Loaded ${isc.metadata.totalCriteria} criteria`);
console.log(`Progress: ${isc.metadata.progressPercent}%`);

// Format for Algorithm ISC tracker
const trackerTable = formatAsAlgorithmTracker(isc);
console.log(trackerTable);

// Use in Algorithm
for (const entry of isc.criteria) {
  console.log(`${entry.id}. ${entry.criterion} [${entry.status}]`);
}
```

---

#### `parseISCTable(content)`

Parses ISC table from tasks.md content.

**Parameters:**
- `content` - tasks.md file content

**Returns:** `ISCEntry[]`

---

#### `validateLoadedISC(entries)`

Validates loaded ISC entries.

**Parameters:**
- `entries` - Array of ISC entries

**Returns:** `{ valid: boolean; errors: string[] }`

---

#### `formatAsAlgorithmTracker(loadedISC)`

Formats LoadedISC as Algorithm ISC tracker table.

**Parameters:**
- `loadedISC` - Loaded ISC data

**Returns:** `string` - Formatted tracker table

**Output Format:**
```
🎯 ISC TRACKER ═══════════════════════════════════════════════════════════
   IDEAL: Perfect ISC format with all criteria verified successfully.

│ # │ Criterion (exactly 8 words)                          │ Status      │ Evidence       │
├───┼──────────────────────────────────────────────────────┼─────────────┼────────────────┤
│  1 │ User authentication endpoint responds with valid JWT token │ ✅ VERIFIED  │ Test passed    │
│  2 │ Database connection pool maintains exactly five active connections │ 🔄 IN_PROGRESS │ In progress    │
│  3 │ Error messages include timestamp and correlation request identifier │ ⬜ PENDING   │ Not started    │
└───┴──────────────────────────────────────────────────────┴─────────────┴────────────────┘
   SCORE: 1/3 verified │ PROGRESS: 33%
```

---

## Artifact Types

**Module:** `artifacts/types.ts`

Type definitions for all SpecFirst artifact structures.

### Frontmatter

```typescript
interface ArtifactFrontmatter {
  feature: string;
  phase: string;
  status: "draft" | "review" | "complete";
  created: string;  // ISO date
  updated?: string; // ISO date
  version?: string;
  author?: string;
}
```

### Proposal Artifact

```typescript
interface ProposalArtifact {
  frontmatter: ArtifactFrontmatter & {
    phase: "propose";
  };
  problemStatement: string;
  solutionApproaches: SolutionApproach[];
  recommendedApproach: string;
  antiPatterns: string[];
  openQuestions?: string[];
}

interface SolutionApproach {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}
```

### Spec Artifact

```typescript
interface SpecArtifact {
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
```

### Plan Artifact

```typescript
interface PlanArtifact {
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

interface ADR {
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

interface ImplementationPhase {
  number: number;
  name: string;
  objective: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  estimatedEffort: string;
  dependencies: string[];
  risks: string[];  // REQUIRED - must not be empty
}
```

### Tasks Artifact

```typescript
interface TasksArtifact {
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

interface ISCCriterion {
  id: number;
  criterion: string;  // Exactly 8 words
  status: "⬜" | "🔄" | "✅" | "❌";
  evidence?: string;
  phase?: string;  // Implementation phase this belongs to
}

interface AntiCriterion {
  id: string;  // A1, A2, etc.
  criterion: string;
  status: "👀" | "✅" | "❌";
}
```

---

## Linear Integration

Modules for integrating with Linear project management.

### Linear Client

**Module:** `integrations/linear-client.ts`

GraphQL API client for Linear.

#### Types

```typescript
class LinearClient {
  isConfigured(): boolean;
  getCurrentMilestone(teamId: string): Promise<Milestone | null>;
  getIssue(identifier: string): Promise<Issue | null>;
  updateIssueState(issueId: string, stateId: string): Promise<boolean>;
  getTeamStates(teamId: string): Promise<WorkflowState[]>;
}

class LinearAPIError extends Error {
  code: string;
  retryAfter?: number;
}
```

#### `getLinearClient()`

Gets the singleton Linear client instance.

**Returns:** `LinearClient`

**Example:**
```typescript
import { getLinearClient, isLinearAvailable } from "./integrations/linear-client";

if (isLinearAvailable()) {
  const client = getLinearClient();
  
  const milestone = await client.getCurrentMilestone(teamId);
  console.log(milestone?.name);
}
```

---

#### `isLinearAvailable()`

Checks if Linear integration is configured.

**Returns:** `boolean`

---

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `UNCONFIGURED` | No API token set | Set LINEAR_API_TOKEN |
| `RATE_LIMIT` | API rate limit exceeded | Wait retryAfter seconds |
| `HTTP_ERROR` | HTTP request failed | Check network |
| `GRAPHQL_ERROR` | GraphQL query error | Check query syntax |
| `NETWORK_ERROR` | Network connectivity issue | Check connection |
| `EMPTY_RESPONSE` | API returned no data | Check query parameters |

---

### Milestone Validation

**Module:** `integrations/linear-milestone.ts`

Validates features are in the current development milestone.

#### Types

```typescript
interface MilestoneValidationResult {
  valid: boolean;
  skipped: boolean;
  error?: string;
  currentMilestone?: string;
  featureMilestone?: string;
}
```

#### `validateMilestone(featureId, teamId)`

Validates feature is in current milestone.

**Parameters:**
- `featureId` - Linear issue ID or identifier
- `teamId` - Linear team ID

**Returns:** `Promise<MilestoneValidationResult>`

**Example:**
```typescript
import { validateMilestone } from "./integrations/linear-milestone";

const result = await validateMilestone("PAI-123", "team-xxx");

if (!result.valid && !result.skipped) {
  console.error(`BLOCKED: ${result.error}`);
  // Feature is in wrong milestone - don't proceed
}
```

---

#### `getMilestoneForSpec(featureId)`

Gets formatted milestone name for spec metadata.

**Parameters:**
- `featureId` - Linear issue ID

**Returns:** `Promise<string | null>`

**Example:**
```typescript
import { getMilestoneForSpec } from "./integrations/linear-milestone";

const milestone = await getMilestoneForSpec("PAI-123");
// Returns: "v1.0 - January 2026"
```

---

#### `isInCurrentMilestone(featureId, teamId)`

Boolean check if feature is in current milestone.

**Parameters:**
- `featureId` - Linear issue ID
- `teamId` - Linear team ID

**Returns:** `Promise<boolean>`

---

### Status Sync

**Module:** `integrations/linear-status.ts`

Synchronizes SpecFirst phase completions to Linear issue states.

#### Phase to State Mapping

```
propose   → Specified        (has proposal)
specify   → Planned          (has spec)
plan      → Ready for Dev    (has implementation plan)
implement → In Progress      (working on tasks)
release   → Done             (deployed)
```

#### Types

```typescript
interface StatusSyncResult {
  success: boolean;
  skipped: boolean;
  newState?: string;
  error?: string;
}
```

#### `syncPhaseStatus(issueId, phase, teamId)`

Syncs single phase completion to Linear.

**Parameters:**
- `issueId` - Linear issue ID
- `phase` - SpecFirst phase
- `teamId` - Linear team ID

**Returns:** `Promise<StatusSyncResult>`

**Example:**
```typescript
import { syncPhaseStatus } from "./integrations/linear-status";

const result = await syncPhaseStatus(
  issueId,
  "propose",
  teamId
);

if (result.success) {
  console.log(`✅ Updated to ${result.newState}`);
} else if (result.skipped) {
  console.log("⚠️ Linear not configured, skipping");
} else {
  console.error(`❌ ${result.error}`);
}
```

---

#### `syncAllPhases(issueId, phases, teamId)`

Batch sync multiple phases (syncs latest only).

**Parameters:**
- `issueId` - Linear issue ID
- `phases` - Array of completed phases
- `teamId` - Linear team ID

**Returns:** `Promise<StatusSyncResult[]>`

---

#### `getExpectedState(phase)`

Gets the Linear state name for a SpecFirst phase.

**Parameters:**
- `phase` - SpecFirst phase

**Returns:** `string` - Linear state name

---

#### `validateTeamWorkflow(teamId)`

Checks if team has all required states configured.

**Parameters:**
- `teamId` - Linear team ID

**Returns:** `Promise<string[]>` - Array of missing state names

**Example:**
```typescript
import { validateTeamWorkflow } from "./integrations/linear-status";

const missing = await validateTeamWorkflow(teamId);
if (missing.length > 0) {
  console.warn(`Add these states in Linear: ${missing.join(", ")}`);
}
```

---

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENCODE_DIR` | string | `~/.opencode` | Platform root directory |
| `PAI_DIR` | string | `~/.claude` | Claude Code platform root |
| `LINEAR_API_TOKEN` | string | - | Linear API token for integration |
| `LINEAR_TEAM_ID` | string | - | Linear team ID for milestone validation |
| `SPECFIRST_AUTO_COMMIT` | boolean | `true` | Enable git auto-commit |
| `SPECFIRST_BRANCH` | string | - | Git branch for commits |
| `SPECFIRST_MAX_ARTIFACT_KB` | number | `50` | Max artifact size in KB |
| `SPECFIRST_GATE_TIMEOUT_MS` | number | `5000` | Gate timeout in milliseconds |

---

## Error Handling

All async functions follow consistent error handling:

### Success Pattern

```typescript
{
  success: true,
  artifactPath: "/path/to/artifact.md",
  // Additional success data
}
```

### Failure Pattern

```typescript
{
  success: false,
  error: "Detailed error message",
  resolution: "How to fix this issue"
}
```

### Example

```typescript
const result = await proposePhase(input);

if (result.success) {
  console.log(`Created: ${result.artifactPath}`);
} else {
  console.error(`Error: ${result.error}`);
  if (result.resolution) {
    console.log(`Fix: ${result.resolution}`);
  }
}
```

---

## Testing

All modules include self-tests. Run with:

```bash
# Test platform detection
bun lib/platform.ts

# Test configuration
bun lib/config.ts

# Test git operations
bun lib/git.ts

# Test gates
bun gates/prerequisite.ts my-feature
bun gates/artifact.ts
bun gates/isc-format.ts

# Test orchestrator
bun phases/orchestrator.ts

# Test phases
bun phases/propose.ts my-feature
bun phases/plan.ts my-feature
bun phases/implement.ts my-feature

# Test algorithm integration
bun algorithm/effort-detector.ts
bun algorithm/phase-integration.ts
bun algorithm/isc-loader.ts
```

---

*SpecFirst 3.0 API Reference*
*Last Updated: 2026-01-26*
*Version: 3.0.0*
