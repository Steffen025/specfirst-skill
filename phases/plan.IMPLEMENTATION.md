# Plan Phase Implementation - SpecFirst 3.0

**Complete implementation of the Plan phase (Phase 3).**

---

## Overview

The Plan phase generates `plan.md` from `spec.md`, creating an implementation roadmap with:
- Architecture Decision Records (ADRs)
- Numbered implementation phases
- Risk assessment per phase
- Testing strategy
- Overall risk matrix
- Dependencies and rollback procedures

---

## ISC Criteria Satisfied

| # | Criterion | Implementation | Test |
|---|-----------|----------------|------|
| **27** | Plan phase creates plan with implementation phases | `generatePlan()` creates numbered `### Phase N:` sections | ✅ Verified in self-test |
| **28** | Plan phase includes risk assessment per phase | Validates each phase has non-empty `risks` array | ✅ Verified in integration test |

---

## Files Created

### Core Implementation
- `phases/plan.ts` - Main phase orchestration (394 lines)
- `phases/plan.test.ts` - Integration tests (195 lines)

### Supporting Artifacts (Already Existed)
- `artifacts/plan.ts` - Markdown generation
- `gates/artifact.ts` - Prerequisite validation
- `lib/git.ts` - Commit creation
- `lib/config.ts` - Path resolution

---

## Implementation Details

### Function Signature

```typescript
export async function planPhase(input: PlanInput): Promise<PhaseResult>
```

### Input Structure

```typescript
interface PlanInput {
  featureName: string;
  executiveSummary: string;
  adrs: ADR[];  // Architecture decisions
  implementationPhases: ImplementationPhase[];  // Must have risks!
  testingStrategy: TestingStrategy;
  risks: Risk[];  // Overall risk matrix
  dependencies: Dependency[];
  rollbackProcedures: string;
}

interface ImplementationPhase {
  number: number;
  name: string;
  objective: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  estimatedEffort: string;
  dependencies: string[];
  risks: string[];  // REQUIRED - Criterion 28
}
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Artifact Gate                                                │
│    ├─ Checks constitution exists                                │
│    ├─ Checks proposal.md exists                                 │
│    └─ Checks spec.md exists                                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Ensure Directories                                           │
│    └─ Creates specs/ directory if needed                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Read Spec                                                    │
│    └─ Verifies spec.md is readable                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Validate Phases                                              │
│    └─ Ensures each phase has risks[] (Criterion 28)             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Generate Plan                                                │
│    ├─ Calls generatePlan() from artifacts/plan.ts               │
│    ├─ Creates numbered phases (Criterion 27)                    │
│    └─ Includes risk assessment per phase (Criterion 28)         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Write File                                                   │
│    └─ Writes plan.md to specs/ directory                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Git Commit                                                   │
│    └─ Creates "SpecFirst: plan phase complete" commit           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Output Artifact Structure

```markdown
---
feature: example-feature
phase: plan
status: draft
created: 2026-01-25
based_on: spec.md
version: 1.0.0
---

# Example Feature - Implementation Plan

## Executive Summary
[Overview of implementation approach and timeline]

## Architecture Decision Records (ADRs)

### ADR-001: [Decision Title]
**Status:** accepted
**Date:** 2026-01-25

**Context:** [Why this decision is needed]
**Decision:** [What we decided]
**Rationale:** [Why this is the best option]
**Alternatives Considered:**
- **Option A:** [Reason for rejection]
**Consequences:**
- [Consequence 1]

---

## Implementation Phases

### Phase 1: [Phase Name]  ← Criterion 27: Numbered phases
**Objective:** [What this phase accomplishes]

**Deliverables:**
- [Deliverable 1]

**Acceptance Criteria:**
- [Criterion 1]

**Dependencies:**
- None

**Risks:**  ← Criterion 28: Risk assessment per phase
- [Risk 1]
- [Risk 2]

**Estimated Effort:** 3 days

---

## Testing Strategy

| Level | Approach | Coverage Target |
|-------|----------|-----------------|
| Unit Tests | Jest with mocking | 80% |
| Integration Tests | API endpoint tests | - |
| E2E Tests | User journey tests | - |
| Performance Tests | Load testing | - |

---

## Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R-001 | [Risk description] | MEDIUM | HIGH | [How to mitigate] |

---

## Dependencies

| Dependency | Type | Risk | Mitigation |
|---|---|---|---|
| [Library name] | External | LOW | [Mitigation strategy] |

---

## Rollback Procedures

[How to undo this deployment if it fails]

---

*Generated by SpecFirst 3.0*
```

---

## Testing

### Self-Test

```bash
bun run .opencode/skills/SpecFirst/phases/plan.ts
```

**Output:**
```
🧪 Plan Phase Self-Test

Test 1: Validate phases require risk assessment
✅ Pass - validation logic exists

Test 2: Valid input structure
✅ Pass - valid input has proper structure

Test 3: Plan generation produces valid markdown
✅ Pass - plan content includes all required sections

Test 4: Criterion 27 - Numbered implementation phases
✅ Pass - Criterion 27 satisfied

Test 5: Criterion 28 - Risk assessment per phase
✅ Pass - Criterion 28 satisfied

✅ All tests passed!

📋 ISC Criteria Validated:
   ✅ Criterion 27: Plan phase creates plan with implementation phases
   ✅ Criterion 28: Plan phase includes risk assessment per phase
```

### Integration Tests

```bash
bun test ./.opencode/skills/SpecFirst/phases/plan.test.ts
```

**Coverage:**
- ✅ Full plan generation with real file I/O
- ✅ Artifact gate validation (missing spec.md)
- ✅ Phase risk validation (Criterion 28)
- ✅ Output structure verification
- ✅ All required sections present

---

## Key Design Decisions

### 1. Mandatory Risk Assessment (Criterion 28)

Each implementation phase MUST have at least one risk. Empty `risks: []` fails validation.

**Rationale:** Forces thoughtful risk assessment. No phase is risk-free.

**Implementation:**
```typescript
for (const phase of input.implementationPhases) {
  if (!phase.risks || phase.risks.length === 0) {
    return {
      success: false,
      error: `Phase ${phase.number} "${phase.name}" is missing risk assessment`
    };
  }
}
```

### 2. Artifact Gate Integration

Uses existing `artifactGate("plan", featureName)` to ensure prerequisites.

**Requirements:**
- constitution.md exists
- proposal.md exists
- spec.md exists

**Error Handling:** Clear messages with resolution suggestions.

### 3. Git Commit Pattern

Creates structured commit message:
```
SpecFirst: plan phase complete for {feature-name}

Artifact: specs/plan.md
Status: complete
Timestamp: 2026-01-25T14:30:00Z
```

**Benefits:**
- Phase completion tracking via git log
- Timestamped audit trail
- Searchable commit history

### 4. Separation of Concerns

| Module | Responsibility |
|--------|---------------|
| `phases/plan.ts` | Orchestration, validation, file I/O |
| `artifacts/plan.ts` | Markdown generation logic |
| `gates/artifact.ts` | Prerequisite checking |
| `lib/git.ts` | Version control integration |
| `lib/config.ts` | Path resolution |

**Rationale:** Each module has single responsibility, easy to test in isolation.

---

## Error Scenarios

### 1. Missing Prerequisites

```typescript
{
  success: false,
  error: `Artifact gate failed: Cannot run plan phase: missing required artifacts

  - proposal.md (/path/to/specs/proposal.md)
  - spec.md (/path/to/specs/spec.md)

Resolution: Run the 'specify' phase first to generate required artifacts.`
}
```

### 2. Phase Missing Risks

```typescript
{
  success: false,
  error: `Phase 2 "Implementation" is missing risk assessment (required by Criterion 28)`
}
```

### 3. File Write Failure

```typescript
{
  success: false,
  error: `Failed to write plan.md: EACCES: permission denied`
}
```

### 4. Git Commit Failure (Non-Fatal)

```typescript
{
  success: true,
  artifactPath: "/path/to/plan.md",
  // No error - git failure is logged but doesn't fail phase
}
```

---

## Usage Example

```typescript
import { planPhase } from "./phases/plan";

const result = await planPhase({
  featureName: "contact-enrichment",
  executiveSummary: "Implement contact data enrichment with fallback cascade",
  adrs: [
    {
      id: "ADR-001",
      title: "Sequential API Fallback",
      status: "accepted",
      date: "2026-01-25",
      context: "Multiple enrichment APIs with varying quality and cost",
      decision: "Use sequential fallback: Clearbit → Hunter → PeopleDataLabs",
      rationale: "Optimizes for data quality first, cost second",
      alternatives: [
        { name: "Parallel calls", reason: "Wastes API credits on duplicate data" },
        { name: "Single provider", reason: "Single point of failure" }
      ],
      consequences: [
        "Higher latency (sequential)",
        "Lower total API cost (stops at first match)"
      ]
    }
  ],
  implementationPhases: [
    {
      number: 1,
      name: "Provider Adapters",
      objective: "Create normalized interface for each API",
      deliverables: [
        "ClearbitAdapter.ts",
        "HunterAdapter.ts",
        "PeopleDataLabsAdapter.ts"
      ],
      acceptanceCriteria: [
        "All adapters pass integration tests",
        "Response normalization validates against schema"
      ],
      estimatedEffort: "2 days",
      dependencies: [],
      risks: [
        "API changes breaking adapter contracts",
        "Rate limiting during development testing"
      ]
    },
    {
      number: 2,
      name: "Fallback Orchestrator",
      objective: "Implement sequential fallback logic",
      deliverables: [
        "EnrichmentOrchestrator.ts",
        "Integration test suite"
      ],
      acceptanceCriteria: [
        "Stops at first successful match",
        "Propagates errors correctly",
        "Respects timeout limits"
      ],
      estimatedEffort: "3 days",
      dependencies: ["Phase 1"],
      risks: [
        "Timeout handling edge cases",
        "Error propagation complexity"
      ]
    }
  ],
  testingStrategy: {
    unitTests: "Jest with 80% coverage for adapters and orchestrator",
    integrationTests: "Real API calls to sandbox environments",
    e2eTests: "Full enrichment flow with test contacts",
    performanceTests: "Load test with 1000 contacts",
    coverageTarget: "80%"
  },
  risks: [
    {
      id: "R-001",
      description: "API provider outage breaks enrichment",
      probability: "medium",
      impact: "high",
      mitigation: "Graceful degradation to next provider in cascade"
    },
    {
      id: "R-002",
      description: "Cost overruns from excessive API calls",
      probability: "low",
      impact: "medium",
      mitigation: "Rate limiting and budget alerts"
    }
  ],
  dependencies: [
    {
      name: "Clearbit API",
      type: "external",
      risk: "medium",
      mitigation: "Fallback cascade to Hunter/PDL"
    },
    {
      name: "Zod validation library",
      type: "external",
      risk: "low",
      mitigation: "Pin version, widely used and stable"
    }
  ],
  rollbackProcedures: "Feature flag enrichment, fall back to manual data entry"
});

if (result.success) {
  console.log(`✅ Plan created: ${result.artifactPath}`);
} else {
  console.error(`❌ Plan phase failed: ${result.error}`);
}
```

---

## Future Enhancements

### LLM-Powered Planning
- Generate implementation phases from spec.md automatically
- Suggest risks based on similar features
- Estimate effort using historical data

### Visualization
- GANTT chart generation from phases
- Risk probability/impact matrix visualization
- Dependency graph rendering

### Linear Integration
- Create Linear issues from implementation phases
- Sync acceptance criteria to issue descriptions
- Track phase completion via issue status

---

## Related Documentation

- **Main README:** `phases/README.md` - All phase implementations
- **Artifacts:** `artifacts/plan.ts` - Plan markdown generator
- **Gates:** `gates/artifact.ts` - Prerequisite validation
- **Git:** `lib/git.ts` - Commit automation
- **SpecFirst Spec:** `docs/spec.md` - Full specification

---

**Status:** ✅ Complete
**ISC Criteria:** #27, #28
**Last Updated:** 2026-01-25
**Version:** 3.0.0
