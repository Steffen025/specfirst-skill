# Release Phase Usage Guide

## Overview

The Release phase is the final phase of SpecFirst 3.0. It verifies that all ISC criteria are complete and generates comprehensive release notes from all artifacts.

## ISC Criteria Coverage

- **ISC #31**: Verifies all ISC criteria verified (✅ status required)
- **ISC #32**: Generates release notes from artifacts (proposal, spec, plan, tasks, git history)

## Prerequisites

Before running the release phase, ensure:

1. ✅ All previous phases completed (propose, specify, plan, implement)
2. ✅ All ISC criteria in tasks.md have status ✅
3. ✅ No anti-criteria have been triggered (❌ status)
4. ✅ Git repository is initialized and has phase commits

## Usage

### Basic Usage

```typescript
import { releasePhase } from "./phases/release";

const result = await releasePhase({
  featureName: "contact-enrichment",
  version: "1.0.0",
  releaseDate: "2026-01-25",  // Optional, defaults to today
  additionalNotes: "Initial release with OSINT-first enrichment."
});

if (result.success) {
  console.log(`✅ Release notes created: ${result.artifactPath}`);
  console.log(result.releaseNotes);
} else {
  console.error(`❌ Release failed: ${result.error}`);
  if (result.incompleteCriteria) {
    console.error(`${result.incompleteCriteria} criteria still incomplete`);
  }
}
```

### Input Interface

```typescript
interface ReleaseInput {
  featureName: string;        // Required: Feature name
  version: string;            // Required: Semantic version (e.g., "1.0.0")
  releaseDate?: string;       // Optional: YYYY-MM-DD format
  additionalNotes?: string;   // Optional: Additional release notes
}
```

### Output Interface

```typescript
interface PhaseResult {
  success: boolean;              // True if release successful
  artifactPath?: string;         // Path to RELEASE.md
  error?: string;                // Error message if failed
  releaseNotes?: string;         // Generated release notes content
  incompleteCriteria?: number;   // Count of incomplete criteria (if any)
}
```

## Release Notes Format

The generated RELEASE.md includes:

```markdown
---
feature: {featureName}
version: {version}
release_date: {date}
phase: release
status: complete
---

# {feature} - Release Notes v{version}

**Release Date:** {date}

## Summary
{Problem statement from proposal.md}

## Features Implemented
{Functional requirements from spec.md}
- FR-001: Feature description
- FR-002: Another feature

## Verification Status
- **Total Criteria:** {N}
- **Verified:** {N} ✅
- **Anti-Criteria:** {N} (All avoided ✅)

## Implementation Phases
{Phases from plan.md}
- Phase 1: Foundation
- Phase 2: Implementation

## Phase History
{Git commits from feature development}
- **propose**: 2026-01-20 (abc1234)
- **specify**: 2026-01-21 (def5678)
- **plan**: 2026-01-22 (ghi9012)
- **implement**: 2026-01-24 (jkl3456)
- **release**: 2026-01-25 (mno7890)

## Additional Notes
{User-provided additional notes}
```

## Error Scenarios

### Incomplete Criteria

```typescript
const result = await releasePhase({
  featureName: "my-feature",
  version: "1.0.0"
});

// If criteria are incomplete:
// result.success = false
// result.incompleteCriteria = 3
// result.error = "Cannot release: 3 criteria not verified
//   - #2: Feature two is fully implemented (🔄)
//   - #4: Feature four is fully implemented (⬜)
//   - #7: Documentation is complete and accurate (❌)"
```

### Missing Artifacts

```typescript
// If proposal.md, spec.md, plan.md, or tasks.md missing:
// result.success = false
// result.error = "Artifact gate failed: Missing required artifacts
//   - tasks.md ({path})
//
// Run the 'implement' phase first to generate required artifacts."
```

### Triggered Anti-Criteria

```typescript
// If any anti-criterion has status ❌:
// result.success = false
// result.error = "Cannot release: 2 anti-criteria triggered
//   - A1: No credentials in git history
//   - A3: No breaking changes without migration"
```

## Self-Test

Run the included self-test:

```bash
bun phases/release.ts
```

Expected output:
```
🧪 Testing Release Phase

Test 1: Artifact gate requirements
  ✅ All required artifacts checked

Test 2: Gate failure for missing artifacts
  ✅ Gate correctly rejects missing artifacts

Test 3: Release notes generation
  ✅ Release notes format validated

Test 4: ISC Criteria Coverage
  ISC #31 (Verify all criteria): ✅ PASS
  ISC #32 (Generate release notes): ✅ PASS

Test 5: Incomplete criteria detection simulation
  ✅ Correctly detects incomplete criteria

🎯 Self-test complete
```

## Integration with SpecFirst Workflow

The release phase is called after all implementation tasks are complete:

```typescript
// 1. Propose phase
await proposePhase({ ... });

// 2. Specify phase
await specifyPhase({ ... });

// 3. Plan phase
await planPhase({ ... });

// 4. Implement phase
// ... work through tasks.md criteria ...

// 5. Release phase (final step)
const release = await releasePhase({
  featureName: "my-feature",
  version: "1.0.0",
  additionalNotes: "Ready for production deployment."
});

if (release.success) {
  console.log("🎉 Feature ready for release!");
  console.log(`📄 Release notes: ${release.artifactPath}`);
}
```

## File Locations

| Artifact | Path |
|----------|------|
| Input: tasks.md | `{executionDir}/Features/{feature}/specs/tasks.md` |
| Input: proposal.md | `{executionDir}/Features/{feature}/specs/proposal.md` |
| Input: spec.md | `{executionDir}/Features/{feature}/specs/spec.md` |
| Input: plan.md | `{executionDir}/Features/{feature}/specs/plan.md` |
| Output: RELEASE.md | `{executionDir}/Features/{feature}/specs/RELEASE.md` |
| Git commit | `SpecFirst: release phase complete for {feature}` |

---

*Generated for SpecFirst 3.0 - Release Phase Implementation*
