# SpecFirst 3.0 User Guide

**Comprehensive guide to using SpecFirst for specification-driven development.**

---

## Overview

SpecFirst 3.0 is a systematic specification-driven development workflow that operates as a capability within the PAI Algorithm. It generates canonical artifacts (proposal.md, spec.md, plan.md, tasks.md) to ensure features are properly specified before implementation.

**Core Philosophy:**
- **Specification Before Implementation** - No code without spec
- **Algorithm Harmony** - SpecFirst is a capability within the Algorithm, not a parallel workflow
- **Testable Requirements** - SHALL/MUST language, verifiable criteria
- **Session Isolation** - File-based state, git commits as markers

### When to Use SpecFirst

SpecFirst automatically activates when the PAI Algorithm detects **DETERMINED** or **THOROUGH** effort levels:

| Effort Level | SpecFirst Activates? | Use Case |
|--------------|---------------------|----------|
| MINIMAL | ❌ No | Too small for spec-driven process |
| STANDARD | ❌ No | Regular development workflow sufficient |
| THOROUGH | ✅ Yes | Complex tasks benefit from specification |
| DETERMINED | ✅ Yes | Large-scale projects requiring systematic approach |

---

## Prerequisites

Before using SpecFirst, you need:

### 1. Constitution File

Create a `CONSTITUTION.md` file in your project directory defining:

```markdown
# Project Constitution

## Tech Stack
- TypeScript, Bun, Hono
- PostgreSQL, Qdrant
- Cloudflare Workers

## Quality Gates
- 80% test coverage required
- All public APIs must be documented
- Zero security vulnerabilities allowed

## Architecture Constraints
- CLI-first design
- Pure functions (no LLM calls in tools)
- Zero-knowledge encryption for sensitive data

## Integration Requirements
- Linear API for project management
- Stripe for payments
- Resend for email
```

**Location:** `~/.opencode/MEMORY/projects/{project-name}/CONSTITUTION.md`

### 2. Git Repository

SpecFirst requires a git repository for phase tracking. Initialize if needed:

```bash
cd ~/.opencode/MEMORY/projects/{project-name}
git init
git add .
git commit -m "Initial commit"
```

### 3. Optional: Linear Integration

Configure Linear API token for milestone validation and status sync:

```bash
export LINEAR_API_TOKEN="lin_api_..."
export LINEAR_TEAM_ID="your-team-id"
```

Get your token from: https://linear.app/settings/api

---

## The Five Phases

SpecFirst follows a linear progression through five phases:

```
propose → specify → plan → implement → release
```

Each phase:
1. Runs quality gates (validates prerequisites)
2. Generates a canonical artifact
3. Creates a git commit marking completion
4. Hands off to the next phase

---

### Phase 1: Propose

**Purpose:** Generate a proposal.md with problem statement and solution approaches.

**When to Use:**
- Starting a new feature
- Exploring multiple solution approaches
- Need to document the "why" before the "what"

**Inputs:**
```typescript
{
  featureName: "webhook-support",
  problemStatement: "Need to send real-time notifications to external systems",
  solutionApproaches: [
    {
      name: "Direct HTTP callbacks",
      description: "Call webhook URLs directly from API endpoints",
      pros: ["Simple", "Low latency", "Easy to debug"],
      cons: ["No retry mechanism", "Blocks API response", "Hard to scale"]
    },
    {
      name: "Queue-based webhooks",
      description: "Queue webhook events and process asynchronously",
      pros: ["Non-blocking", "Built-in retries", "Scalable"],
      cons: ["More complex", "Eventual consistency", "Requires queue infrastructure"]
    }
  ],
  recommendedApproach: "Queue-based webhooks for reliability and scale",
  antiPatterns: [
    "Don't synchronously call external URLs from API endpoints",
    "Don't retry without exponential backoff"
  ],
  openQuestions: [
    "How do we handle webhook authentication?",
    "What's the expected event volume?"
  ]
}
```

**Outputs:**
- `specs/proposal.md` - Structured proposal document
- Git commit: `SpecFirst: propose phase complete for webhook-support`

**Example:**
```
User: "Create a proposal for adding webhook support"
→ Invokes Propose workflow
→ Creates proposal.md with solution approaches
→ Commits with SpecFirst marker
→ Ready for specify phase
```

**Quality Gates:**
- ✅ Prerequisite Gate - Constitution exists

---

### Phase 2: Specify

**Purpose:** Generate a spec.md with detailed requirements and user stories.

**When to Use:**
- After proposal is approved
- Ready to define concrete requirements
- Need to validate against current milestone (Linear)

**Inputs:**
```typescript
{
  featureName: "webhook-support",
  functionalRequirements: [
    {
      id: "FR-001",
      description: "System SHALL queue webhook events for async delivery",
      priority: "must",
      verificationMethod: "Integration test confirms event in queue"
    }
  ],
  nonFunctionalRequirements: [
    {
      id: "NFR-001",
      description: "Webhook delivery SHALL complete within 30 seconds",
      metric: "P95 latency",
      target: "< 30s"
    }
  ],
  userStories: [
    {
      id: "US-001",
      title: "Webhook event notification",
      given: "A webhook is registered",
      when: "An event occurs",
      then: "The webhook receives a POST request with event data"
    }
  ]
}
```

**Outputs:**
- `specs/spec.md` - Complete specification with requirements
- Git commit: `SpecFirst: specify phase complete for webhook-support`

**Linear Integration:**
- **Milestone Validation:** Checks feature is in current milestone
- **Offline Fallback:** Continues with manual confirmation if Linear unavailable

**Quality Gates:**
- ✅ Prerequisite Gate - Constitution exists
- ✅ Artifact Gate - proposal.md exists

---

### Phase 3: Plan

**Purpose:** Generate a plan.md with implementation roadmap and risk analysis.

**When to Use:**
- After specification is complete
- Ready to plan implementation phases
- Need to identify risks and dependencies

**Inputs:**
```typescript
{
  featureName: "webhook-support",
  executiveSummary: "Queue-based webhook system with retry and auth",
  adrs: [
    {
      id: "ADR-001",
      title: "Use Redis for webhook queue",
      status: "accepted",
      date: "2026-01-25",
      context: "Need reliable message queue",
      decision: "Use Redis with Bull queue library",
      rationale: "Battle-tested, simple, already in stack",
      alternatives: [
        { name: "RabbitMQ", reason: "More features but adds complexity" }
      ],
      consequences: ["Need Redis instance", "Bull adds dependency"]
    }
  ],
  implementationPhases: [
    {
      number: 1,
      name: "Core Queue Infrastructure",
      objective: "Set up Redis queue and worker",
      deliverables: ["Queue service", "Worker process", "Health checks"],
      acceptanceCriteria: [
        "Events enqueue successfully",
        "Worker processes events",
        "Failed jobs retry with backoff"
      ],
      estimatedEffort: "3 days",
      dependencies: [],
      risks: ["Redis connection failures", "Worker process crashes"]
    }
  ],
  testingStrategy: {
    unitTests: "Jest for queue operations (80% coverage)",
    integrationTests: "Test actual HTTP webhook delivery",
    e2eTests: "Full event → webhook delivery flow",
    performanceTests: "k6 load testing for 1000 events/sec",
    coverageTarget: "80%"
  },
  risks: [
    {
      id: "R-001",
      description: "Webhook endpoints might be slow or unresponsive",
      probability: "high",
      impact: "medium",
      mitigation: "30s timeout, 3 retries with exponential backoff"
    }
  ]
}
```

**Outputs:**
- `specs/plan.md` - Implementation plan with ADRs
- Git commit: `SpecFirst: plan phase complete for webhook-support`

**Quality Gates:**
- ✅ Prerequisite Gate - Constitution exists
- ✅ Artifact Gate - proposal.md and spec.md exist

---

### Phase 4: Implement

**Purpose:** Generate tasks.md in ISC format from plan.md.

**When to Use:**
- After implementation plan is complete
- Ready to convert plan to executable tasks
- Need ISC criteria for Algorithm ISC tracker

**How It Works:**
1. **Extract Criteria:** Reads plan.md and extracts acceptance criteria from implementation phases
2. **Convert to 8-12 Word Format:** Ensures each criterion is 8-12 words (ISC requirement)
3. **Generate Anti-Criteria:** Converts risks to anti-criteria (what must NOT happen)
4. **Create tasks.md:** Structured ISC format with ⬜ 🔄 ✅ ❌ status symbols

**Inputs:**
```typescript
{
  featureName: "webhook-support",
  ideal: "Webhook system queues and delivers events reliably",
  criteria: [
    {
      id: 1,
      criterion: "Events enqueue to Redis with correct payload data",
      status: "⬜",
      phase: "Phase 1: Core Queue"
    },
    {
      id: 2,
      criterion: "Worker process retrieves and processes queued webhook events",
      status: "⬜",
      phase: "Phase 1: Core Queue"
    }
  ],
  antiCriteria: [
    {
      id: "A1",
      criterion: "No webhook calls block API response time today",
      status: "👀"
    }
  ]
}
```

**Outputs:**
- `specs/tasks.md` - ISC-format task list
- Git commit: `SpecFirst: implement phase complete for webhook-support`
- **Handoff Message:**
  ```
  ✅ SpecFirst Implement phase complete for webhook-support
  📋 Generated 8 ISC criteria in tasks.md
  🎯 Algorithm: Load ISC from /path/to/tasks.md
  ```

**Quality Gates:**
- ✅ Prerequisite Gate - Constitution exists
- ✅ Artifact Gate - proposal.md, spec.md, and plan.md exist

**Algorithm Integration:**
After implement phase completes, the Algorithm:
1. Reads tasks.md using ISC Loader
2. Loads criteria into Algorithm ISC tracker
3. Works through criteria sequentially or in parallel
4. Updates status as each criterion is verified

---

### Phase 5: Release

**Purpose:** Final validation and deployment.

**When to Use:**
- All ISC criteria are verified (✅)
- Ready to deploy to production
- Need final sign-off

**Outputs:**
- Deployment verification
- Release notes
- Git commit: `SpecFirst: release phase complete for webhook-support`

**Quality Gates:**
- ✅ Prerequisite Gate - Constitution exists
- ✅ Artifact Gate - All previous artifacts exist
- ✅ ISC Format Gate - tasks.md passes validation

---

## Workflow Examples

### Example 1: Complete End-to-End Workflow

```
User: "I need to add webhook support to the contact enrichment system"

━━━ PHASE 1: PROPOSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Algorithm detects DETERMINED effort level
→ SpecFirst activates

Jeremy: "Running the Propose workflow in the SpecFirst skill..."

[Creates proposal.md with 3 solution approaches]
[Git commit: "SpecFirst: propose phase complete for webhook-support"]

✅ Phase 1 complete
➡️ Next: specify

━━━ PHASE 2: SPECIFY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jeremy: "Running the Specify workflow in the SpecFirst skill..."

[Validates Linear milestone - feature is in current sprint ✅]
[Creates spec.md with requirements and user stories]
[Git commit: "SpecFirst: specify phase complete for webhook-support"]

✅ Phase 2 complete
➡️ Next: plan

━━━ PHASE 3: PLAN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jeremy: "Running the Plan workflow in the SpecFirst skill..."

[Creates plan.md with 3 implementation phases]
[Documents risks and mitigation strategies]
[Git commit: "SpecFirst: plan phase complete for webhook-support"]

✅ Phase 3 complete
➡️ Next: implement

━━━ PHASE 4: IMPLEMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jeremy: "Running the Implement workflow in the SpecFirst skill..."

[Extracts criteria from plan.md]
[Converts to 8-12 word ISC format]
[Creates tasks.md with 12 criteria]
[Git commit: "SpecFirst: implement phase complete for webhook-support"]

✅ SpecFirst Implement phase complete for webhook-support
📋 Generated 12 ISC criteria in tasks.md
🎯 Algorithm: Load ISC from ~/.opencode/MEMORY/execution/Features/webhook-support/specs/tasks.md

━━━ ALGORITHM ISC TRACKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Algorithm loads tasks.md into ISC tracker
[Works through criteria 1-12]
[Updates status: ⬜ → 🔄 → ✅]

━━━ PHASE 5: RELEASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: "Deploy webhook-support"

Jeremy: "Running the Release workflow in the SpecFirst skill..."

[Validates all criteria ✅]
[Runs final checks]
[Deploys to production]
[Git commit: "SpecFirst: release phase complete for webhook-support"]

✅ Feature complete and deployed!
```

### Example 2: Resume Interrupted Work

```
[Laptop closes mid-project]
[Next day...]

User: "Continue work on webhook-support"

Jeremy detects:
- ✅ propose phase complete (git commit exists)
- ✅ specify phase complete (git commit exists)  
- ❌ plan phase NOT complete

→ Invokes Resume workflow
→ Resumes from plan phase
→ Continues where you left off
```

### Example 3: Linear Integration

```
User: "Create spec for user-dashboard feature"

Jeremy: "Running the Specify workflow..."

[Checks Linear milestone]
❌ Feature "user-dashboard" is in Q2 2026 milestone
   Current team milestone: Q1 2026

Error: Cannot run specify phase: feature not in current milestone

Resolution: Move PAI-456 to current milestone in Linear, or update spec manually
```

---

## Troubleshooting

### Constitution File Missing

**Error:**
```
❌ Prerequisite gate failed
Constitution file missing: /path/to/CONSTITUTION.md
```

**Solution:**
Create a CONSTITUTION.md file in your project directory:

```bash
mkdir -p ~/.opencode/MEMORY/projects/my-project
cat > ~/.opencode/MEMORY/projects/my-project/CONSTITUTION.md << 'EOF'
# Project Constitution

## Tech Stack
- [Your stack here]

## Quality Gates
- [Your requirements here]

## Architecture Constraints
- [Your constraints here]
EOF
```

### Not a Git Repository

**Error:**
```
❌ Prerequisite gate failed
Not a git repository: /path/to/project
```

**Solution:**
Initialize git in your project directory:

```bash
cd ~/.opencode/MEMORY/projects/my-project
git init
git add .
git commit -m "Initial commit"
```

### ISC Format Validation Failed

**Error:**
```
❌ ISC format validation FAILED

Line 42: Criterion must be 8-12 words
  Criterion: "User auth works"
  Word count: 3 (expected 8-12)
```

**Solution:**
Edit tasks.md and expand the criterion to 8-12 words:

```diff
- | 1 | User auth works | ✅ | Test passed |
+ | 1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed |
```

### Linear API Rate Limit

**Error:**
```
Error [RATE_LIMIT]: API rate limit exceeded
Retry after 60s
```

**Solution:**
Wait 60 seconds and retry, or disable Linear integration temporarily:

```bash
unset LINEAR_API_TOKEN
# SpecFirst will skip Linear validation
```

### Missing Artifact from Previous Phase

**Error:**
```
❌ Artifact gate failed
Cannot run plan phase: missing required artifacts
  - spec.md (/path/to/spec.md)

Resolution: Run the 'specify' phase first to generate required artifacts.
```

**Solution:**
Run the previous phase first:

```
User: "Create spec for webhook-support"
[Jeremy runs specify phase]
[Then proceed to plan phase]
```

---

## Quick Reference

### Phase Sequence

```
propose → specify → plan → implement → release
```

### Phase Triggers

| User Says | Workflow Invoked |
|-----------|------------------|
| "create proposal", "new feature" | Propose |
| "write spec", "create specification" | Specify |
| "create plan", "implementation plan" | Plan |
| "create tasks", "generate ISC" | Implement |
| "release feature", "deploy" | Release |
| "resume feature", "continue work" | Resume (auto-detects next phase) |

### ISC Status Symbols

| Symbol | Meaning |
|--------|---------|
| ⬜ | PENDING - Not yet started |
| 🔄 | IN_PROGRESS - Currently working |
| ✅ | VERIFIED - Complete with evidence |
| ❌ | FAILED - Could not achieve |
| 👀 | WATCHING - Anti-criteria being monitored (what must NOT happen) |

### Artifact Locations

All artifacts are stored in:
```
~/.opencode/MEMORY/execution/Features/{feature-name}/specs/
├── proposal.md     (Phase 1)
├── spec.md         (Phase 2)
├── plan.md         (Phase 3)
└── tasks.md        (Phase 4)
```

Constitution:
```
~/.opencode/MEMORY/projects/{project-name}/CONSTITUTION.md
```

### Git Commit Format

```
SpecFirst: {phase} phase complete for {feature-name}

Artifact: specs/{artifact-name}
Status: complete
Timestamp: {ISO-8601}
```

### Environment Variables

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `OPENCODE_DIR` | Platform root directory | Auto-detected |
| `LINEAR_API_TOKEN` | Linear integration | Optional |
| `LINEAR_TEAM_ID` | Linear team for milestone validation | Optional |
| `SPECFIRST_AUTO_COMMIT` | Git auto-commit (default: true) | Optional |
| `SPECFIRST_BRANCH` | Git branch for commits | Optional |

---

## Integration with PAI Algorithm

SpecFirst operates as a **capability within the Algorithm**, not a parallel workflow.

### How Algorithm Uses SpecFirst

```
Algorithm OBSERVE/THINK Phase:
├─ Detects DETERMINED effort level
├─ Decides to activate SpecFirst capability
└─ Proceeds to PLAN phase

Algorithm PLAN Phase:
├─ SpecFirst propose phase generates proposal.md
├─ SpecFirst specify phase generates spec.md
├─ SpecFirst plan phase generates plan.md
└─ Hands off to BUILD phase

Algorithm BUILD Phase:
├─ SpecFirst implement phase generates tasks.md
├─ Algorithm loads tasks.md into ISC tracker
├─ Algorithm works through criteria
└─ SpecFirst release phase deploys

Algorithm VERIFY Phase:
├─ Verifies all ISC criteria ✅
└─ Feature complete
```

### ISC Tracker Integration

The implement phase generates tasks.md in ISC format, which the Algorithm loads directly:

```typescript
// Algorithm reads tasks.md
const isc = await loadTasksIntoTracker("path/to/tasks.md");

// Display in Algorithm ISC tracker
console.log(formatAsAlgorithmTracker(isc));

// Work through criteria
for (const entry of isc.criteria) {
  if (entry.status === "⬜") {
    // Work on this criterion
  }
}
```

**Key Principle (ISC #49):**
The Algorithm ISC tracker is the PRIMARY state mechanism during execution. SpecFirst generates tasks.md, but the Algorithm tracks progress.

---

## Advanced Usage

### Manual Phase Execution

You can execute phases directly via CLI:

```bash
# Propose phase
bun ~/.opencode/skills/SpecFirst/phases/propose.ts my-feature

# Plan phase
bun ~/.opencode/skills/SpecFirst/phases/plan.ts my-feature

# Implement phase (auto-extracts from plan.md)
bun ~/.opencode/skills/SpecFirst/phases/implement.ts my-feature
```

### Validating ISC Format

Check tasks.md format before running release phase:

```bash
bun ~/.opencode/skills/SpecFirst/gates/isc-format.ts path/to/tasks.md
```

### Checking Workflow Status

See which phases are complete:

```typescript
import { getWorkflowStatus } from "./phases/orchestrator";

const status = await getWorkflowStatus("my-feature");
console.log(status);
// {
//   propose: true,
//   specify: true,
//   plan: false,
//   implement: false,
//   release: false
// }
```

---

## Best Practices

### 1. Start with a Good Constitution

The constitution defines constraints for all features. Invest time upfront:
- Document tech stack decisions
- Set quality thresholds
- Define architectural boundaries
- List integration requirements

### 2. Use 8-12 Word Criteria

ISC criteria MUST be 8-12 words. This forces precision while allowing clarity:

❌ **Bad:** "Auth works"  
✅ **Good:** "User authentication endpoint responds with valid JWT token"

### 3. Leverage Linear Integration

If using Linear:
- Keep features in current milestone
- SpecFirst validates this automatically
- Prevents spec-drift from roadmap

### 4. Review Before Each Phase

Before moving to next phase:
- Review previous artifact
- Confirm requirements are complete
- Discuss with team if needed

### 5. Let Algorithm Manage ISC

Don't manually update tasks.md during implementation:
- Algorithm ISC tracker is source of truth
- tasks.md is the initial spec
- Update tasks.md AFTER work completes (documentation)

---

## Learning Resources

### Documentation
- **Main Skill:** `~/.opencode/skills/SpecFirst/SKILL.md`
- **API Reference:** `~/.opencode/skills/SpecFirst/docs/API.md`
- **Algorithm Integration:** `~/.opencode/skills/SpecFirst/algorithm/README.md`
- **Phase Details:** `~/.opencode/skills/SpecFirst/phases/README.md`
- **Linear Integration:** `~/.opencode/skills/SpecFirst/integrations/README.md`

### Self-Tests
Run self-tests to verify your setup:

```bash
# Test platform detection
bun ~/.opencode/skills/SpecFirst/lib/platform.ts

# Test prerequisite gate
bun ~/.opencode/skills/SpecFirst/gates/prerequisite.ts my-feature

# Test orchestrator
bun ~/.opencode/skills/SpecFirst/phases/orchestrator.ts
```

---

*SpecFirst 3.0 - Specification-Driven Development for PAI*
*Last Updated: 2026-01-26*
