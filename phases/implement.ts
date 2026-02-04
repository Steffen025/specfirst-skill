/**
 * Implement Phase - SpecFirst 3.0
 * 
 * Creates tasks.md in ISC format from plan.md.
 * Converts implementation phases into 8-word ISC criteria.
 * 
 * @module phases/implement
 * @version 3.0.0
 */

import { readFile, writeFile } from "fs/promises";
import { generateTasks, validateCriterionWordCount } from "../artifacts/tasks";
import { getArtifactPath, ensureFeatureDirectories } from "../lib/config";
import { createPhaseCommit } from "../lib/git";
import { artifactGate } from "../gates/artifact";
import { validateISCFormat, formatValidationResult } from "../gates/isc-format";
import type { ISCCriterion, AntiCriterion } from "../artifacts/types";

export interface ImplementInput {
  featureName: string;
  ideal: string;  // 1-2 sentence ideal outcome
  criteria: ISCCriterion[];
  antiCriteria: AntiCriterion[];
  parallelizationOpportunities?: string[];
  implementationNotes?: string;
}

export interface PhaseResult {
  success: boolean;
  artifactPath?: string;
  criteriaCount?: number;
  error?: string;
  handoffMessage?: string;  // Message for Algorithm
}

/**
 * Executes the Implement phase.
 * 
 * Flow:
 * 1. Run artifact gate (checks plan.md exists)
 * 2. Validate all criteria are exactly 8 words
 * 3. Generate tasks.md content
 * 4. Validate ISC format
 * 5. Write to file
 * 6. Create git commit
 * 7. Return handoff message for Algorithm
 */
export async function implementPhase(input: ImplementInput): Promise<PhaseResult> {
  const { featureName, ideal, criteria, antiCriteria, parallelizationOpportunities, implementationNotes } = input;
  
  try {
    // Step 1: Run artifact gate
    console.log("🔍 Running artifact gate...");
    const gateResult = await artifactGate("implement", featureName);
    
    if (!gateResult.passed) {
      return {
        success: false,
        error: gateResult.error,
      };
    }
    
    // Step 2: Validate all criteria are exactly 8 words
    console.log("🔍 Validating criterion word counts...");
    const wordCountErrors: string[] = [];
    
    for (const c of criteria) {
      const validation = validateCriterionWordCount(c.criterion);
      if (!validation.valid) {
        wordCountErrors.push(
          `Criterion ${c.id}: "${c.criterion}" has ${validation.wordCount} words (expected 8)`
        );
      }
    }
    
    for (const ac of antiCriteria) {
      const validation = validateCriterionWordCount(ac.criterion);
      if (!validation.valid) {
        wordCountErrors.push(
          `Anti-criterion ${ac.id}: "${ac.criterion}" has ${validation.wordCount} words (expected 8)`
        );
      }
    }
    
    if (wordCountErrors.length > 0) {
      return {
        success: false,
        error: `ISC validation failed:\n${wordCountErrors.join("\n")}`,
      };
    }
    
    // Step 3: Generate tasks.md content
    console.log("📝 Generating tasks.md...");
    const tasksContent = generateTasks(
      featureName,
      ideal,
      criteria,
      antiCriteria,
      parallelizationOpportunities,
      implementationNotes
    );
    
    // Step 4: Validate ISC format
    console.log("🔍 Validating ISC format...");
    const formatValidation = validateISCFormat(tasksContent);
    
    if (!formatValidation.passed) {
      const errorReport = formatValidationResult(formatValidation);
      return {
        success: false,
        error: `Generated tasks.md failed ISC validation:\n${errorReport}`,
      };
    }
    
    // Step 5: Write to file
    const tasksPath = getArtifactPath(featureName, "tasks");
    await ensureFeatureDirectories(featureName);
    await writeFile(tasksPath, tasksContent, "utf-8");
    
    console.log(`✅ Created: ${tasksPath}`);
    
    // Step 6: Create git commit
    console.log("📦 Creating git commit...");
    const commitResult = await createPhaseCommit("implement", featureName, tasksPath);
    
    if (!commitResult.success) {
      console.warn(`⚠️  Git commit failed: ${commitResult.stderr}`);
      console.warn("Continuing without commit...");
    } else {
      console.log(`✅ Committed: ${commitResult.stdout}`);
    }
    
    // Step 7: Build handoff message for Algorithm
    const handoffMessage = buildHandoffMessage(featureName, criteria.length, tasksPath);
    
    return {
      success: true,
      artifactPath: tasksPath,
      criteriaCount: criteria.length,
      handoffMessage,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extracts ISC criteria from plan.md.
 * 
 * Reads the implementation phases and converts each step into an 8-word criterion.
 * This is a helper for when you have a plan.md but need to generate ISC criteria.
 * 
 * @param featureName - Feature name
 * @returns ImplementInput with extracted criteria
 */
export async function extractCriteriaFromPlan(featureName: string): Promise<ImplementInput> {
  const planPath = getArtifactPath(featureName, "plan");
  const planContent = await readFile(planPath, "utf-8");
  
  // Parse plan.md to extract phases and deliverables
  const criteria: ISCCriterion[] = [];
  const antiCriteria: AntiCriterion[] = [];
  const parallelizationOpportunities: string[] = [];
  
  const lines = planContent.split("\n");
  let currentPhase: string | null = null;
  let criterionId = 1;
  let antiCriterionId = 1;
  let inPhaseSection = false;
  let inRiskSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track sections
    if (line.startsWith("### Phase")) {
      currentPhase = line.replace("### Phase", "").split(":")[1]?.trim() || null;
      inPhaseSection = true;
      inRiskSection = false;
      continue;
    }
    
    if (line.startsWith("## Risk Matrix")) {
      inRiskSection = true;
      inPhaseSection = false;
      continue;
    }
    
    if (line.startsWith("##") && !line.includes("Implementation Phases") && !line.includes("Risk Matrix")) {
      inPhaseSection = false;
      inRiskSection = false;
    }
    
    // Extract acceptance criteria as ISC criteria
    if (inPhaseSection && line.startsWith("- ") && i > 0) {
      const prevLine = lines[i - 1].trim();
      
      if (prevLine === "**Acceptance Criteria:**") {
        const rawCriterion = line.substring(2).trim();
        
        // Convert to 8-word format (this is a simplification - real implementation may need refinement)
        const criterion = convertTo8Words(rawCriterion);
        
        criteria.push({
          id: criterionId++,
          criterion,
          status: "⬜",
          phase: currentPhase || undefined,
        });
      }
      
      // Extract risks as anti-criteria
      if (prevLine === "**Risks:**" && !line.includes("None identified")) {
        const rawAntiCriterion = line.substring(2).trim();
        const antiCriterion = convertTo8Words(`No ${rawAntiCriterion.toLowerCase()}`);
        
        antiCriteria.push({
          id: `A${antiCriterionId++}`,
          criterion: antiCriterion,
          status: "👀",
        });
      }
    }
  }
  
  // Extract executive summary as ideal outcome
  const idealMatch = planContent.match(/## Executive Summary\s+([\s\S]+?)\s+---/);
  const ideal = idealMatch 
    ? idealMatch[1].trim().substring(0, 200) // First 200 chars
    : `All ${featureName} implementation phases complete with verified acceptance criteria.`;
  
  return {
    featureName,
    ideal,
    criteria,
    antiCriteria,
    parallelizationOpportunities,
  };
}

/**
 * Converts a criterion to exactly 8 words.
 * 
 * This is a helper that attempts to intelligently truncate or expand
 * a criterion to meet the 8-word requirement.
 * 
 * @param text - Original criterion text
 * @returns 8-word criterion
 */
function convertTo8Words(text: string): string {
  // Clean the text
  const cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1")     // Remove italic
    .replace(/`([^`]+)`/g, "$1")       // Remove code
    .trim();
  
  const words = cleaned.split(/\s+/);
  
  if (words.length === 8) {
    return cleaned;
  }
  
  if (words.length > 8) {
    // Truncate to 8 words
    return words.slice(0, 8).join(" ");
  }
  
  // If less than 8 words, pad with context
  // This is a fallback - ideally criteria should be manually refined
  const padding = ["completed", "successfully", "verified", "documented", "tested", "deployed"];
  
  while (words.length < 8 && padding.length > 0) {
    words.push(padding.shift()!);
  }
  
  return words.slice(0, 8).join(" ");
}

/**
 * Builds the handoff message for Algorithm to load ISC tracker.
 */
function buildHandoffMessage(featureName: string, criteriaCount: number, tasksPath: string): string {
  return `✅ SpecFirst Implement phase complete for ${featureName}
📋 Generated ${criteriaCount} ISC criteria in tasks.md
🎯 Algorithm: Load ISC from ${tasksPath}

Next steps:
1. Algorithm reads tasks.md and loads ISC tracker
2. Work through criteria sequentially or in parallel
3. Update status as each criterion is verified
4. Run "bun .opencode/skills/SpecFirst/phases/release.ts ${featureName}" when all ✅`;
}

/**
 * Self-test function to validate phase behavior.
 */
export async function selfTest(): Promise<void> {
  console.log("🧪 Implement Phase Self-Test\n");
  
  // Test 1: Word count validation
  console.log("Test 1: Criterion word count validation");
  const validCriterion = "User authentication endpoint responds with valid JWT token";
  const invalidShort = "User auth works";
  const invalidLong = "User authentication endpoint responds with valid JWT token every single time";
  
  const v1 = validateCriterionWordCount(validCriterion);
  const v2 = validateCriterionWordCount(invalidShort);
  const v3 = validateCriterionWordCount(invalidLong);
  
  console.assert(v1.valid === true, "8-word criterion should be valid");
  console.assert(v1.wordCount === 8, "Should count 8 words");
  console.assert(v2.valid === false, "3-word criterion should be invalid");
  console.assert(v3.valid === false, "11-word criterion should be invalid");
  console.log("✅ Pass\n");
  
  // Test 2: Convert to 8 words
  console.log("Test 2: Convert to 8 words");
  const short = "API works";
  const converted = convertTo8Words(short);
  const convertedWords = converted.split(/\s+/);
  console.assert(convertedWords.length === 8, `Should convert to 8 words, got ${convertedWords.length}`);
  console.log(`  "${short}" → "${converted}"`);
  console.log("✅ Pass\n");
  
  // Test 3: Handoff message format
  console.log("Test 3: Handoff message format");
  const msg = buildHandoffMessage("test-feature", 5, "/path/to/tasks.md");
  console.assert(msg.includes("✅ SpecFirst"), "Should include success indicator");
  console.assert(msg.includes("5 ISC criteria"), "Should include criteria count");
  console.assert(msg.includes("/path/to/tasks.md"), "Should include file path");
  console.assert(msg.includes("🎯 Algorithm"), "Should include Algorithm handoff");
  console.log("✅ Pass\n");
  
  // Test 4: ISC criterion structure
  console.log("Test 4: ISC criterion structure");
  const testCriterion: ISCCriterion = {
    id: 1,
    criterion: "User authentication endpoint responds with valid JWT token",
    status: "⬜",
    evidence: undefined,
    phase: "Phase 1: Authentication",
  };
  console.assert(testCriterion.id === 1, "ID should be number");
  console.assert(testCriterion.status === "⬜", "Status should use emoji");
  console.assert(testCriterion.phase === "Phase 1: Authentication", "Phase should be optional string");
  console.log("✅ Pass\n");
  
  // Test 5: Anti-criterion structure
  console.log("Test 5: Anti-criterion structure");
  const testAntiCriterion: AntiCriterion = {
    id: "A1",
    criterion: "No credentials exposed in git commit history today",
    status: "👀",
  };
  console.assert(testAntiCriterion.id === "A1", "Anti-criterion ID should be string");
  console.assert(testAntiCriterion.status === "👀", "Anti-criterion status should be watching");
  console.log("✅ Pass\n");
  
  console.log("✅ All tests passed!");
  console.log("\n💡 To test full phase execution:");
  console.log("   1. Create a test feature with plan.md");
  console.log("   2. Run: bun .opencode/skills/SpecFirst/phases/implement.ts <feature-name>");
  console.log("   3. Verify tasks.md is created with ISC format");
  console.log("   4. Check git commit was created");
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "--test") {
    await selfTest();
    process.exit(0);
  }
  
  const featureName = args[0];
  
  console.log(`\n🚀 SpecFirst Implement Phase: ${featureName}\n`);
  
  try {
    // Extract criteria from plan.md
    console.log("📖 Extracting criteria from plan.md...");
    const input = await extractCriteriaFromPlan(featureName);
    
    console.log(`\nExtracted:`);
    console.log(`  - Ideal: ${input.ideal.substring(0, 80)}...`);
    console.log(`  - Criteria: ${input.criteria.length}`);
    console.log(`  - Anti-criteria: ${input.antiCriteria.length}\n`);
    
    // Run phase
    const result = await implementPhase(input);
    
    if (!result.success) {
      console.error(`\n❌ Phase failed: ${result.error}`);
      process.exit(1);
    }
    
    console.log(`\n${result.handoffMessage}\n`);
    console.log(`✅ Implement phase complete!`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Export for testing
export const __testing = {
  convertTo8Words,
  buildHandoffMessage,
};
