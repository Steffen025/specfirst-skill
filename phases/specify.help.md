# Specify Phase - SpecFirst 3.0

**Creates spec.md from proposal.md**

## Purpose

The Specify phase transforms solution approaches from the Proposal phase into concrete, testable specifications:

- **Functional Requirements (FRs)** - What the system must do
- **Non-Functional Requirements (NFRs)** - How the system must perform
- **User Stories** - Given/When/Then scenarios
- **Success Criteria** - How to verify completion
- **Architecture Diagrams** - ASCII + Mermaid visualization

## Prerequisites

**Artifact Gate Check:**
- ✅ `constitution.md` must exist
- ✅ `proposal.md` must exist (from Propose phase)

Run the Propose phase first if missing.

## Usage

### Programmatic Usage

```typescript
import { specifyPhase } from "./phases/specify";

const result = await specifyPhase({
  featureName: "user-auth",
  functionalRequirements: [
    {
      id: "FR-001",
      description: "User can log in with email and password",
      priority: "must",
      verificationMethod: "Manual test + unit test"
    },
    {
      id: "FR-002",
      description: "System sends password reset email",
      priority: "should",
      verificationMethod: "Integration test"
    }
  ],
  nonFunctionalRequirements: [
    {
      id: "NFR-001",
      description: "Login response time",
      metric: "95th percentile latency",
      target: "< 500ms"
    }
  ],
  userStories: [
    {
      id: "US-001",
      title: "User Login",
      given: "I am a registered user",
      when: "I enter valid credentials",
      then: "I should be logged in successfully"
    }
  ],
  successCriteria: [
    {
      id: "SC-001",
      description: "All functional requirements pass verification",
      verificationMethod: "Test suite execution"
    }
  ],
  architectureDiagram: `\`\`\`
┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │
└──────────┘     └──────────┘
                      │
                      ▼
                 ┌──────────┐
                 │  Database│
                 └──────────┘
\`\`\`

<details>
<summary>Detailed Mermaid Diagram</summary>

\`\`\`mermaid
graph TD
    A[Client] --> B[API]
    B --> C[Database]
\`\`\`
</details>`,
  milestone: "MVP"  // Optional Linear milestone
});

if (result.success) {
  console.log(`✅ ${result.message}`);
  console.log(`   Artifact: ${result.artifactPath}`);
} else {
  console.error(`❌ ${result.error}`);
  console.log(`   ${result.message}`);
}
```

### Manual Template Creation

If you prefer to fill in the spec manually:

```typescript
import { createSpecManual } from "./phases/specify";

const result = await createSpecManual("user-auth");
// Creates spec.md with template - edit manually
```

## Input Fields

### Functional Requirement

```typescript
{
  id: string;              // FR-001, FR-002, etc.
  description: string;     // What the system must do
  priority: "must" | "should" | "could" | "wont";  // MoSCoW priority
  verificationMethod: string;  // How to verify (test type, manual, etc.)
}
```

**Priority Levels (MoSCoW):**
- `must` - Non-negotiable requirement
- `should` - Important but not critical
- `could` - Nice to have
- `wont` - Explicitly out of scope

### Non-Functional Requirement

```typescript
{
  id: string;           // NFR-001, NFR-002, etc.
  description: string;  // Performance, security, etc.
  metric: string;       // What you measure
  target: string;       // Target value
}
```

**Common NFR Types:**
- Performance (latency, throughput)
- Security (encryption, auth)
- Scalability (concurrent users)
- Availability (uptime %)
- Maintainability (test coverage)

### User Story

```typescript
{
  id: string;      // US-001, US-002, etc.
  title: string;   // Short descriptive title
  given: string;   // Initial context
  when: string;    // Action taken
  then: string;    // Expected outcome
}
```

**Format:** Given/When/Then (Gherkin style)

### Success Criterion

```typescript
{
  id: string;                 // SC-001, SC-002, etc.
  description: string;        // What defines success
  verificationMethod: string; // How to verify
}
```

### Architecture Diagram

**Format:** ASCII + Collapsible Mermaid

```markdown
\`\`\`
┌─────────────┐     ┌─────────────┐
│  Component  │────▶│  Component  │
└─────────────┘     └─────────────┘
\`\`\`

<details>
<summary>Detailed Mermaid Diagram</summary>

\`\`\`mermaid
graph TD
    A[Component] --> B[Component]
\`\`\`
</details>
```

**Why both?**
- ASCII for quick scanning
- Mermaid for detailed view (collapsible to avoid clutter)

## Output

Creates `specs/spec.md` with:

```yaml
---
feature: user-auth
phase: specify
status: draft
created: 2026-01-25
based_on: proposal.md
version: 1.0.0
milestone: MVP  # If provided
---
```

## Git Integration

Automatically creates a commit:

```
SpecFirst: specify phase complete for user-auth

Artifact: specs/spec.md
Status: complete
Timestamp: 2026-01-25T15:30:00.000Z
```

## Error Handling

### Missing Proposal

```
❌ Cannot run specify phase: missing required artifacts

  - proposal.md (path/to/proposal.md)

Run the 'propose' phase first to generate required artifacts.
```

**Resolution:** Run `proposePhase()` first.

### Invalid Priority

If you use an invalid priority:

```typescript
// WRONG
priority: "high"  // Not a valid MoSCoW priority

// RIGHT
priority: "must"  // Valid MoSCoW
```

## Testing

Run the self-test:

```bash
bun run phases/specify.ts
```

**Expected output:**
```
🧪 Specify Phase Self-Test

Test 1: Input validation
✅ Pass

Test 2: Generate spec content
✅ Pass

Test 3: Template generation
✅ Pass

Test 4: Priority validation
✅ Pass

Test 5: Architecture diagram format
✅ Pass

✅ All tests passed!

📋 ISC Coverage:
  ✅ #25: Specify phase creates spec with functional requirements
  ✅ #26: Specify phase includes architecture diagrams (ASCII + Mermaid)
```

## ISC Verification

This phase satisfies:

| # | Criterion | Implementation |
|---|-----------|----------------|
| 25 | Specify phase creates spec with functional requirements | `generateSpec()` creates FR-001, FR-002, etc. with MoSCoW priority |
| 26 | Specify phase includes architecture diagrams ASCII Mermaid | `architectureDiagram` field supports ASCII + collapsible Mermaid |

## Next Phase

After Specify completes, run the **Plan** phase:

```typescript
import { planPhase } from "./phases/plan";
```

The Plan phase transforms requirements into implementation ADRs and task breakdown.

## See Also

- `artifacts/spec.ts` - Spec generation logic
- `gates/artifact.ts` - Artifact gate validation
- `lib/git.ts` - Git commit automation
