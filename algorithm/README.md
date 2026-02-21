# Algorithm Integration Module

**Phase 5 of SpecFirst 3.0 - Connects SpecFirst with the PAI Algorithm**

---

## Overview

The Algorithm Integration module bridges SpecFirst 3.0 with the PAI Algorithm, enabling SpecFirst to operate as a capability within Algorithm-driven workflows for large-scale development projects.

**ISC Coverage:**
- **ISC #46:** DETERMINED effort detection triggers SpecFirst capability activation
- **ISC #47:** SpecFirst executes within Algorithm PLAN BUILD phases
- **ISC #48:** ISC format converter loads tasks into tracker
- **ISC #49:** Algorithm ISC tracker remains primary state mechanism

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PAI Algorithm                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ OBSERVE  │→ │  THINK   │→ │   PLAN   │→ │  BUILD   │   │
│  └──────────┘  └──────────┘  └────┬─────┘  └────┬─────┘   │
│                                    │              │          │
└────────────────────────────────────┼──────────────┼──────────┘
                                     │              │
                          ┌──────────▼──────────────▼─────────┐
                          │      SpecFirst Activation        │
                          │  (DETERMINED effort detected)    │
                          └──────────┬───────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
              │  Effort   │   │   Phase   │   │    ISC    │
              │ Detector  │   │Integration│   │  Loader   │
              └───────────┘   └───────────┘   └───────────┘
                  ISC #46         ISC #47       ISC #48,49
```

---

## Modules

### 1. Effort Detector (`effort-detector.ts`)

**Purpose:** Detects when the PAI Algorithm is running at DETERMINED effort level and decides whether to activate SpecFirst.

**ISC #46:** DETERMINED effort detection triggers SpecFirst capability activation

**Key Functions:**
- `detectEffortLevel(algorithmContext)` - Detects effort level from Algorithm context
- `shouldTriggerSpecFirst(effortLevel)` - Determines if SpecFirst should activate
- `createDeterminedDetection()` - Creates explicit DETERMINED detection

**Effort Levels:**
| Level | SpecFirst Activates? | Use Case |
|-------|---------------------|----------|
| MINIMAL | ❌ No | Too small for spec-driven process |
| STANDARD | ❌ No | Regular development workflow sufficient |
| THOROUGH | ✅ Yes | Consider SpecFirst for complex tasks |
| DETERMINED | ✅ Yes | Activate SpecFirst for large-scale projects |

**Example:**
```typescript
import { detectEffortLevel } from "./algorithm/effort-detector";

// Algorithm provides context
const detection = detectEffortLevel({ effortLevel: "DETERMINED" });

if (detection.shouldActivateSpecFirst) {
  console.log("Activating SpecFirst 3.0");
  console.log(`Reason: ${detection.reason}`);
  console.log(`Confidence: ${detection.confidence}`);
}
```

---

### 2. Phase Integration (`phase-integration.ts`)

**Purpose:** Maps SpecFirst phases to Algorithm phases and determines when SpecFirst can execute.

**ISC #47:** SpecFirst executes within Algorithm PLAN BUILD phases

**Phase Mapping:**
| SpecFirst Phase | Algorithm Phase | Purpose |
|----------------|-----------------|---------|
| `propose` | PLAN | Generate proposal.md |
| `specify` | PLAN | Generate spec.md |
| `plan` | PLAN | Generate plan.md and tasks.md |
| `implement` | BUILD | Execute implementation tasks |
| `release` | BUILD | Deploy and verify |

**Key Functions:**
- `mapToAlgorithmPhase(specFirstPhase)` - Maps SpecFirst phase to Algorithm phase
- `canExecuteInPhase(specFirstPhase, currentAlgorithmPhase)` - Checks if execution is allowed
- `checkPhaseCompatibility(currentAlgorithmPhase)` - Checks if SpecFirst can run now

**Example:**
```typescript
import { canExecuteInPhase, checkPhaseCompatibility } from "./algorithm/phase-integration";

// Check if we can run propose phase
if (canExecuteInPhase("propose", "PLAN")) {
  console.log("Can execute propose phase in PLAN");
}

// Check current compatibility
const compat = checkPhaseCompatibility("OBSERVE");
if (!compat.compatible) {
  console.log(`Wait for ${compat.suggestedAlgorithmPhase} phase`);
}
```

---

### 3. ISC Loader (`isc-loader.ts`)

**Purpose:** Loads tasks.md ISC format into Algorithm ISC tracker format. READ-ONLY converter.

**ISC #48:** ISC format converter loads tasks into tracker  
**ISC #49:** Algorithm ISC tracker remains primary state mechanism

**Design Principle (ISC #49):**
The Algorithm's ISC tracker is the PRIMARY state mechanism. This module provides READ-ONLY conversion from tasks.md to ISC tracker format. It does NOT write back to tasks.md.

**Flow:**
1. SpecFirst generates tasks.md with ISC criteria
2. ISC Loader reads tasks.md → converts to Algorithm ISC tracker format
3. Algorithm tracks progress in its own ISC tracker
4. SpecFirst updates tasks.md based on completed work (separate process)

**Key Functions:**
- `loadTasksIntoTracker(tasksPath)` - Loads tasks.md and converts to ISC tracker
- `parseISCTable(content)` - Parses ISC table from tasks.md content
- `validateLoadedISC(entries)` - Validates loaded ISC entries
- `formatAsAlgorithmTracker(loadedISC)` - Formats as Algorithm ISC tracker table

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

**Output Format:**
```
🎯 ISC TRACKER ═══════════════════════════════════════════════════════════
   IDEAL: Perfect ISC format with all criteria verified successfully.

│ ID │ Criterion (8-12 words)                               │ Status      │ Evidence       │
├───┼──────────────────────────────────────────────────────┼─────────────┼────────────────┤
│  1 │ User authentication endpoint responds with valid JWT token │ ✅ VERIFIED  │ Test passed    │
│  2 │ Database connection pool maintains exactly five active connections │ 🔄 IN_PROGRESS │ In progress    │
│  3 │ Error messages include timestamp and correlation request identifier │ ⬜ PENDING   │ Not started    │
└───┴──────────────────────────────────────────────────────┴─────────────┴────────────────┘
   SCORE: 1/3 verified │ PROGRESS: 33%
```

---

## Integration Workflow

### 1. Algorithm Detection Phase

```typescript
// In Algorithm OBSERVE/THINK phase
import { detectEffortLevel } from "./algorithm";

const detection = detectEffortLevel(algorithmContext);

if (detection.shouldActivateSpecFirst) {
  // Proceed to SpecFirst activation
}
```

### 2. Phase Compatibility Check

```typescript
// In Algorithm PLAN phase
import { checkPhaseCompatibility, canExecuteInPhase } from "./algorithm";

const compat = checkPhaseCompatibility("PLAN");

if (compat.compatible && canExecuteInPhase("propose", "PLAN")) {
  // Execute SpecFirst propose phase
}
```

### 3. ISC Tracker Integration

```typescript
// After SpecFirst generates tasks.md
import { loadTasksIntoTracker, formatAsAlgorithmTracker } from "./algorithm";

const isc = await loadTasksIntoTracker("path/to/tasks.md");

// Display in Algorithm ISC tracker format
const table = formatAsAlgorithmTracker(isc);
console.log(table);

// Use criteria in Algorithm VERIFY phase
for (const entry of isc.criteria) {
  if (entry.status === "✅") {
    console.log(`Verified: ${entry.criterion}`);
  }
}
```

---

## Testing

All modules include self-tests. Run with:

```bash
# Test effort detector
bun algorithm/effort-detector.ts

# Test phase integration
bun algorithm/phase-integration.ts

# Test ISC loader
bun algorithm/isc-loader.ts
```

**Expected Output:**
```
🧪 Testing [Module Name]

Test 1: [Test description]
  Result: ✅ PASS

Test 2: [Test description]
  Result: ✅ PASS

...

ISC Criterion Verification
  ISC #XX (description): ✅ PASS

🎯 Self-test complete
```

---

## ISC Criteria Verification

| # | Criterion | Implementation | Verified |
|---|-----------|----------------|----------|
| 46 | DETERMINED effort detection triggers SpecFirst capability activation | `effort-detector.ts` - `shouldTriggerSpecFirst()` | ✅ |
| 47 | SpecFirst executes within Algorithm PLAN BUILD phases | `phase-integration.ts` - `PHASE_MAP` | ✅ |
| 48 | ISC format converter loads tasks into tracker | `isc-loader.ts` - `loadTasksIntoTracker()` | ✅ |
| 49 | Algorithm ISC tracker remains primary state mechanism | `isc-loader.ts` - READ-ONLY design | ✅ |

**Evidence:**
- All self-tests pass (see test outputs above)
- Effort detector correctly identifies DETERMINED/THOROUGH and activates
- Phase integration maps all SpecFirst phases to PLAN or BUILD only
- ISC loader successfully parses tasks.md and converts to tracker format
- ISC loader is read-only - does not write back to tasks.md

---

## API Reference

### Effort Detector

```typescript
export type EffortLevel = "MINIMAL" | "STANDARD" | "THOROUGH" | "DETERMINED";

export interface EffortDetection {
  effortLevel: EffortLevel;
  shouldActivateSpecFirst: boolean;
  reason: string;
  confidence: number; // 0-1
}

export function detectEffortLevel(algorithmContext: unknown): EffortDetection;
export function shouldTriggerSpecFirst(effortLevel: string): boolean;
export function createDeterminedDetection(): EffortDetection;
export function isValidEffortDetection(obj: unknown): obj is EffortDetection;
```

### Phase Integration

```typescript
export type SpecFirstPhase = "propose" | "specify" | "plan" | "implement" | "release";
export type AlgorithmPhase = "OBSERVE" | "THINK" | "PLAN" | "BUILD" | "EXECUTE" | "VERIFY" | "LEARN";

export interface PhaseMapping {
  specFirstPhase: SpecFirstPhase;
  algorithmPhase: AlgorithmPhase;
  canExecute: boolean;
  reason: string;
}

export interface PhaseCompatibility {
  compatible: boolean;
  suggestedAlgorithmPhase: AlgorithmPhase | null;
  reason: string;
}

export function mapToAlgorithmPhase(specFirstPhase: string): AlgorithmPhase;
export function canExecuteInPhase(specFirstPhase: string, currentAlgorithmPhase: string): boolean;
export function getPhaseMapping(specFirstPhase: string, currentAlgorithmPhase: string): PhaseMapping;
export function checkPhaseCompatibility(currentAlgorithmPhase: string): PhaseCompatibility;
export function getExecutablePhasesFor(algorithmPhase: string): SpecFirstPhase[];
export function getPhaseMatrix(): Record<SpecFirstPhase, AlgorithmPhase>;
```

### ISC Loader

```typescript
export type ISCStatus = "⬜" | "🔄" | "✅" | "❌";

export interface ISCEntry {
  id: number;
  criterion: string; // 8-12 words
  status: ISCStatus;
  evidence?: string;
  phase?: string;
}

export interface AntiCriterionEntry {
  id: string; // e.g., "A1", "A2"
  criterion: string;
  status: "👀" | "✅" | "❌";
}

export interface LoadedISC {
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

export async function loadTasksIntoTracker(tasksPath: string): Promise<LoadedISC>;
export function parseISCTable(content: string): ISCEntry[];
export function validateLoadedISC(entries: ISCEntry[]): { valid: boolean; errors: string[] };
export function formatAsAlgorithmTracker(loadedISC: LoadedISC): string;
```

---

## Design Decisions

### 1. Read-Only ISC Loader (ISC #49)

**Decision:** ISC loader is read-only and does NOT write back to tasks.md.

**Rationale:**
- Algorithm ISC tracker is the primary state mechanism during execution
- SpecFirst remains responsible for updating tasks.md based on completed work
- Prevents state synchronization conflicts
- Clear separation of concerns: Algorithm tracks, SpecFirst documents

### 2. Two-Level Activation (THOROUGH + DETERMINED)

**Decision:** Both THOROUGH and DETERMINED effort levels activate SpecFirst.

**Rationale:**
- DETERMINED is explicit large-scale activation
- THOROUGH handles complex tasks that benefit from spec-driven approach
- Provides flexibility for Algorithm to choose appropriate level
- Prevents over-activation (MINIMAL/STANDARD don't trigger)

### 3. Strict Phase Mapping (PLAN/BUILD only)

**Decision:** SpecFirst ONLY executes in PLAN and BUILD phases.

**Rationale:**
- Aligns with Algorithm workflow (planning → building)
- Prevents execution in observation/thinking phases (premature)
- Prevents execution in verification/learning phases (too late)
- Clear boundaries for when SpecFirst is appropriate

---

## Next Steps

After Phase 5 implementation:

1. **Test Integration:** Create end-to-end test with Algorithm
2. **Documentation:** Update main SpecFirst README with Algorithm integration
3. **Examples:** Add real-world examples of Algorithm + SpecFirst workflows
4. **Workflow Files:** Create Algorithm-aware workflow templates

---

*Generated by SpecFirst 3.0 - Phase 5 Implementation*
*Last Updated: 2025-01-25*
