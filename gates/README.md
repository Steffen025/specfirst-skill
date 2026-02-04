# SpecFirst 3.0 Validation Gates

**Quality gates that enforce SpecFirst constitutional principles before phase execution.**

## Overview

Gates are validation functions that run before/after phase execution to ensure:
- Prerequisites exist (constitution, git repo)
- Artifacts follow canonical format (ISC criteria, 8-word limit)
- Phase dependencies are satisfied (previous artifact exists)
- Git commits mark phase completion

## Available Gates

### 1. Prerequisite Gate

**File:** `gates/prerequisite.ts`
**Purpose:** Validates that constitution and git repository exist
**Runs:** Before ANY phase execution

**CLI Usage:**
```bash
bun gates/prerequisite.ts <feature-name>
```

**Checks:**
- ✅ Constitution file exists at expected location
- ✅ Git repository initialized in project directory

**Exit Codes:**
- `0` - All prerequisites satisfied
- `1` - Missing prerequisites (with resolution steps)

---

### 2. Artifact Gate

**File:** `gates/artifact.ts`
**Purpose:** Validates that previous phase artifact exists
**Runs:** Before Specify, Plan, Implement phases

**CLI Usage:**
```bash
bun gates/artifact.ts <feature-name> <required-artifact>
```

**Checks:**
- ✅ Previous phase artifact file exists
- ✅ Previous phase git commit exists

**Artifacts:**
- `proposal` - Required for Specify phase
- `spec` - Required for Plan phase
- `plan` - Required for Implement phase

**Exit Codes:**
- `0` - Artifact exists
- `1` - Missing artifact (run previous phase first)

---

### 3. ISC Format Gate

**File:** `gates/isc-format.ts`
**Purpose:** Validates tasks.md follows ISC format rules
**Runs:** After Implement phase (validates generated tasks.md)

**CLI Usage:**
```bash
# Validate file
bun gates/validate-isc.ts path/to/tasks.md

# Validate stdin
cat tasks.md | bun gates/validate-isc.ts
```

**Checks:**

#### ✅ Criterion Word Count (EXACTLY 8 words)
```markdown
# Valid (8 words)
Webhook endpoint accepts POST with enrichment payload data

# Invalid (9 words)
Webhook endpoint accepts POST requests with enrichment payload data

# Invalid (3 words)
User auth works
```

#### ✅ Status Symbols

**For ISC TRACKER criteria:**
- ⬜ PENDING
- 🔄 IN_PROGRESS
- ✅ VERIFIED
- ❌ FAILED

**For ANTI-CRITERIA:**
- 👀 WATCHING
- ✅ AVOIDED
- ❌ TRIGGERED

#### ✅ Table Structure

**ISC TRACKER requires 4 columns:**
```markdown
| # | Criterion | Status | Evidence |
```

**ANTI-CRITERIA requires 3 columns:**
```markdown
| # | Criterion | Status |
```

#### ✅ Required Sections

All tasks.md files MUST have:
- `## IDEAL` - One-sentence ideal outcome
- `## ISC TRACKER` - Criteria table
- `## ANTI-CRITERIA` - Failure modes to avoid
- `## PROGRESS` - Status summary

**Exit Codes:**
- `0` - All validation passed
- `1` - Validation errors found (with line numbers)

**Output Format:**
```
❌ ISC format validation FAILED

Found 2 error(s):

  • Line 11: Criterion must be EXACTLY 8 words
    Criterion: "User auth works"
    Word count: 3 (expected 8)
    
  • Line 12: Invalid status symbol "DONE". Must be one of: ⬜, 🔄, ✅, ❌
    Criterion: "Database connection pool maintains exactly five active connections"

⚠️  Warnings:
  Line 15: Criterion has 7 words (expected 8): "Error messages include timestamp and correlation request identifier"
```

---

### 4. Phase Completion Gate

**File:** `gates/phase-completion.ts` (planned)
**Purpose:** Validates git commit marks phase completion
**Runs:** After each phase execution

**CLI Usage:**
```bash
bun gates/phase-completion.ts <feature-name> <phase-name>
```

**Checks:**
- ✅ Git commit exists with phase marker
- ✅ Commit message follows convention: `SpecFirst: <phase> phase complete for <feature>`

---

## Integration with Phases

Gates integrate into phase workflows like this:

```typescript
// Example: Implement phase workflow

// 1. Run prerequisite gate
const prereq = await prerequisiteGate(featureName);
if (!prereq.passed) {
  console.error(prereq.error);
  console.error(prereq.resolution);
  process.exit(1);
}

// 2. Run artifact gate (plan.md must exist)
const artifact = await artifactGate(featureName, "plan");
if (!artifact.passed) {
  console.error(artifact.error);
  process.exit(1);
}

// 3. Generate tasks.md
await generateTasks(featureName);

// 4. Run ISC format gate
const tasksContent = readFileSync(tasksPath, "utf-8");
const iscValidation = validateISCFormat(tasksContent);
if (!iscValidation.passed) {
  console.error(formatValidationResult(iscValidation));
  process.exit(1);
}

// 5. Commit phase completion
await commitPhase(featureName, "implement");
```

---

## Self-Testing

All gates include self-tests that run when executed directly:

```bash
# Test prerequisite gate
bun gates/prerequisite.ts

# Test ISC format gate (runs 5 test cases)
bun gates/isc-format.ts

# Test artifact gate
bun gates/artifact.ts
```

---

## Common Issues

### Issue: "Criterion must be EXACTLY 8 words"

**Problem:** Your criterion has too many or too few words.

**Solution:** Rewrite to exactly 8 words while maintaining clarity.

```markdown
# Too short (3 words)
❌ User auth works

# Too long (10 words)
❌ User authentication endpoint responds with a valid JWT token successfully

# Just right (8 words)
✅ User authentication endpoint responds with valid JWT token
```

### Issue: "Invalid status symbol"

**Problem:** Using wrong emoji or text for status.

**Solution:** Use only the allowed symbols:

```markdown
# Wrong
❌ | 1 | Criterion | DONE | Evidence |
❌ | 1 | Criterion | ✓ | Evidence |

# Right
✅ | 1 | Criterion | ✅ | Evidence |
✅ | 1 | Criterion | 🔄 | Evidence |
```

### Issue: "Missing required section"

**Problem:** tasks.md is missing a required section.

**Solution:** Add all four required sections:

```markdown
## IDEAL
[One-sentence ideal outcome]

## ISC TRACKER
[Criteria table]

## ANTI-CRITERIA
[Failure modes]

## PROGRESS
[Status summary]
```

---

## Gate Philosophy

**Gates enforce constitutional principles:**

1. **Fail Fast** - Catch errors early before wasting effort
2. **Clear Feedback** - Line numbers, specific errors, resolution steps
3. **Self-Documenting** - Gates encode quality standards in code
4. **Composable** - Each gate validates one concern, gates combine for full validation

**Gates are NOT:**
- ❌ Bureaucratic checkboxes
- ❌ Arbitrary rules
- ❌ Obstacles to productivity

**Gates ARE:**
- ✅ Automated quality assurance
- ✅ Constitutional enforcement
- ✅ Time savers (catch errors before downstream work)

---

## Adding New Gates

To add a new validation gate:

1. **Create gate file:** `gates/<gate-name>.ts`
2. **Export interface:** `GateResult` with `passed`, `errors`, `warnings`
3. **Write validation logic:** Pure function that validates content
4. **Add self-tests:** Test cases that run when executed directly
5. **Create CLI wrapper:** Separate file for command-line usage
6. **Update this README:** Document the new gate

**Template:**
```typescript
export interface GateResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export function validateSomething(content: string): GateResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  
  // Validation logic here
  
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

// Self-test
if (import.meta.main) {
  // Test cases here
}
```

---

*SpecFirst 3.0 - Quality Gates for Specification-Driven Development*
