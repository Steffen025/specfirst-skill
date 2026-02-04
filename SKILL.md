---
name: SpecFirst
description: Spec-driven development within PAI Algorithm. USE WHEN DETERMINED effort level detected, new feature specification needed, or user requests systematic feature development with proposal, spec, plan, and tasks artifacts.
---

# SpecFirst 3.0

**Systematic specification-driven development workflow that operates as a capability within the PAI Algorithm.**

SpecFirst generates canonical artifacts (proposal.md, spec.md, plan.md, tasks.md) to ensure features are properly specified before implementation. It integrates with Linear for roadmap awareness and produces ISC-format tasks for Algorithm consumption.

## Constitutional Foundation

SpecFirst 3.0 operates under 8 core principles:
1. **Algorithm Harmony** - SpecFirst is a CAPABILITY within the Algorithm, not a parallel workflow
2. **Specification Before Implementation** - No code without spec
3. **Testable Requirements** - SHALL/MUST language, verifiable criteria
4. **Canonical Artifacts** - proposal → spec → plan → tasks
5. **Session Isolation** - File-based state, git commits as markers
6. **Roadmap Awareness** - Linear milestone validation
7. **Stateless Phase Execution** - Cold-start capable from artifacts
8. **Cost-Efficient Delegation** - Opus orchestrates, Sonnet implements (see below)

**Full constitution:** `~/.opencode/MEMORY/projects/specfirst-3.0/CONSTITUTION.md`

---

## Delegation Pattern (CRITICAL)

**SpecFirst enforces strict model-role separation for cost efficiency.**

### Model Hierarchy

| Model | Role | Tasks | Cost |
|-------|------|-------|------|
| **Opus** | Orchestrator | ISC definition, decision-making, verification, quality control | $$$$ |
| **Sonnet** (Engineer/Architect) | Implementer | Code writing, artifact generation, tests | $$ |
| **Haiku** | ❌ NOT USED | Haiku is for grunt-work only, NOT for SpecFirst implementation | $ |

### Execution Rules

**Opus (The Algorithm / Jeremy) SHALL:**
1. Define ISC criteria with exactly 8 words
2. Analyze dependencies between tasks
3. Decide parallel vs sequential execution
4. Delegate implementation to Sonnet agents
5. Verify results against ISC criteria
6. Make architectural decisions

**Opus SHALL NOT:**
- Write implementation code directly
- Generate artifact content (delegate to Sonnet)
- Do repetitive tasks that Sonnet can handle

**Sonnet (Engineer Agent) SHALL:**
- Implement code according to ISC criteria
- Generate artifact content (proposal, spec, plan, tasks)
- Write tests
- Execute file operations

### Dependency Analysis (BEFORE Delegation)

**Before launching parallel agents, Opus MUST analyze:**

```
1. Which tasks have NO dependencies? → Can run in parallel
2. Which tasks depend on outputs from other tasks? → Must run sequentially
3. Which tasks share resources (files, APIs)? → May need coordination
```

**Example - Phase 2 Gates:**
```
┌─────────────────────┐
│ prerequisite.ts     │──┐
└─────────────────────┘  │
                         │  (No dependencies between gates)
┌─────────────────────┐  │  → ALL 4 CAN RUN IN PARALLEL
│ artifact.ts         │──┤
└─────────────────────┘  │
                         │
┌─────────────────────┐  │
│ isc-format.ts       │──┤
└─────────────────────┘  │
                         │
┌─────────────────────┐  │
│ phase-complete.ts   │──┘
└─────────────────────┘
```

**Counter-Example - Sequential Requirement:**
```
┌─────────────────────┐
│ proposal.md         │
└─────────────────────┘
         │
         ▼ (spec.md DEPENDS on proposal.md)
┌─────────────────────┐
│ spec.md             │  → MUST RUN SEQUENTIALLY
└─────────────────────┘
         │
         ▼ (plan.md DEPENDS on spec.md)
┌─────────────────────┐
│ plan.md             │
└─────────────────────┘
```

### Delegation Template

When delegating to Engineer agent, use this pattern:

```
Task: [Clear task name]
Agent: Engineer (Sonnet)
ISC Criteria: [List specific criteria this task must satisfy]
Dependencies: [What must exist before this runs]
Inputs: [Files/context the agent needs]
Output: [Expected deliverable with path]
Verification: [How Opus will verify success]
```

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running SpecFirst PHASE for FEATURE"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **Phase** workflow in the **SpecFirst** skill...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Propose** | "new feature", "create proposal" | `Workflows/Propose.md` |
| **Specify** | "write spec", "create specification" | `Workflows/Specify.md` |
| **Plan** | "create plan", "implementation plan" | `Workflows/Plan.md` |
| **Implement** | "create tasks", "generate ISC" | `Workflows/Implement.md` |
| **Release** | "release feature", "deploy" | `Workflows/Release.md` |
| **Resume** | "resume feature", "continue work" | `Workflows/Resume.md` |

## Examples

**Example 1: Start new feature specification**
```
User: "I need to add webhook support to the contact enrichment system"
→ Invokes Propose workflow
→ Creates proposal.md with problem statement and solution approaches
→ Commits: "SpecFirst: propose phase complete for webhook-support"
```

**Example 2: Generate ISC tasks from plan**
```
User: "Generate tasks for the webhook feature"
→ Invokes Implement workflow
→ Creates tasks.md with ISC-format criteria (8 words each)
→ Hands off to Algorithm ISC tracker
```

**Example 3: Resume interrupted work**
```
User: "Continue work on webhook-support"
→ Invokes Resume workflow
→ Detects last completed phase from git history
→ Continues from next phase with loaded context
```

## Quick Reference

**Phases:** Propose → Specify → Plan → Implement → Release
**ISC Criteria:** Exactly 8 words, testable state conditions
**Status Symbols:** ⬜ PENDING | 🔄 IN_PROGRESS | ✅ VERIFIED | ❌ FAILED
**Anti-Criteria Symbol:** 👀 WATCHING

**Artifact Locations:**
- Specs: `~/.opencode/MEMORY/execution/Features/{feature}/specs/`
- Constitution: `~/.opencode/MEMORY/projects/{feature}/CONSTITUTION.md`

**Validation Gates:**
1. Prerequisite Gate - Constitution must exist
2. Artifact Gate - Previous phase artifact required
3. ISC Format Gate - 8-word criteria validation
4. Phase Completion Gate - Git commit verification

## Platform Support

SpecFirst 3.0 works on both OpenCode and Claude Code platforms:
- Automatic platform detection via environment variables
- Zero hardcoded paths - all paths derived from platform root
- Git-based state machine works identically on both platforms

## Integration Points

**Algorithm Integration:**
- DETERMINED effort triggers SpecFirst activation
- SpecFirst phases execute within Algorithm PLAN/BUILD phases
- tasks.md loads directly into Algorithm ISC tracker
- No parallel workflow - Algorithm remains primary

**Linear Integration (Optional):**
- Milestone validation in Specify phase
- Status sync on phase completion
- Offline fallback with manual confirmation

---

*SpecFirst 3.0 - Specification-Driven Development for PAI*
