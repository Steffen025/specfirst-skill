#!/usr/bin/env bun
/**
 * ISC Format Validation Gate
 * 
 * Validates that tasks.md follows the correct ISC (Ideal State Criteria) format.
 * 
 * Requirements:
 * - Criteria must be EXACTLY 8 words
 * - Only valid status symbols (⬜ 🔄 ✅ ❌ for criteria, 👀 ✅ ❌ for anti-criteria)
 * - Four-column table structure (# | Criterion | Status | Evidence)
 * - Required sections: IDEAL, ISC TRACKER, ANTI-CRITERIA, PROGRESS
 * 
 * @module gates/isc-format
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
      const [num, criterion, status, evidence = ''] = columns;
      
      // Skip empty rows
      if (!criterion || criterion === '-') continue;
      
      // Validate column count (should be 4: # | Criterion | Status | Evidence)
      if (columns.length !== 4) {
        errors.push({
          line: lineNum,
          message: `ISC table must have 4 columns (# | Criterion | Status | Evidence), found ${columns.length}`,
          criterion
        });
      }
      
      // Validate word count
      const wordCount = countWords(criterion);
      if (wordCount !== 8) {
        if (wordCount === 7 || wordCount === 9) {
          warnings.push(
            `Line ${lineNum}: Criterion has ${wordCount} words (expected 8): "${criterion}"`
          );
        }
        errors.push({
          line: lineNum,
          message: `Criterion must be EXACTLY 8 words`,
          criterion,
          actual: wordCount,
          expected: 8
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
      
      // Validate word count for anti-criteria too
      const wordCount = countWords(criterion);
      if (wordCount !== 8) {
        if (wordCount === 7 || wordCount === 9) {
          warnings.push(
            `Line ${lineNum}: Anti-criterion has ${wordCount} words (expected 8): "${criterion}"`
          );
        }
        errors.push({
          line: lineNum,
          message: `Anti-criterion must be EXACTLY 8 words`,
          criterion,
          actual: wordCount,
          expected: 8
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

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed |
| 2 | Database connection pool maintains exactly five active connections | 🔄 | In progress |
| 3 | Error messages include timestamp and correlation request identifier | ⬜ | Not started |

## ANTI-CRITERIA

| # | Criterion | Status |
|---|-----------|--------|
| 1 | No credentials exposed in git commit history today | 👀 | Watching |

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

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User auth works | ✅ | Too short |
| 2 | This is a criterion that has way too many words in it | 🔄 | Too long |
| 3 | User authentication endpoint responds with valid JWT token | ✅ | Correct |

## ANTI-CRITERIA

| # | Criterion | Status |
|---|-----------|--------|
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

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User authentication endpoint responds with valid JWT token | ✓ | Wrong symbol |
| 2 | Database connection pool maintains exactly five active connections | DONE | Text instead |

## ANTI-CRITERIA

| # | Criterion | Status |
|---|-----------|--------|
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

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | User authentication endpoint responds with valid JWT token | ✅ | Test passed |
`;

  const test4 = validateISCFormat(missingSections);
  console.log('Test 4 - Missing required sections:');
  console.log(formatValidationResult(test4));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 5: Wrong column count
  const wrongColumns = `
## IDEAL
Test wrong column count.

## ISC TRACKER

| # | Criterion | Status |
|---|-----------|--------|
| 1 | User authentication endpoint responds with valid JWT token | ✅ |

## ANTI-CRITERIA

| # | Criterion | Status |
|---|-----------|--------|
| 1 | No credentials exposed in git commit history today | 👀 |

## PROGRESS

Missing Evidence column.
`;

  const test5 = validateISCFormat(wrongColumns);
  console.log('Test 5 - Wrong column count:');
  console.log(formatValidationResult(test5));
  
  // Summary
  const allPassed = [test1, test2, test3, test4, test5].every((t, i) => {
    const expected = i === 0; // Only first test should pass
    return t.passed === expected;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(allPassed ? '✅ All self-tests PASSED' : '❌ Some self-tests FAILED');
}
