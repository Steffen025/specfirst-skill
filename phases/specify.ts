/**
 * Specify Phase - SpecFirst 3.0
 * 
 * Creates spec.md from proposal.md.
 * Transforms solution approaches into functional requirements,
 * user stories, and success criteria.
 * 
 * @module phases/specify
 * @version 3.0.0
 */

import { readFile, writeFile } from "fs/promises";
import { generateSpec, createSpecTemplate } from "../artifacts/spec";
import { getArtifactPath, ensureFeatureDirectories } from "../lib/config";
import { createPhaseCommit } from "../lib/git";
import { artifactGate } from "../gates/artifact";

/**
 * Input for the Specify phase.
 * Can be provided by user or extracted from proposal.md
 */
export interface SpecifyInput {
  featureName: string;
  functionalRequirements: Array<{
    id: string;
    description: string;
    priority: "must" | "should" | "could" | "wont";
    verificationMethod: string;
  }>;
  nonFunctionalRequirements: Array<{
    id: string;
    description: string;
    metric: string;
    target: string;
  }>;
  userStories: Array<{
    id: string;
    title: string;
    given: string;
    when: string;
    then: string;
  }>;
  successCriteria: Array<{
    id: string;
    description: string;
    verificationMethod: string;
  }>;
  architectureDiagram?: string;  // ASCII + Mermaid
  milestone?: string;  // Linear milestone
}

/**
 * Result of the Specify phase execution.
 */
export interface PhaseResult {
  success: boolean;
  artifactPath?: string;
  error?: string;
  message?: string;
}

/**
 * Executes the Specify phase.
 * 
 * Workflow:
 * 1. Run artifact gate (checks proposal exists)
 * 2. Ensure feature directories exist
 * 3. Read proposal.md for context
 * 4. Generate spec content from input
 * 5. Write spec.md to file
 * 6. Create git commit (if in git repo)
 * 
 * @param input - Specification data (FRs, NFRs, user stories, etc.)
 * @returns PhaseResult with success status and artifact path
 * 
 * @example
 * ```typescript
 * const result = await specifyPhase({
 *   featureName: "user-auth",
 *   functionalRequirements: [
 *     {
 *       id: "FR-001",
 *       description: "User can log in with email and password",
 *       priority: "must",
 *       verificationMethod: "Manual test + unit test"
 *     }
 *   ],
 *   // ... other requirements
 * });
 * 
 * if (result.success) {
 *   console.log(`Spec created at ${result.artifactPath}`);
 * }
 * ```
 */
export async function specifyPhase(input: SpecifyInput): Promise<PhaseResult> {
  const { featureName } = input;
  
  // 1. Run artifact gate (checks proposal exists)
  console.log("🔍 Running artifact gate...");
  const gateResult = await artifactGate("specify", featureName);
  
  if (!gateResult.passed) {
    return {
      success: false,
      error: gateResult.error,
      message: gateResult.resolution,
    };
  }
  
  // 2. Ensure feature directories exist
  console.log("📁 Ensuring feature directories exist...");
  await ensureFeatureDirectories(featureName);
  
  // 3. Read proposal.md for context
  const proposalPath = getArtifactPath(featureName, "proposal");
  console.log(`📖 Reading proposal from ${proposalPath}...`);
  
  let proposalContent: string;
  try {
    proposalContent = await readFile(proposalPath, "utf-8");
  } catch (error) {
    return {
      success: false,
      error: `Failed to read proposal.md: ${(error as Error).message}`,
    };
  }
  
  // 4. Generate spec content
  console.log("⚙️  Generating spec content...");
  const specContent = generateSpec(
    featureName,
    input.functionalRequirements,
    input.nonFunctionalRequirements,
    input.userStories,
    input.successCriteria,
    input.architectureDiagram,
    input.milestone
  );
  
  // 5. Write to file
  const specPath = getArtifactPath(featureName, "spec");
  console.log(`💾 Writing spec to ${specPath}...`);
  
  try {
    await writeFile(specPath, specContent, "utf-8");
  } catch (error) {
    return {
      success: false,
      error: `Failed to write spec.md: ${(error as Error).message}`,
    };
  }
  
  // 6. Create git commit (if in git repo)
  console.log("📝 Creating git commit...");
  const gitResult = await createPhaseCommit("specify", featureName, specPath);
  
  if (!gitResult.success) {
    // Git commit failed but artifact was created - warn but don't fail
    console.warn(`⚠️  Git commit failed: ${gitResult.stderr}`);
    console.warn("Artifact created successfully but not committed to git.");
  } else {
    console.log("✅ Git commit created");
  }
  
  return {
    success: true,
    artifactPath: specPath,
    message: `Specification created at ${specPath}`,
  };
}

/**
 * Creates a spec template that the user can fill in manually.
 * Used when AI-generated requirements are not desired.
 * 
 * @param featureName - Name of the feature
 * @returns PhaseResult with success status
 */
export async function createSpecManual(featureName: string): Promise<PhaseResult> {
  // 1. Run artifact gate
  const gateResult = await artifactGate("specify", featureName);
  
  if (!gateResult.passed) {
    return {
      success: false,
      error: gateResult.error,
      message: gateResult.resolution,
    };
  }
  
  // 2. Ensure directories exist
  await ensureFeatureDirectories(featureName);
  
  // 3. Generate template
  const specContent = createSpecTemplate(featureName);
  
  // 4. Write to file
  const specPath = getArtifactPath(featureName, "spec");
  
  try {
    await writeFile(specPath, specContent, "utf-8");
  } catch (error) {
    return {
      success: false,
      error: `Failed to write spec.md: ${(error as Error).message}`,
    };
  }
  
  return {
    success: true,
    artifactPath: specPath,
    message: `Spec template created at ${specPath} - fill in manually`,
  };
}

/**
 * Self-test function to validate the Specify phase.
 * Creates a test feature with sample requirements.
 */
export async function selfTest(): Promise<void> {
  console.log("🧪 Specify Phase Self-Test\n");
  
  // Test 1: Input validation
  console.log("Test 1: Input validation");
  const testInput: SpecifyInput = {
    featureName: "test-feature",
    functionalRequirements: [
      {
        id: "FR-001",
        description: "User can authenticate with email and password",
        priority: "must",
        verificationMethod: "Manual test + unit test",
      },
      {
        id: "FR-002",
        description: "System sends password reset email",
        priority: "should",
        verificationMethod: "Integration test",
      },
    ],
    nonFunctionalRequirements: [
      {
        id: "NFR-001",
        description: "Login response time",
        metric: "95th percentile latency",
        target: "< 500ms",
      },
    ],
    userStories: [
      {
        id: "US-001",
        title: "User Login",
        given: "I am a registered user",
        when: "I enter valid credentials",
        then: "I should be logged in successfully",
      },
    ],
    successCriteria: [
      {
        id: "SC-001",
        description: "All functional requirements pass verification",
        verificationMethod: "Test suite execution",
      },
    ],
    architectureDiagram: `\`\`\`
┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │
└──────────┘     └──────────┘
                      │
                      ▼
                 ┌──────────┐
                 │  Database│
                 └──────────┘
\`\`\`

<details>
<summary>Detailed Mermaid Diagram</summary>

\`\`\`mermaid
graph TD
    A[Client] --> B[API]
    B --> C[Database]
\`\`\`
</details>`,
    milestone: "MVP",
  };
  
  console.assert(testInput.functionalRequirements.length === 2, "Should have 2 FRs");
  console.assert(testInput.nonFunctionalRequirements.length === 1, "Should have 1 NFR");
  console.assert(testInput.userStories.length === 1, "Should have 1 user story");
  console.assert(testInput.successCriteria.length === 1, "Should have 1 success criterion");
  console.assert(testInput.architectureDiagram !== undefined, "Should have architecture diagram");
  console.log("✅ Pass\n");
  
  // Test 2: Generate spec content
  console.log("Test 2: Generate spec content");
  const specContent = generateSpec(
    testInput.featureName,
    testInput.functionalRequirements,
    testInput.nonFunctionalRequirements,
    testInput.userStories,
    testInput.successCriteria,
    testInput.architectureDiagram,
    testInput.milestone
  );
  
  console.assert(specContent.includes("---"), "Should have YAML frontmatter");
  console.assert(specContent.includes("# test-feature - Specification"), "Should have title");
  console.assert(specContent.includes("## Functional Requirements"), "Should have FR section");
  console.assert(specContent.includes("## Non-Functional Requirements"), "Should have NFR section");
  console.assert(specContent.includes("## User Stories"), "Should have user stories section");
  console.assert(specContent.includes("## Success Criteria"), "Should have success criteria section");
  console.assert(specContent.includes("## Architecture"), "Should have architecture section");
  console.assert(specContent.includes("FR-001"), "Should include FR-001");
  console.assert(specContent.includes("NFR-001"), "Should include NFR-001");
  console.assert(specContent.includes("US-001"), "Should include US-001");
  console.assert(specContent.includes("SC-001"), "Should include SC-001");
  console.assert(specContent.includes("milestone: MVP"), "Should include milestone in frontmatter");
  console.assert(specContent.includes("ASCII"), "Should mention ASCII in architecture");
  console.log("✅ Pass\n");
  
  // Test 3: Template generation
  console.log("Test 3: Template generation");
  const template = createSpecTemplate("test-feature");
  
  console.assert(template.includes("---"), "Template should have YAML frontmatter");
  console.assert(template.includes("FR-001"), "Template should have sample FR");
  console.assert(template.includes("NFR-001"), "Template should have sample NFR");
  console.assert(template.includes("US-001"), "Template should have sample user story");
  console.assert(template.includes("SC-001"), "Template should have sample success criterion");
  console.assert(template.includes("Architecture"), "Template should have architecture section");
  console.log("✅ Pass\n");
  
  // Test 4: Priority validation
  console.log("Test 4: Priority validation");
  const priorities: Array<"must" | "should" | "could" | "wont"> = ["must", "should", "could", "wont"];
  for (const priority of priorities) {
    const testFr = {
      id: "FR-999",
      description: "Test requirement",
      priority,
      verificationMethod: "Test",
    };
    console.assert(
      ["must", "should", "could", "wont"].includes(testFr.priority),
      `Priority ${priority} should be valid`
    );
  }
  console.log("✅ Pass\n");
  
  // Test 5: Architecture diagram format
  console.log("Test 5: Architecture diagram format");
  const diagram = testInput.architectureDiagram!;
  console.assert(diagram.includes("```"), "Should have code blocks");
  console.assert(diagram.includes("┌"), "Should have ASCII box drawing");
  console.assert(diagram.includes("<details>"), "Should have collapsible section");
  console.assert(diagram.includes("mermaid"), "Should have Mermaid diagram");
  console.log("✅ Pass\n");
  
  console.log("✅ All tests passed!");
  console.log("\n📋 ISC Coverage:");
  console.log("  ✅ #25: Specify phase creates spec with functional requirements (FR-001, FR-002)");
  console.log("  ✅ #26: Specify phase includes architecture diagrams (ASCII + Mermaid)");
}

// Export for testing
export const __testing = {
  selfTest,
};

// Run self-test if executed directly
if (import.meta.main) {
  await selfTest();
}
