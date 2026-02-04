# SpecFirst Integrations

External service integrations for SpecFirst workflow management.

## Linear Client

**File:** `linear-client.ts`

GraphQL API client for Linear project management integration.

### Features

- ✅ **ISC 35:** Query current milestone successfully
- ✅ **ISC 36:** Handle authentication with bearer tokens
- ✅ Graceful degradation when token missing
- ✅ Error handling with retry-after for rate limits
- ✅ Singleton pattern for easy access
- ✅ TypeScript-first with full type safety

### Setup

```bash
export LINEAR_API_TOKEN="lin_api_..."
```

Get your token from: https://linear.app/settings/api

### Usage

```typescript
import { getLinearClient, isLinearAvailable } from "./linear-client";

// Check if configured
if (isLinearAvailable()) {
  const client = getLinearClient();
  
  // Get current milestone
  const milestone = await client.getCurrentMilestone(teamId);
  
  // Get issue details
  const issue = await client.getIssue("PAI-123");
  
  // Update issue state
  await client.updateIssueState(issueId, stateId);
}
```

### API Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `isConfigured()` | Check if token is set | `boolean` |
| `getCurrentMilestone(teamId)` | Get team's active cycle | `Milestone \| null` |
| `getIssue(identifier)` | Get issue by ID/identifier | `Issue \| null` |
| `updateIssueState(issueId, stateId)` | Change issue state | `boolean` |
| `getTeamStates(teamId)` | Get workflow states | `WorkflowState[]` |

### Error Handling

```typescript
import { LinearAPIError } from "./linear-client";

try {
  await client.getCurrentMilestone(teamId);
} catch (error) {
  if (error instanceof LinearAPIError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.retryAfter) {
      console.log(`Retry after ${error.retryAfter}s`);
    }
  }
}
```

### Error Codes

- `UNCONFIGURED` - No API token set
- `RATE_LIMIT` - API rate limit exceeded (includes retryAfter)
- `HTTP_ERROR` - HTTP request failed
- `GRAPHQL_ERROR` - GraphQL query error
- `NETWORK_ERROR` - Network connectivity issue
- `EMPTY_RESPONSE` - API returned no data

### Testing

```bash
# Run self-test
bun run integrations/linear-client.test.ts

# See examples
cat integrations/linear-client.example.ts
```

### Graceful Degradation

All methods return `null`, `false`, or `[]` when:
- Token not configured
- Network unavailable
- API returns errors

This allows SpecFirst to work offline or without Linear integration.

---

## Milestone Validation (`linear-milestone.ts`)

Validates features are in the current development milestone and captures milestone metadata.

### Features

- ✅ **ISC 37:** Milestone validation blocks features from wrong milestone
- ✅ **ISC 38:** Milestone validation captures milestone in spec metadata
- ✅ Graceful offline behavior (skip validation when Linear unavailable)
- ✅ Formatted milestone names for spec frontmatter
- ✅ Boolean convenience methods

### Setup

Requires `LINEAR_API_TOKEN` from Linear Client setup.

Optional test configuration:
```bash
export LINEAR_TEST_FEATURE_ID="PAI-123"
export LINEAR_TEST_TEAM_ID="team-xxx"
```

### Usage

**Basic Validation:**
```typescript
import { validateMilestone } from "./linear-milestone";

const result = await validateMilestone("PAI-123", "team-xxx");

if (!result.valid && !result.skipped) {
  console.error(`BLOCKED: ${result.error}`);
  // Feature is in wrong milestone - don't proceed
}
```

**Get Milestone Metadata:**
```typescript
import { getMilestoneForSpec } from "./linear-milestone";

const milestone = await getMilestoneForSpec("PAI-123");
// Returns: "v1.0 - January 2026"
```

**Boolean Check:**
```typescript
import { isInCurrentMilestone } from "./linear-milestone";

const inCurrent = await isInCurrentMilestone("PAI-123", "team-xxx");
if (!inCurrent) {
  console.warn("Feature should be moved to current milestone");
}
```

### API Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `validateMilestone(featureId, teamId)` | Validate feature is in current milestone | `MilestoneValidationResult` |
| `getMilestoneForSpec(featureId)` | Get formatted milestone name | `string \| null` |
| `isInCurrentMilestone(featureId, teamId)` | Boolean milestone check | `boolean` |

### Integration in Specify Phase

```typescript
async function specifyPhase(featureId: string, teamId: string) {
  // 1. Validate milestone
  const validation = await validateMilestone(featureId, teamId);
  
  if (!validation.valid && !validation.skipped) {
    return { 
      success: false, 
      error: validation.error,
      blockedBy: "milestone_mismatch"
    };
  }

  // 2. Get milestone for metadata
  const milestone = await getMilestoneForSpec(featureId);

  // 3. Generate spec with milestone
  const spec = generateSpec({
    feature_id: featureId,
    milestone: milestone,
    team_id: teamId,
  });

  return { success: true, spec };
}
```

### Testing

```bash
# Run self-test
bun run integrations/linear-milestone.ts

# Run examples
bun run integrations/linear-milestone.example.ts

# With test feature
LINEAR_TEST_FEATURE_ID="PAI-123" LINEAR_TEST_TEAM_ID="team-xxx" \
  bun run integrations/linear-milestone.ts
```

---

## Linear Status Sync

**File:** `linear-status.ts`

Synchronizes SpecFirst phase completions to Linear issue states.

### Features

- ✅ **ISC 39:** Status sync updates Linear issue after propose
- ✅ **ISC 40:** Status sync updates Linear issue after specify
- ✅ **ISC 41:** Status sync updates Linear issue after plan
- ✅ **ISC 42:** Status sync updates Linear issue after implement
- ✅ **ISC 43:** Status sync updates Linear issue after release
- ✅ Graceful degradation when Linear unavailable
- ✅ Case-insensitive state matching
- ✅ Batch sync for catching up after offline

### Phase to State Mapping

```
propose   → Specified        (has proposal)
specify   → Planned          (has spec)
plan      → Ready for Dev    (has implementation plan)
implement → In Progress      (working on tasks)
release   → Done             (deployed)
```

### Setup

1. **Configure Linear Token**
   ```bash
   export LINEAR_API_TOKEN="lin_api_..."
   ```

2. **Find Your Team ID**
   ```bash
   # In Linear GraphQL explorer
   query { teams { nodes { id, name } } }
   ```

3. **Validate Team Workflow**
   ```bash
   LINEAR_TEAM_ID=your-team-id bun run linear-status.integration-test.ts
   ```

### Usage

**Sync Phase Completion:**
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

**Validate Team Setup:**
```typescript
import { validateTeamWorkflow } from "./integrations/linear-status";

const missing = await validateTeamWorkflow(teamId);
if (missing.length > 0) {
  console.warn(`Add these states: ${missing.join(", ")}`);
}
```

**Get Expected State:**
```typescript
import { getExpectedState } from "./integrations/linear-status";

const state = getExpectedState("propose");
console.log(state); // "Specified"
```

### API Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `syncPhaseStatus(issueId, phase, teamId)` | Sync single phase | `StatusSyncResult` |
| `syncAllPhases(issueId, phases, teamId)` | Batch sync (latest only) | `StatusSyncResult[]` |
| `getExpectedState(phase)` | Get state name for phase | `string` |
| `validateTeamWorkflow(teamId)` | Check for missing states | `string[]` |

### Testing

```bash
# Unit tests
bun test linear-status.test.ts

# Integration test (requires LINEAR_TEAM_ID)
LINEAR_TEAM_ID=xxx bun run linear-status.integration-test.ts
```

### Troubleshooting

**"State not found in team workflow"**
- Add the required state in Linear: Settings → Teams → Workflow States
- State names must match exactly (case-insensitive)

**"LINEAR_API_TOKEN not set"**
- Get token from: https://linear.app/settings/api
- Export as environment variable

**"No workflow states found for team"**
- Team ID might be incorrect
- Verify with GraphQL query: `query { teams { nodes { id, name } } }`

---

## Architecture

```
SpecFirst
├── integrations/
│   ├── linear-client.ts       ← Foundation (ISC 35-36)
│   ├── linear-client.test.ts
│   ├── linear-status.ts       ← Status sync (ISC 39-43)
│   ├── linear-status.test.ts
│   ├── linear-status.integration-test.ts
│   └── README.md              ← This file
```

Dependencies flow:
```
linear-client.ts (foundation)
    ↓
├─ linear-milestone.ts (milestone validation)
└─ linear-status.ts (status sync)
    ↓
offline.ts (future: queues updates when client unavailable)
```

---

**Status:** 
- ✅ linear-client.ts - ISC 35-36 satisfied
- ✅ linear-milestone.ts - ISC 37-38 satisfied
- ✅ linear-status.ts - ISC 39-43 satisfied

**Dependencies:** linear-client.ts (foundation)
**Dependents:** SpecFirst workflow orchestrator (upcoming)
