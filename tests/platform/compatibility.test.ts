/**
 * Platform Compatibility Tests - SpecFirst 3.0
 * 
 * ISC #56: Platform compatibility tests pass on both platforms
 * 
 * Tests that SpecFirst works correctly on both OpenCode and Claude Code platforms
 * with proper path resolution and environment handling.
 * 
 * @module tests/platform/compatibility
 * @version 3.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  detectPlatform,
  getRootDir,
  getPlatformInfo,
  resolvePath,
  getFeatureDir,
  getProjectDir,
  type Platform,
} from "../../lib/platform";
import { getConfig, getArtifactPath } from "../../lib/config";

describe("Platform Compatibility", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("OpenCode Platform", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      delete process.env.PAI_DIR;
    });

    it("should detect opencode platform correctly", () => {
      const platform = detectPlatform();
      expect(platform).toBe("opencode");
    });

    it("should resolve opencode root directory", () => {
      const rootDir = getRootDir();
      expect(rootDir).toBe("/test/.opencode");
    });

    it("should generate correct opencode paths", () => {
      const info = getPlatformInfo();
      
      expect(info.platform).toBe("opencode");
      expect(info.rootDir).toBe("/test/.opencode");
      expect(info.skillsDir).toBe("/test/.opencode/skills");
      expect(info.memoryDir).toBe("/test/.opencode/MEMORY");
      expect(info.executionDir).toBe("/test/.opencode/MEMORY/execution");
      expect(info.projectsDir).toBe("/test/.opencode/MEMORY/projects");
    });

    it("should resolve feature paths for opencode", () => {
      const featureDir = getFeatureDir("test-feature");
      expect(featureDir).toBe("/test/.opencode/MEMORY/execution/Features/test-feature");
    });

    it("should resolve project paths for opencode", () => {
      const projectDir = getProjectDir("test-project");
      expect(projectDir).toBe("/test/.opencode/MEMORY/projects/test-project");
    });

    it("should generate correct artifact paths for opencode", () => {
      const proposalPath = getArtifactPath("test-feature", "proposal");
      expect(proposalPath).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs/proposal.md");
      
      const constitutionPath = getArtifactPath("test-feature", "constitution");
      expect(constitutionPath).toBe("/test/.opencode/MEMORY/projects/test-feature/CONSTITUTION.md");
    });

    it("should configure skill directories for opencode", () => {
      const config = getConfig();
      
      expect(config.skillDir).toBe("/test/.opencode/skills/SpecFirst");
      expect(config.templatesDir).toBe("/test/.opencode/skills/SpecFirst/templates");
      expect(config.workflowsDir).toBe("/test/.opencode/skills/SpecFirst/Workflows");
    });
  });

  describe("Claude Code Platform", () => {
    beforeEach(() => {
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
    });

    it("should detect claudecode platform correctly", () => {
      const platform = detectPlatform();
      expect(platform).toBe("claudecode");
    });

    it("should resolve claudecode root directory", () => {
      const rootDir = getRootDir();
      expect(rootDir).toBe("/test/.claude");
    });

    it("should generate correct claudecode paths", () => {
      const info = getPlatformInfo();
      
      expect(info.platform).toBe("claudecode");
      expect(info.rootDir).toBe("/test/.claude");
      expect(info.skillsDir).toBe("/test/.claude/skills");
      expect(info.memoryDir).toBe("/test/.claude/MEMORY");
      expect(info.executionDir).toBe("/test/.claude/MEMORY/execution");
      expect(info.projectsDir).toBe("/test/.claude/MEMORY/projects");
    });

    it("should resolve feature paths for claudecode", () => {
      const featureDir = getFeatureDir("test-feature");
      expect(featureDir).toBe("/test/.claude/MEMORY/execution/Features/test-feature");
    });

    it("should resolve project paths for claudecode", () => {
      const projectDir = getProjectDir("test-project");
      expect(projectDir).toBe("/test/.claude/MEMORY/projects/test-project");
    });

    it("should generate correct artifact paths for claudecode", () => {
      const proposalPath = getArtifactPath("test-feature", "proposal");
      expect(proposalPath).toBe("/test/.claude/MEMORY/execution/Features/test-feature/specs/proposal.md");
      
      const constitutionPath = getArtifactPath("test-feature", "constitution");
      expect(constitutionPath).toBe("/test/.claude/MEMORY/projects/test-feature/CONSTITUTION.md");
    });

    it("should configure skill directories for claudecode", () => {
      const config = getConfig();
      
      expect(config.skillDir).toBe("/test/.claude/skills/SpecFirst");
      expect(config.templatesDir).toBe("/test/.claude/skills/SpecFirst/templates");
      expect(config.workflowsDir).toBe("/test/.claude/skills/SpecFirst/Workflows");
    });
  });

  describe("Cross-Platform Consistency", () => {
    it("should maintain consistent structure across platforms", () => {
      // OpenCode
      process.env.OPENCODE_DIR = "/test/.opencode";
      delete process.env.PAI_DIR;
      
      const opencodeInfo = getPlatformInfo();
      const opencodeFeature = getFeatureDir("test");
      
      // Claude Code
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
      
      const claudeInfo = getPlatformInfo();
      const claudeFeature = getFeatureDir("test");
      
      // Both should have same structure, different roots
      expect(opencodeFeature.replace(opencodeInfo.rootDir, "")).toBe(
        claudeFeature.replace(claudeInfo.rootDir, "")
      );
    });

    it("should use same relative paths on both platforms", () => {
      // OpenCode
      process.env.OPENCODE_DIR = "/test/.opencode";
      delete process.env.PAI_DIR;
      
      const opencodeProposal = getArtifactPath("test", "proposal");
      const opencodeRoot = getRootDir();
      const opencodeRelative = opencodeProposal.replace(opencodeRoot, "");
      
      // Claude Code
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
      
      const claudeProposal = getArtifactPath("test", "proposal");
      const claudeRoot = getRootDir();
      const claudeRelative = claudeProposal.replace(claudeRoot, "");
      
      // Relative paths should be identical
      expect(opencodeRelative).toBe(claudeRelative);
    });
  });

  describe("Environment Variable Handling", () => {
    it("should prioritize OPENCODE_DIR over PAI_DIR", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      process.env.PAI_DIR = "/test/.claude";
      
      const platform = detectPlatform();
      const rootDir = getRootDir();
      
      expect(platform).toBe("opencode");
      expect(rootDir).toBe("/test/.opencode");
    });

    it("should handle custom paths via environment variables", () => {
      process.env.OPENCODE_DIR = "/custom/path/to/opencode";
      
      const rootDir = getRootDir();
      const info = getPlatformInfo();
      
      expect(rootDir).toBe("/custom/path/to/opencode");
      expect(info.skillsDir).toBe("/custom/path/to/opencode/skills");
    });

    it("should fall back to directory detection when env vars missing", () => {
      delete process.env.OPENCODE_DIR;
      delete process.env.PAI_DIR;
      
      // This will check filesystem, result depends on actual setup
      const platform = detectPlatform();
      expect(["opencode", "claudecode", "unknown"]).toContain(platform);
    });
  });

  describe("Path Resolution Edge Cases", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should handle absolute paths correctly", () => {
      const resolved = resolvePath("/absolute/path");
      expect(resolved).toBe("/absolute/path");
    });

    it("should handle home directory paths", () => {
      process.env.HOME = "/home/testuser";
      
      const resolved = resolvePath("~/documents");
      expect(resolved).toBe("/home/testuser/documents");
    });

    it("should handle relative paths from root", () => {
      const resolved = resolvePath("skills/SpecFirst");
      expect(resolved).toBe("/test/.opencode/skills/SpecFirst");
    });

    it("should handle empty path gracefully", () => {
      const resolved = resolvePath("");
      expect(resolved).toBe("/test/.opencode/");
    });
  });
});
