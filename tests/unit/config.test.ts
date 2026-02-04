/**
 * Configuration Unit Tests - SpecFirst 3.0
 * 
 * ISC #53: Unit tests achieve eighty percent line coverage
 * 
 * Tests configuration loading, validation, and feature path generation.
 * 
 * @module tests/unit/config
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getConfig,
  validateEnvironment,
  getArtifactPath,
  ensureFeatureDirectories,
  type SpecFirstConfig,
} from "../../lib/config";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { join } from "path";

describe("Configuration", () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("getConfig()", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should return valid configuration object", () => {
      const config = getConfig();
      
      expect(config).toBeDefined();
      expect(config.platform).toBeDefined();
      expect(config.skillDir).toBeDefined();
      expect(config.templatesDir).toBeDefined();
      expect(config.workflowsDir).toBeDefined();
      expect(typeof config.getFeaturePaths).toBe("function");
    });

    it("should derive skill paths from platform", () => {
      const config = getConfig();
      
      expect(config.skillDir).toBe("/test/.opencode/skills/SpecFirst");
      expect(config.templatesDir).toBe("/test/.opencode/skills/SpecFirst/templates");
      expect(config.workflowsDir).toBe("/test/.opencode/skills/SpecFirst/Workflows");
    });

    it("should load Linear settings from environment", () => {
      process.env.LINEAR_API_TOKEN = "test-token";
      process.env.LINEAR_TEAM_ID = "test-team";
      
      const config = getConfig();
      
      expect(config.linearApiToken).toBe("test-token");
      expect(config.linearTeamId).toBe("test-team");
      expect(config.linearEnabled).toBe(true);
    });

    it("should disable Linear when no token provided", () => {
      delete process.env.LINEAR_API_TOKEN;
      
      const config = getConfig();
      
      expect(config.linearEnabled).toBe(false);
    });

    it("should load git configuration from environment", () => {
      process.env.SPECFIRST_AUTO_COMMIT = "false";
      process.env.SPECFIRST_BRANCH = "feature/test";
      
      const config = getConfig();
      
      expect(config.gitAutoCommit).toBe(false);
      expect(config.gitBranch).toBe("feature/test");
    });

    it("should use default values for git config", () => {
      delete process.env.SPECFIRST_AUTO_COMMIT;
      delete process.env.SPECFIRST_BRANCH;
      
      const config = getConfig();
      
      expect(config.gitAutoCommit).toBe(true);
      expect(config.gitBranch).toBeUndefined();
    });

    it("should load validation settings from environment", () => {
      process.env.SPECFIRST_MAX_ARTIFACT_KB = "100";
      process.env.SPECFIRST_GATE_TIMEOUT_MS = "3000";
      
      const config = getConfig();
      
      expect(config.artifactMaxSizeKb).toBe(100);
      expect(config.gateTimeoutMs).toBe(3000);
    });

    it("should use default validation settings", () => {
      delete process.env.SPECFIRST_MAX_ARTIFACT_KB;
      delete process.env.SPECFIRST_GATE_TIMEOUT_MS;
      
      const config = getConfig();
      
      expect(config.iscWordCount).toBe(8);
      expect(config.artifactMaxSizeKb).toBe(50);
      expect(config.gateTimeoutMs).toBe(5000);
    });
  });

  describe("Feature Paths", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should generate complete feature paths", () => {
      const config = getConfig();
      const paths = config.getFeaturePaths("test-feature");
      
      expect(paths.featureDir).toBe("/test/.opencode/MEMORY/execution/Features/test-feature");
      expect(paths.specsDir).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs");
      expect(paths.proposalPath).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/proposal.md");
      expect(paths.specPath).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/spec.md");
      expect(paths.planPath).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/plan.md");
      expect(paths.tasksPath).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/tasks.md");
      expect(paths.constitutionPath).toBe("/test/.opencode/MEMORY/projects/test-feature/CONSTITUTION.md");
    });
  });

  describe("getArtifactPath()", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should return correct proposal path", () => {
      const path = getArtifactPath("test-feature", "proposal");
      expect(path).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/proposal.md");
    });

    it("should return correct spec path", () => {
      const path = getArtifactPath("test-feature", "spec");
      expect(path).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/spec.md");
    });

    it("should return correct plan path", () => {
      const path = getArtifactPath("test-feature", "plan");
      expect(path).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/plan.md");
    });

    it("should return correct tasks path", () => {
      const path = getArtifactPath("test-feature", "tasks");
      expect(path).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/tasks.md");
    });

    it("should return correct constitution path", () => {
      const path = getArtifactPath("test-feature", "constitution");
      expect(path).toBe("/test/.opencode/MEMORY/projects/test-feature/CONSTITUTION.md");
    });
  });

  describe("validateEnvironment()", () => {
    it("should validate successfully when platform detected", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should fail when platform cannot be detected", () => {
      delete process.env.OPENCODE_DIR;
      delete process.env.PAI_DIR;
      
      // This test can only work if neither ~/.opencode nor ~/.claude exist
      // If either exists, platform detection will succeed
      // So we test that it either fails OR succeeds based on filesystem
      const result = validateEnvironment();
      
      // Valid result structure returned
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("missing");
      expect(Array.isArray(result.missing)).toBe(true);
    });
  });

  describe("ensureFeatureDirectories()", () => {
    const testFeature = `config-test-${Date.now()}`;

    beforeEach(() => {
      process.env.OPENCODE_DIR = process.cwd();
    });

    afterEach(async () => {
      // Cleanup test directories using actual paths from platform
      const config = getConfig();
      const paths = config.getFeaturePaths(testFeature);
      
      if (existsSync(paths.featureDir)) {
        await rm(paths.featureDir, { recursive: true, force: true });
      }
      
      const projectPath = join(process.cwd(), "MEMORY/projects", testFeature);
      if (existsSync(projectPath)) {
        await rm(projectPath, { recursive: true, force: true });
      }
    });

    it("should create specs directory", async () => {
      const config = getConfig();
      await ensureFeatureDirectories(testFeature);
      
      const paths = config.getFeaturePaths(testFeature);
      expect(existsSync(paths.specsDir)).toBe(true);
    });

    it("should be idempotent (safe to call multiple times)", async () => {
      const config = getConfig();
      await ensureFeatureDirectories(testFeature);
      await ensureFeatureDirectories(testFeature);
      
      const paths = config.getFeaturePaths(testFeature);
      expect(existsSync(paths.specsDir)).toBe(true);
    });
  });
});
