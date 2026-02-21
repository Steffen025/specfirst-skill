/**
 * Tasks Artifact Generator - SpecFirst 4.0
 * 
 * Generates tasks.md artifacts in ISC (Ideal State Criteria) format.
 * Native ISC generation - no conversion layer (ADR-005).
 * Updated for Algorithm v1.8.0: 8-12 word criteria, inline verification,
 * ISC-C/ISC-A naming, confidence tags, priority classification.
 * 
 * @module artifacts/tasks
 * @version 4.0.0
 */

import type { TasksArtifact, ISCCriterion, AntiCriterion } from "./types";

/**
 * Generates YAML frontmatter for tasks artifact.
 */
function generateFrontmatter(featureName: string): string {
  const now = new Date().toISOString().split("T")[0];
  
  return `---
feature: ${featureName}
phase: implement
status: pending
created: ${now}
based_on: plan.md
---`;
}

/**
 * Validates that a criterion is 8-12 words (Algorithm v1.8.0).
 * 
 * @param criterion - The criterion text (may include `| Verify:` suffix which is excluded)
 * @returns Object with valid flag and word count
 */
export function validateCriterionWordCount(criterion: string): { valid: boolean; wordCount: number } {
  // Strip inline verification suffix before counting words
  const textOnly = criterion.split("|")[0].trim();
  const words = textOnly.split(/\s+/).filter(w => w.length > 0);
  return {
    valid: words.length >= 8 && words.length <= 12,
    wordCount: words.length,
  };
}

/**
 * Generates the ISC criteria table.
 */
function generateCriteriaTable(criteria: ISCCriterion[], phaseGrouped: boolean = true): string {
  if (criteria.length === 0) {
    return "| ID | Criterion (8-12 words) | Status | Evidence | Verify |\n|----|------------------------|--------|----------|--------|\n| - | No criteria defined | - | - | - |";
  }
  
  // Format a single criterion row with ISC-C naming and verify method
  const formatRow = (c: ISCCriterion) => {
    const id = typeof c.id === "number" ? `ISC-C${c.id}` : c.id;
    const verify = c.verifyMethod || "-";
    const conf = c.confidence ? ` [${c.confidence}]` : "";
    const prio = c.priority ? ` [${c.priority}]` : "";
    return `| ${id} | ${c.criterion}${conf}${prio} | ${c.status} | ${c.evidence || "-"} | ${verify} |`;
  };
  
  // Group by phase if phase information is available
  if (phaseGrouped && criteria.some(c => c.phase)) {
    const phases = [...new Set(criteria.map(c => c.phase).filter(Boolean))];
    
    return phases.map(phase => {
      const phaseCriteria = criteria.filter(c => c.phase === phase);
      const header = `### ${phase}\n\n| ID | Criterion (8-12 words) | Status | Evidence | Verify |\n|----|------------------------|--------|----------|--------|`;
      const rows = phaseCriteria.map(formatRow).join("\n");
      return `${header}\n${rows}`;
    }).join("\n\n");
  }
  
  // Flat table
  const header = "| ID | Criterion (8-12 words) | Status | Evidence | Verify |\n|----|------------------------|--------|----------|--------|";
  const rows = criteria.map(formatRow).join("\n");
  
  return `${header}\n${rows}`;
}

/**
 * Generates the anti-criteria table.
 */
function generateAntiCriteriaTable(antiCriteria: AntiCriterion[]): string {
  if (antiCriteria.length === 0) {
    return "| ID | Anti-Criterion (8-12 words) | Status | Verify |\n|----|----------------------------|--------|--------|\n| - | No anti-criteria defined | - | - |";
  }
  
  const header = "| ID | Anti-Criterion (8-12 words) | Status | Verify |\n|----|----------------------------|--------|--------|";
  const rows = antiCriteria
    .map(c => {
      const id = c.id.startsWith("ISC-A") ? c.id : `ISC-A${c.id.replace(/^A/, "")}`;
      const verify = c.verifyMethod || "-";
      return `| ${id} | ${c.criterion} | ${c.status} | ${verify} |`;
    })
    .join("\n");
  
  return `${header}\n${rows}`;
}

/**
 * Generates the progress section.
 */
function generateProgress(criteria: ISCCriterion[]): string {
  const completed = criteria.filter(c => c.status === "✅").length;
  const total = criteria.length;
  
  let status = "PENDING";
  if (completed === total && total > 0) {
    status = "COMPLETE";
  } else if (completed > 0) {
    status = "IN_PROGRESS";
  }
  
  return `**Completed:** ${completed}/${total} verified
**Status:** ${status}`;
}

/**
 * Generates a complete tasks.md artifact in ISC format.
 */
export function generateTasks(
  featureName: string,
  ideal: string,
  criteria: ISCCriterion[],
  antiCriteria: AntiCriterion[],
  parallelizationOpportunities?: string[],
  implementationNotes?: string
): string {
  const frontmatter = generateFrontmatter(featureName);
  const criteriaTable = generateCriteriaTable(criteria);
  const antiTable = generateAntiCriteriaTable(antiCriteria);
  const progress = generateProgress(criteria);
  
  let parallelSection = "";
  if (parallelizationOpportunities && parallelizationOpportunities.length > 0) {
    const items = parallelizationOpportunities.map(p => `- [P] ${p}`).join("\n");
    parallelSection = `\n\n## Parallelization Opportunities\n\n${items}`;
  }
  
  let notesSection = "";
  if (implementationNotes) {
    notesSection = `\n\n## Implementation Notes\n\n${implementationNotes}`;
  }
  
  return `${frontmatter}

# ${featureName} - Implementation Tasks

## IDEAL

${ideal}

---

## ISC TRACKER

${criteriaTable}

---

## ANTI-CRITERIA

${antiTable}

---

## PROGRESS

${progress}${parallelSection}${notesSection}

---

*Generated by SpecFirst 4.0*
`;
}

/**
 * Validates a tasks artifact structure and ISC format.
 */
export function validateTasks(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for frontmatter
  if (!content.startsWith("---")) {
    errors.push("Missing YAML frontmatter");
  }
  
  // Check for required sections
  const requiredSections = [
    "IDEAL",
    "ISC TRACKER",
    "ANTI-CRITERIA",
    "PROGRESS",
  ];
  
  for (const section of requiredSections) {
    if (!content.includes(`## ${section}`)) {
      errors.push(`Missing required section: ${section}`);
    }
  }
  
  // Validate ISC criteria format (8-12 words, Algorithm v1.8.0)
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check table rows (lines starting with | followed by number or ISC-C/ISC-A)
    if (line.match(/^\|\s*(\d+|ISC-[CA]\d+)\s*\|/)) {
      // Extract criterion text (second column)
      const columns = line.split("|").filter(c => c.trim());
      if (columns.length >= 2) {
        const criterion = columns[1].trim();
        
        // Skip header rows
        if (criterion.includes("Criterion") || criterion === "-") {
          continue;
        }
        
        const validation = validateCriterionWordCount(criterion);
        if (!validation.valid) {
          errors.push(`Line ${i + 1}: Criterion has ${validation.wordCount} words (expected 8-12): "${criterion}"`);
        }
      }
    }
  }
  
  // Check for valid status symbols
  const validSymbols = ["⬜", "🔄", "✅", "❌", "👀"];
  const symbolPattern = /\|\s*([⬜🔄✅❌👀])\s*\|/g;
  let match;
  while ((match = symbolPattern.exec(content)) !== null) {
    if (!validSymbols.includes(match[1])) {
      errors.push(`Invalid status symbol found: "${match[1]}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parses a tasks.md file into structured ISCCriterion objects.
 */
export function parseTasksFile(content: string): { criteria: ISCCriterion[]; antiCriteria: AntiCriterion[] } {
  const criteria: ISCCriterion[] = [];
  const antiCriteria: AntiCriterion[] = [];
  
  const lines = content.split("\n");
  let inISCSection = false;
  let inAntiSection = false;
  
  for (const line of lines) {
    if (line.includes("## ISC TRACKER")) {
      inISCSection = true;
      inAntiSection = false;
      continue;
    }
    
    if (line.includes("## ANTI-CRITERIA")) {
      inISCSection = false;
      inAntiSection = true;
      continue;
    }
    
    if (line.includes("## PROGRESS") || line.includes("## Parallelization")) {
      inISCSection = false;
      inAntiSection = false;
      continue;
    }
    
    // Parse ISC criteria rows (supports both numeric and ISC-C{N} format)
    if (inISCSection && line.match(/^\|\s*(\d+|ISC-C\d+)\s*\|/)) {
      const columns = line.split("|").filter(c => c.trim());
      if (columns.length >= 3) {
        const rawId = columns[0].trim();
        const id = rawId.startsWith("ISC-C") ? parseInt(rawId.replace("ISC-C", ""), 10) : parseInt(rawId, 10);
        const criterion = columns[1].trim();
        const status = columns[2].trim() as ISCCriterion["status"];
        const evidence = columns[3]?.trim() || undefined;
        const verifyMethod = columns[4]?.trim() || undefined;
        
        criteria.push({ id, criterion, status, evidence, verifyMethod });
      }
    }
    
    // Parse anti-criteria rows (supports both A{N} and ISC-A{N} format)
    if (inAntiSection && line.match(/^\|\s*(A\d+|ISC-A\d+)\s*\|/)) {
      const columns = line.split("|").filter(c => c.trim());
      if (columns.length >= 2) {
        const rawId = columns[0].trim();
        const id = rawId.startsWith("ISC-A") ? rawId : `ISC-A${rawId.replace(/^A/, "")}`;
        const criterion = columns[1].trim();
        const status = columns[2]?.trim() as AntiCriterion["status"] || "👀";
        const verifyMethod = columns[3]?.trim() || undefined;
        
        antiCriteria.push({ id, criterion, status, verifyMethod });
      }
    }
  }
  
  return { criteria, antiCriteria };
}

// Export for testing
export const __testing = {
  generateFrontmatter,
  generateCriteriaTable,
  generateAntiCriteriaTable,
  generateProgress,
  validateCriterionWordCount,
};
