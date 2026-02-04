# Linear Status Sync - Quick Reference

## Phase Mapping (ISC 39-43)

| SpecFirst Phase | Linear State | ISC |
|-----------------|--------------|-----|
| propose | Specified | 39 |
| specify | Planned | 40 |
| plan | Ready for Dev | 41 |
| implement | In Progress | 42 |
| release | Done | 43 |

## Setup (One-Time)

```bash
# 1. Get API token from https://linear.app/settings/api
export LINEAR_API_TOKEN="lin_api_..."

# 2. Get team ID
export LINEAR_TEAM_ID="your-team-id"

# 3. Validate workflow
bun run linear-status.integration-test.ts
```

## Usage

### Basic Sync

```typescript
import { syncPhaseStatus } from "./integrations/linear-status";

const result = await syncPhaseStatus(issueId, "propose", teamId);
```

### With Error Handling

```typescript
if (result.success) {
  console.log(`✅ ${result.newState}`);
} else if (result.skipped) {
  // Linear not configured - OK
} else {
  console.error(`❌ ${result.error}`);
}
```

### Validate Team

```typescript
import { validateTeamWorkflow } from "./integrations/linear-status";

const missing = await validateTeamWorkflow(teamId);
// Returns: ["Ready for Dev"] if missing
```

## Common Issues

### Missing State

**Error:** "State 'Ready for Dev' not found"

**Fix:** Add in Linear → Settings → Teams → Workflow States

### Token Not Set

**Error:** "LINEAR_API_TOKEN not set"

**Fix:** `export LINEAR_API_TOKEN="lin_api_..."`

## Testing

```bash
# Unit tests (no credentials needed)
bun test linear-status.test.ts

# Integration test (needs token + team ID)
LINEAR_TEAM_ID=xxx bun run linear-status.integration-test.ts
```

## Files

- `linear-status.ts` - Core implementation
- `linear-status.test.ts` - Unit tests
- `linear-status.integration-test.ts` - Integration test
- `README.md` - Full documentation
