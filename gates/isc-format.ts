#!/usr/bin/env bun
/**
 * ISC Format Validation Gate - SpecFirst 4.0
 * 
 * Validates that tasks.md follows the correct ISC (Ideal State Criteria) format.
 * Updated for Algorithm v1.8.0 compatibility.
 * 
 * Requirements:
 * - Criteria must be 8-12 words (v1.8.0 — was exactly 8)
 * - Only valid status symbols (⬜ 🔄 ✅ ❌ for criteria, 👀 ✅ ❌ for anti-criteria)
 * - Table structure with ID, Criterion, Status, Evidence, Verify columns
 * - Required sections: IDEAL, ISC TRACKER, ANTI-CRITERIA, PROGRESS
 * - Quality Gate checks: QG1 (Count), QG2 (Word count), QG3 (State not action),
 *   QG4 (Binary testable), QG5 (Anti-criteria exist)
 * 
 * @module gates/isc-format
 * @version 4.0.0
 */

export interface ValidationError {
  line: number;
  message: string;
  criterion?: string;
  actual?: number;
  expected?: number;
}

export interface GateResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// Valid status symbols
const CRITERIA_STATUS_SYMBOLS = ['⬜', '🔄', '✅', '❌'];
const ANTI_CRITERIA_STATUS_SYMBOLS = ['👀', '✅', '❌'];

// Required sections
const REQUIRED_SECTIONS = [
  '## IDEAL',
  '## ISC TRACKER',
  '## ANTI-CRITERIA',
  '## PROGRESS'
];

/**
 * Count words in a text string, handling markdown formatting
 */
function countWords(text: string): number {
  // Remove markdown formatting (bold, italic, code)
  const cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
    .replace(/`([^`]+)`/g, '$1')       // Remove inline code
    .trim();
  
  if (cleaned.length === 0) return 0;
  
  return cleaned.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if a line is a table row (contains pipe separators)
 */
function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

/**
 * Check if a line is a table separator (|---|---|)
 */
function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s-:|]+\|\s*$/.test(line);
}

/**
 * Parse a table row into columns
 */
function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // Remove first and last empty strings
    .map(cell => cell.trim());
}

/**
 * Validate ISC format in tasks.md content
 */
export function validateISCFormat(content: string): GateResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const lines = content.split('\n');
  
  let inISCSection = false;
  let inAntiCriteriaSection = false;
  let foundISCTracker = false;
  let foundAntiCriteria = false;
  
  // Check for required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push({
        line: 0,
        message: `Missing required section: ${section}`
      });
    }
  }
  
  // If anti-criteria section exists, mark as found
  if (content.includes('## ANTI-CRITERIA')) {
    foundAntiCriteria = true;
  }
  
  // Parse line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Track sections
    if (line.trim() === '## ISC TRACKER') {
      inISCSection = true;
      foundISCTracker = true;
      inAntiCriteriaSection = false;
      continue;
    }
    
    if (line.trim() === '## ANTI-CRITERIA') {
      inAntiCriteriaSection = true;
      inISCSection = false;
      continue;
    }
    
    // Exit sections on new header
    if (line.startsWith('##') && !line.includes('ISC TRACKER') && !line.includes('ANTI-CRITERIA')) {
      inISCSection = false;
      inAntiCriteriaSection = false;
    }
    
    // Skip non-table rows and separators
    if (!isTableRow(line) || isTableSeparator(line)) {
      continue;
    }
    
    // Parse table row
    const columns = parseTableRow(line);
    
    // Skip header rows (contain "Criterion", "Status", etc.)
    if (columns.some(col => 
      col.toLowerCase().includes('criterion') || 
      col.toLowerCase().includes('status') ||
      col.toLowerCase().includes('evidence')
    )) {
      continue;
    }
    
    // Validate in ISC TRACKER section
    if (inISCSection && columns.length >= 3) {
      const [num, criterion, status, evidence = '', verify = ''] = columns;
      
      // Skip empty rows
      if (!criterion || criterion === '-') continue;
      
      // Validate column count (should be 4-5: ID | Criterion | Status | Evidence [| Verify])
      if (columns.length < 4) {
        errors.push({
          line: lineNum,
          message: `ISC table must have at least 4 columns (ID | Criterion | Status | Evidence), found ${columns.length}`,
          criterion
        });
      }
      
      // Strip confidence tags and priority tags before word count
      const cleanCriterion = criterion
        .replace(/\s*\[(E|I|R)\]\s*/g, '')
        .replace(/\s*\[(CRITICAL|IMPORTANT|NICE)\]\s*/g, '')
        .trim();
      
      // Validate word count (8-12 words, Algorithm v1.8.0)
      const wordCount = countWords(cleanCriterion);
      if (wordCount < 8 || wordCount > 12) {
        if (wordCount === 7 || wordCount === 13) {
          warnings.push(
            `Line ${lineNum}: Criterion has ${wordCount} words (expected 8-12): "${criterion}"`
          );
        }
        errors.push({
          line: lineNum,
          message: `Criterion must be 8-12 words (Algorithm v1.8.0)`,
          criterion,
          actual: wordCount,
          expected: 12 // Upper bound for display
        });
      }
      
      // Validate status symbol
      if (!CRITERIA_STATUS_SYMBOLS.includes(status)) {
        errors.push({
          line: lineNum,
          message: `Invalid status symbol "${status}". Must be one of: ${CRITERIA_STATUS_SYMBOLS.join(', ')}`,
          criterion
        });
      }
    }
    
    // Validate in ANTI-CRITERIA section
    if (inAntiCriteriaSection && columns.length >= 2) {
      const [num, criterion, status = '', evidence = ''] = columns;
      
      // Skip empty rows
      if (!criterion || criterion === '-') continue;
      
      // Anti-criteria can have 3 or 4 columns (# optional, Evidence optional)
      // But if status is provided, validate it
      if (status && !ANTI_CRITERIA_STATUS_SYMBOLS.includes(status)) {
        errors.push({
          line: lineNum,
          message: `Invalid anti-criteria status "${status}". Must be one of: ${ANTI_CRITERIA_STATUS_SYMBOLS.join(', ')}`,
          criterion
        });
      }
      
      // Validate word count for anti-criteria too (8-12 words, Algorithm v1.8.0)
      const wordCount = countWords(criterion);
      if (wordCount < 8 || wordCount > 12) {
        if (wordCount === 7 || wordCount === 13) {
          warnings.push(
            `Line ${lineNum}: Anti-criterion has ${wordCount} words (expected 8-12): "${criterion}"`
          );
        }
        errors.push({
          line: lineNum,
          message: `Anti-criterion must be 8-12 words (Algorithm v1.8.0)`,
          criterion,
          actual: wordCount,
          expected: 12
        });
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Quality Gate Result (Algorithm v1.8.0 — QG1-QG5)
 */
export interface QualityGateResult {
  passed: boolean;
  checks: {
    qg1: { passed: boolean; message: string }; // Count + Structure (>= 4 criteria)
    qg2: { passed: boolean; message: string }; // Word count (8-12 words)
    qg3: { passed: boolean; message: string }; // State not action (no verbs)
    qg4: { passed: boolean; message: string }; // Binary testable
    qg5: { passed: boolean; message: string }; // Anti-criteria exist
  };
}

/** Verbs that indicate action (not state) — QG3 check */
const ACTION_VERBS = [
  'build', 'create', 'run', 'implement', 'add', 'fix', 'write',
  'deploy', 'install', 'configure', 'setup', 'test', 'check',
  'update', 'delete', 'remove', 'refactor', 'migrate', 'ensure',
];

/**
 * Run Algorithm v1.8.0 Quality Gate checks (QG1-QG5).
 * 
 * QG1: Count >= 4 criteria
 * QG2: All criteria 8-12 words
 * QG3: No criterion starts with a verb (state not action)
 * QG4: All criteria are binary testable
 * QG5: At least 1 anti-criterion exists
 * 
 * @param content - Raw tasks.md content
 * @returns QualityGateResult with individual check results
 */
export function runQualityGate(content: string): QualityGateResult {
  const lines = content.split('\n');
  const criteria: string[] = [];
  const antiCriteria: string[] = [];
  let inISCSection = false;
  let inAntiSection = false;
  
  for (const line of lines) {
    if (line.trim() === '## ISC TRACKER') { inISCSection = true; inAntiSection = false; continue; }
    if (line.trim() === '## ANTI-CRITERIA') { inAntiSection = true; inISCSection = false; continue; }
    if (line.startsWith('##') && !line.includes('ISC TRACKER') && !line.includes('ANTI-CRITERIA')) {
      inISCSection = false; inAntiSection = false;
    }
    
    if (!isTableRow(line) || isTableSeparator(line)) continue;
    const columns = parseTableRow(line);
    if (columns.some(col => col.toLowerCase().includes('criterion') || col.toLowerCase().includes('status'))) continue;
    
    if (inISCSection && columns.length >= 2 && columns[1] && columns[1] !== '-') {
      criteria.push(columns[1].trim());
    }
    if (inAntiSection && columns.length >= 2 && columns[1] && columns[1] !== '-') {
      antiCriteria.push(columns[1].trim());
    }
  }
  
  // QG1: Count >= 4
  const qg1 = {
    passed: criteria.length >= 4,
    message: criteria.length >= 4
      ? `PASS: ${criteria.length} criteria (>= 4)`
      : `FAIL: only ${criteria.length} criteria (need >= 4)`,
  };
  
  // QG2: All 8-12 words
  const wordCountIssues = criteria.filter(c => {
    const clean = c.replace(/\s*\[(E|I|R)\]\s*/g, '').replace(/\s*\[(CRITICAL|IMPORTANT|NICE)\]\s*/g, '').trim();
    const wc = countWords(clean);
    return wc < 8 || wc > 12;
  });
  const qg2 = {
    passed: wordCountIssues.length === 0,
    message: wordCountIssues.length === 0
      ? `PASS: all criteria 8-12 words`
      : `FAIL: ${wordCountIssues.length} criteria outside 8-12 word range`,
  };
  
  // QG3: State not action (no verb at start)
  const verbIssues = criteria.filter(c => {
    const clean = c.replace(/\s*\[(E|I|R)\]\s*/g, '').replace(/\s*\[(CRITICAL|IMPORTANT|NICE)\]\s*/g, '').trim();
    const firstWord = clean.split(/\s+/)[0]?.toLowerCase() || '';
    return ACTION_VERBS.includes(firstWord);
  });
  const qg3 = {
    passed: verbIssues.length === 0,
    message: verbIssues.length === 0
      ? `PASS: all state-based criteria`
      : `FAIL: ${verbIssues.length} criteria start with verbs: ${verbIssues.map(c => `"${c.split(/\s+/)[0]}"`).join(', ')}`,
  };
  
  // QG4: Binary testable (heuristic: check for vague qualifiers)
  const VAGUE_QUALIFIERS = ['properly', 'correctly', 'appropriately', 'reasonable', 'good', 'nice', 'well'];
  const vagueIssues = criteria.filter(c => {
    const words = c.toLowerCase().split(/\s+/);
    return words.some(w => VAGUE_QUALIFIERS.includes(w));
  });
  const qg4 = {
    passed: vagueIssues.length === 0,
    message: vagueIssues.length === 0
      ? `PASS: all criteria appear binary testable`
      : `FAIL: ${vagueIssues.length} criteria have vague qualifiers`,
  };
  
  // QG5: Anti-criteria exist
  const qg5 = {
    passed: antiCriteria.length >= 1,
    message: antiCriteria.length >= 1
      ? `PASS: ${antiCriteria.length} anti-criteria`
      : `FAIL: no anti-criteria found (need >= 1)`,
  };
  
  return {
    passed: qg1.passed && qg2.passed && qg3.passed && qg4.passed && qg5.passed,
    checks: { qg1, qg2, qg3, qg4, qg5 },
  };
}

/**
 * Format Quality Gate result for display
 */
export function formatQualityGateResult(result: QualityGateResult): string {
  const lines: string[] = [];
  lines.push(result.passed ? '✅ Quality Gate PASSED' : '❌ Quality Gate BLOCKED');
  lines.push('');
  
  const checks = result.checks;
  lines.push(`  QG1 Count:    [${checks.qg1.passed ? 'PASS' : 'FAIL'}] ${checks.qg1.message}`);
  lines.push(`  QG2 Length:   [${checks.qg2.passed ? 'PASS' : 'FAIL'}] ${checks.qg2.message}`);
  lines.push(`  QG3 State:    [${checks.qg3.passed ? 'PASS' : 'FAIL'}] ${checks.qg3.message}`);
  lines.push(`  QG4 Testable: [${checks.qg4.passed ? 'PASS' : 'FAIL'}] ${checks.qg4.message}`);
  lines.push(`  QG5 Anti:     [${checks.qg5.passed ? 'PASS' : 'FAIL'}] ${checks.qg5.message}`);
  
  return lines.join('\n');
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: GateResult): string {
  const lines: string[] = [];
  
  if (result.passed) {
    lines.push('✅ ISC format validation PASSED');
    if (result.warnings.length > 0) {
      lines.push('\n⚠️  Warnings:');
      result.warnings.forEach(w => lines.push(`  ${w}`));
    }
    return lines.join('\n');
  }
  
  lines.push('❌ ISC format validation FAILED');
  lines.push(`\nFound ${result.errors.length} error(s):\n`);
  
  result.errors.forEach(err => {
    if (err.line === 0) {
      lines.push(`  • ${err.message}`);
    } else {
      lines.push(`  • Line ${err.line}: ${err.message}`);
      if (err.criterion) {
        lines.push(`    Criterion: "${err.criterion}"`);
      }
      if (err.actual !== undefined && err.expected !== undefined) {
        lines.push(`    Word count: ${err.actual} (expected ${err.expected})`);
      }
    }
  });
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  Warnings:');
    result.warnings.forEach(w => lines.push(`  ${w}`));
  }
  
  return lines.join('\n');
}

// Self-test when run directly
if (import.meta.main) {
  console.log('Running ISC Format Validator self-tests...\n');
  
  // Test 1: Valid ISC format
  const validContent = `
## IDEAL
Perfect ISC format with all required sections.

## ISC TRACKER

| ID | Criterion (8-12 words) | Status | Evidence | Verify |
|---|-----------|--------|----------|--------|
| ISC-C1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed | Test: auth |
| ISC-C2 | Database connection pool maintains exactly five active connections | 🔄 | In progress | CLI: pool |
| ISC-C3 | Error messages include timestamp and correlation request identifier | ⬜ | Not started | Grep: fmt |

## ANTI-CRITERIA

| ID | Criterion (8-12 words) | Status | Verify |
|---|-----------|--------|--------|
| ISC-A1 | No credentials exposed in git commit history today | 👀 | Grep: secrets |

## PROGRESS

2/3 criteria verified.
`;

  const test1 = validateISCFormat(validContent);
  console.log('Test 1 - Valid format:');
  console.log(formatValidationResult(test1));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Invalid word count
  const invalidWordCount = `
## IDEAL
Test invalid word counts.

## ISC TRACKER

| ID | Criterion (8-12 words) | Status | Evidence | Verify |
|---|-----------|--------|----------|--------|
| 1 | User auth works | ✅ | Too short | - |
| 2 | This is a criterion that has way too many words in it now | 🔄 | Too long | - |
| 3 | User authentication endpoint responds with valid JWT token | ✅ | Correct | - |

## ANTI-CRITERIA

| ID | Criterion (8-12 words) | Status | Verify |
|---|-----------|--------|--------|
| 1 | No credentials exposed | 👀 | Too short |

## PROGRESS

Mixed.
`;

  const test2 = validateISCFormat(invalidWordCount);
  console.log('Test 2 - Invalid word counts:');
  console.log(formatValidationResult(test2));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Invalid status symbols
  const invalidStatus = `
## IDEAL
Test invalid status symbols.

## ISC TRACKER

| ID | Criterion (8-12 words) | Status | Evidence | Verify |
|---|-----------|--------|----------|--------|
| 1 | User authentication endpoint responds with valid JWT token | ✓ | Wrong symbol | - |
| 2 | Database connection pool maintains exactly five active connections | DONE | Text instead | - |

## ANTI-CRITERIA

| ID | Criterion (8-12 words) | Status | Verify |
|---|-----------|--------|--------|
| 1 | No credentials exposed in git commit history today | ⬜ | Wrong section symbol |

## PROGRESS

Errors.
`;

  const test3 = validateISCFormat(invalidStatus);
  console.log('Test 3 - Invalid status symbols:');
  console.log(formatValidationResult(test3));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Missing sections
  const missingSections = `
## ISC TRACKER

| ID | Criterion (8-12 words) | Status | Evidence | Verify |
|---|-----------|--------|----------|--------|
| 1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed | - |
`;

  const test4 = validateISCFormat(missingSections);
  console.log('Test 4 - Missing required sections:');
  console.log(formatValidationResult(test4));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 5: Wrong column count (< 4 columns should fail)
  const wrongColumns = `
## IDEAL
Test wrong column count.

## ISC TRACKER

| ID | Criterion (8-12 words) | Status |
|---|-----------|--------|
| 1 | User authentication endpoint responds with valid JWT token | ✅ |

## ANTI-CRITERIA

| ID | Criterion (8-12 words) | Status |
|---|-----------|--------|
| 1 | No credentials exposed in git commit history today | 👀 |

## PROGRESS

Missing Evidence column.
`;

  const test5 = validateISCFormat(wrongColumns);
  console.log('Test 5 - Wrong column count:');
  console.log(formatValidationResult(test5));
  
  // Summary
  // NOTE: Tests 2-5 are DESIGNED to test invalid inputs, so validation SHOULD fail.
  // The self-test PASSES if test1 passes (valid input accepted) and tests 2-5 fail (invalid inputs rejected).
  const allPassed = [test1, test2, test3, test4, test5].every((t, i) => {
    const expected = i === 0; // Only first test should pass validation
    return t.passed === expected;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SELF-TEST SUMMARY:');
  console.log('  Test 1 (valid): ' + (test1.passed ? '✅ Correctly accepted' : '❌ Wrongly rejected'));
  console.log('  Test 2 (invalid word count): ' + (!test2.passed ? '✅ Correctly rejected' : '❌ Wrongly accepted'));
  console.log('  Test 3 (invalid status): ' + (!test3.passed ? '✅ Correctly rejected' : '❌ Wrongly accepted'));
  console.log('  Test 4 (missing sections): ' + (!test4.passed ? '✅ Correctly rejected' : '❌ Wrongly accepted'));
  console.log('  Test 5 (wrong columns): ' + (!test5.passed ? '✅ Correctly rejected' : '❌ Wrongly accepted'));
  console.log('\n' + (allPassed ? '✅ All self-tests PASSED - validator works correctly' : '❌ Some self-tests FAILED'));
}
