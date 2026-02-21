# Phase Orchestrator - User Guide

**The central routing and gate enforcement system for SpecFirst 3.0**

## Overview

The Phase Orchestrator is the traffic controller for SpecFirst workflows. It:
- Routes execution requests to the correct phase function
- Enforces gate checks before allowing phase execution
- Tracks workflow progress via git commits
- Suggests next phases automatically

## Architecture

```
User Request
     ↓
executePhase()
     ↓
Gate Validation (prerequisite, artifact, isc-format)
     ↓
Phase Execution (propose → specify → plan → implement → release)
     ↓
Git Commit (state marker)
     ↓
Next Phase Suggestion
```

## Gate Enforcement Rules

Each phase has specific gates that MUST pass before execution:

| Phase | Required Gates | Checks |
|-------|---------------|---------|
| **propose** | prerequisite | Constitution exists, git repo exists |
| **specify** | prerequisite, artifact | Previous checks + proposal.md exists |
| **plan** | prerequisite, artifact | Previous checks + spec.md exists |
| **implement** | prerequisite, artifact | Previous checks + plan.md exists |
| **release** | prerequisite, artifact, isc-format | Previous checks + tasks.md exists and follows ISC format |

### Gate Execution Order

Gates run sequentially. If any gate fails, execution stops immediately:

```typescript
// Example: specify phase gate sequence
1. prerequisite gate → checks constitution and git
   ✅ Pass → continue
   ❌ Fail → return error, suggest creating constitution

2. artifact gate → checks proposal.md exists
   ✅ Pass → execute specifyPhase()
   ❌ Fail → return error, suggest running propose phase
```

## API Reference

### executePhase()

Execute a specific phase with full gate validation.

```typescript
async function executePhase(
  phase: Phase,
  featureName: string,
  input?: unknown
): Promise<OrchestratorResult>
```

**Parameters:**
- `phase`: Phase to execute ("propose" | "specify" | "plan" | "implement" | "release")
- `featureName`: Name of the feature
- `input`: Phase-specific input data

**Returns:** `OrchestratorResult`
```typescript
interface OrchestratorResult {
  success: boolean;        // true if phase completed successfully
  phase: Phase;           // Phase that was executed
  gatesPassed: string[];  // List of gates that passed
  artifactPath?: string;  // Path to created artifact
  error?: string;         // Error message if failed
  nextPhase?: Phase;      // Suggested next phase to run
}
```

**Example:**
```typescript
import { executePhase } from "./orchestrator";

const result = await executePhase("propose", "user-authentication", {
  featureName: "user-authentication",
  problemStatement: "Need secure user authentication system",
  solutionApproaches: [
    {
      name: "JWT-based authentication",
      description: "Use JSON Web Tokens for stateless auth",
      pros: ["Stateless", "Scalable", "Standard"],
      cons: ["Token size", "Revocation complexity"]
    },
    {
      name: "Session-based authentication",
      description: "Traditional server-side sessions",
      pros: ["Simple", "Easy revocation"],
      cons: ["Requires state", "Scaling challenges"]
    }
  ],
  recommendedApproach: "Use JWT for API, sessions for web UI",
  antiPatterns: ["Don't store passwords in plain text"],
  openQuestions: ["How to handle refresh tokens?"]
});

if (result.success) {
  console.log(`✅ ${result.phase} phase complete`);
  console.log(`📄 Artifact: ${result.artifactPath}`);
  console.log(`➡️  Next phase: ${result.nextPhase}`);
} else {
  console.error(`❌ Phase failed: ${result.error}`);
}
```

### detectNextPhase()

Automatically detect which phase should run next based on git history.

```typescript
async function detectNextPhase(featureName: string): Promise<Phase | null>
```

**Returns:**
- `Phase` - The next phase that needs to run
- `null` - All phases are complete

**Example:**
```typescript
import { detectNextPhase } from "./orchestrator";

const nextPhase = await detectNextPhase("user-authentication");

if (nextPhase) {
  console.log(`Next phase to run: ${nextPhase}`);
} else {
  console.log("All phases complete! 🎉");
}
```

### resumeWorkflow()

Resume workflow from where it left off (detects + executes next phase).

```typescript
async function resumeWorkflow(featureName: string): Promise<OrchestratorResult>
```

**Example:**
```typescript
import { resumeWorkflow } from "./orchestrator";

// Automatically pick up where you left off
const result = await resumeWorkflow("user-authentication");

if (result.success) {
  console.log(`Completed ${result.phase} phase`);
  
  // Continue to next phase?
  if (result.nextPhase) {
    console.log(`Ready to run: ${result.nextPhase}`);
  }
}
```

### getWorkflowStatus()

Get completion status for all phases.

```typescript
async function getWorkflowStatus(
  featureName: string
): Promise<Record<Phase, boolean>>
```

**Example:**
```typescript
import { getWorkflowStatus } from "./orchestrator";

const status = await getWorkflowStatus("user-authentication");

console.log("Workflow Progress:");
for (const [phase, complete] of Object.entries(status)) {
  const icon = complete ? "✅" : "⬜";
  console.log(`  ${icon} ${phase}`);
}

// Output:
// Workflow Progress:
//   ✅ propose
//   ✅ specify
//   ⬜ plan
//   ⬜ implement
//   ⬜ release
```

## Error Handling

The orchestrator provides detailed error messages and resolution suggestions:

### Gate Failures

```typescript
{
  success: false,
  phase: "specify",
  gatesPassed: ["prerequisite"],
  error: "Artifact gate failed: Cannot run specify phase: missing required artifacts\n\n  - proposal.md (/path/to/specs/proposal.md)\n\nRun the 'propose' phase first to generate required artifacts."
}
```

### Phase Execution Failures

```typescript
{
  success: false,
  phase: "propose",
  gatesPassed: ["prerequisite"],
  error: "Phase execution failed: Failed to write proposal.md"
}
```

## Usage Patterns

### Pattern 1: Linear Execution

Execute phases one at a time with explicit inputs:

```typescript
// Step 1: Propose
const proposeResult = await executePhase("propose", featureName, proposeInput);
if (!proposeResult.success) throw new Error(proposeResult.error);

// Step 2: Specify
const specifyResult = await executePhase("specify", featureName, specifyInput);
if (!specifyResult.success) throw new Error(specifyResult.error);

// Step 3: Plan
const planResult = await executePhase("plan", featureName, planInput);
// ... and so on
```

### Pattern 2: Automatic Resume

Let the orchestrator detect and execute the next phase:

```typescript
// Resume workflow wherever it left off
while (true) {
  const result = await resumeWorkflow(featureName);
  
  if (!result.success) {
    console.error(`Failed at ${result.phase}: ${result.error}`);
    break;
  }
  
  console.log(`✅ ${result.phase} complete`);
  
  if (!result.nextPhase) {
    console.log("🎉 Workflow complete!");
    break;
  }
  
  // Provide input for next phase here
  // (in real use, you'd gather this from user or config)
}
```

### Pattern 3: Status Monitoring

Check progress before deciding what to do:

```typescript
const status = await getWorkflowStatus(featureName);
const nextPhase = await detectNextPhase(featureName);

if (nextPhase === null) {
  console.log("Feature is complete!");
} else {
  console.log(`Current status: ${JSON.stringify(status, null, 2)}`);
  console.log(`Next phase to run: ${nextPhase}`);
  
  // Execute the next phase
  const result = await executePhase(nextPhase, featureName, inputData);
}
```

## Integration with CLI

The orchestrator is designed to be called from CLI tools:

```typescript
// cli/specfirst.ts
import { executePhase } from "../phases/orchestrator";

async function main() {
  const phase = process.argv[2] as Phase;
  const featureName = process.argv[3];
  
  if (!phase || !featureName) {
    console.error("Usage: specfirst <phase> <feature-name>");
    process.exit(1);
  }
  
  const result = await executePhase(phase, featureName);
  
  if (result.success) {
    console.log(`✅ ${phase} phase complete`);
    if (result.nextPhase) {
      console.log(`➡️  Run next: specfirst ${result.nextPhase} ${featureName}`);
    }
  } else {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }
}

main();
```

## State Management via Git

The orchestrator uses git commits as state markers:

**Commit Message Format:**
```
SpecFirst: {phase} phase complete for {feature-name}

Artifact: specs/{artifact-name}
Status: complete
Timestamp: {ISO-8601}
```

**Workflow State Detection:**
```bash
# Check if propose phase is complete
git log --grep="SpecFirst: propose phase complete for user-auth"

# Check all phases for a feature
git log --grep="SpecFirst:.*complete for user-auth" -E
```

This allows the orchestrator to:
- Resume workflows after interruption
- Detect which phases have completed
- Track workflow history
- Enable multi-session work

## Testing

Run the self-test to validate orchestrator behavior:

```bash
bun phases/orchestrator.ts
```

**Self-test validates:**
- ✅ Phase routing logic
- ✅ Gate requirements mapping
- ✅ Next phase detection
- ✅ Invalid phase handling
- ✅ Gate enforcement
- ✅ ISC criteria satisfaction (#33, #34)
- ✅ Workflow status tracking

## Troubleshooting

### "Prerequisite gate failed"

**Problem:** Constitution file or git repo missing

**Solution:**
1. Create `CONSTITUTION.md` in project root
2. Initialize git repo: `git init && git add . && git commit -m "Initial commit"`

### "Artifact gate failed"

**Problem:** Previous phase artifacts don't exist

**Solution:** Run the suggested previous phase first
```bash
# Error says: Run the 'propose' phase first
bun cli/specfirst.ts propose my-feature
```

### "ISC format gate failed"

**Problem:** tasks.md doesn't follow ISC format (8-12 words per criterion)

**Solution:** Fix the criteria word count in tasks.md
```markdown
# Before (wrong)
| 1 | Auth works | ✅ | ... |

# After (correct)
| 1 | User authentication endpoint responds with valid JWT token | ✅ | ... |
```

## Advanced: Custom Gate Integration

The orchestrator can be extended with custom gates:

```typescript
// Add custom gate to PHASE_GATES
const PHASE_GATES: Record<Phase, string[]> = {
  propose: ["prerequisite", "custom-security-check"],
  // ... other phases
};

// Implement custom gate logic in executePhase()
if (gateName === "custom-security-check") {
  const result = await customSecurityGate(featureName);
  if (!result.passed) {
    return {
      success: false,
      phase,
      gatesPassed,
      error: `Custom gate failed: ${result.error}`,
    };
  }
  gatesPassed.push("custom-security-check");
}
```

## See Also

- **Gates Documentation:** `gates/README.md`
- **Phase Implementations:** `phases/propose.ts`, `specify.ts`, etc.
- **Git Integration:** `lib/git.ts`
- **Constitution Guide:** `artifacts/constitution.help.md`
