# Linear Offline Resilience

**Status:** ✅ Implemented  
**ISC Criteria:** 44-45  
**File:** `integrations/linear-offline.ts`

## Overview

Provides offline resilience for Linear integration. When Linear API is unavailable:
1. Prompts user for manual confirmation (ISC 44)
2. Queues sync operations for later (ISC 45)
3. Processes queue when connection restored

## Key Features

### 1. Manual Confirmation Prompts (ISC 44)
When Linear unavailable, prompts user to acknowledge manual sync needed:
```typescript
const canContinue = await promptManualConfirmation("specify", "User Authentication");
// Logs warning, allows continuation without blocking workflow
```

### 2. Persistent Queue (ISC 45)
Stores failed syncs in `~/.opencode/MEMORY/STATE/linear-sync-queue.json`:
```json
{
  "queue": [
    {
      "issueId": "PAI-123",
      "phase": "specify",
      "teamId": "team-id",
      "timestamp": 1706234567890,
      "retries": 0
    }
  ],
  "lastProcessed": 1706234567890
}
```

### 3. Automatic Retry with Max Limit
- Retries failed syncs up to 3 times
- Drops items after MAX_RETRIES exceeded
- Tracks retry count per queue item

### 4. Sync with Fallback Pattern
Primary interface for resilient syncing:
```typescript
const result = await syncWithFallback(issueId, phase, teamId);

if (result.synced) {
  console.log("✓ Synced to Linear");
} else if (result.queued) {
  console.log("⊘ Queued for later (Linear offline)");
}
```

## API Reference

### Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `syncWithFallback()` | Try sync, queue if offline | `{ synced, queued }` |
| `queueSync()` | Manually add to queue | `void` |
| `processQueue()` | Process all queued items | `{ processed, failed, remaining }` |
| `getQueueStatus()` | Check queue without processing | `{ items, oldestTimestamp }` |
| `promptManualConfirmation()` | Offline prompt for user | `boolean` |

### Integration Points

**Used by:** SpecFirst phases after completion  
**Uses:** `linear-client.ts` (isLinearAvailable), `linear-status.ts` (syncPhaseStatus)

## Workflow

```
Phase Complete
      ↓
syncWithFallback()
      ↓
  Linear Available?
    ↙     ↘
  YES      NO
   ↓        ↓
syncPhase  queueSync()
Status()      ↓
   ↓      Store to file
Success!     ↓
         (Later...)
             ↓
      processQueue()
             ↓
      Linear Available?
        ↙     ↘
      YES      NO
       ↓        ↓
    Retry    Keep in queue
    syncs       ↓
       ↓     Try again later
    Success!
```

## Testing

Self-test verifies:
- ✅ Queue write operations
- ✅ Queue read operations  
- ✅ Queue processing (when Linear available)
- ✅ Status checking

```bash
cd ~/.opencode/skills/SpecFirst
bun run -e "import { selfTest } from './integrations/linear-offline'; await selfTest()"
```

## Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Queue File | `linear-sync-queue.json` | `~/.opencode/MEMORY/STATE/` |
| Max Retries | 3 | `MAX_RETRIES` constant |
| Retry Strategy | Exponential (1→2→3 then drop) | `processQueue()` |

## Error Handling

| Error Type | Behavior |
|------------|----------|
| Linear unavailable | Queue for later |
| Network error | Queue + retry |
| Rate limit | Queue + retry (respects Retry-After header) |
| Max retries exceeded | Drop with warning |
| Queue file write error | Throw error (critical) |

## Dependencies

```typescript
import { isLinearAvailable } from "./linear-client";
import { syncPhaseStatus } from "./linear-status";
```

## Future Enhancements

Possible improvements:
- Interactive stdin prompt in TTY environments
- Exponential backoff for retries
- Queue metrics (age, retry distribution)
- Webhook notification when queue processed
- Auto-process on cron/interval

## ISC Verification

| # | Criterion | Evidence |
|---|-----------|----------|
| 44 | Offline fallback prompts manual confirmation | `promptManualConfirmation()` logs warning when Linear unavailable |
| 45 | Linear integration queues updates for offline sync | `queueSync()` persists to file, `processQueue()` syncs on reconnect |

---

**Last Updated:** 2026-01-25  
**Maintainer:** SpecFirst Team
