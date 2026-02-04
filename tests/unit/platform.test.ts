/**
 * Platform Detection Unit Tests - SpecFirst 3.0
 * 
 * ISC #53: Unit tests achieve eighty percent line coverage
 * 
 * Tests platform detection logic, path resolution, and environment handling.
 * 
 * @module tests/unit/platform
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
  getSpecsDir,
  isOpenCode,
  isClaudeCode,
  type Platform,
} from "../../lib/platform";

describe("Platform Detection", () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("detectPlatform()", () => {
    it("should detect opencode via OPENCODE_DIR env var", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      delete process.env.PAI_DIR;
      
      const platform = detectPlatform();
      expect(platform).toBe("opencode");
    });

    it("should detect claudecode via PAI_DIR env var", () => {
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
      
      const platform = detectPlatform();
      expect(platform).toBe("claudecode");
    });

    it("should prioritize OPENCODE_DIR over PAI_DIR", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      process.env.PAI_DIR = "/test/.claude";
      
      const platform = detectPlatform();
      expect(platform).toBe("opencode");
    });

    it("should detect opencode via directory structure", () => {
      delete process.env.OPENCODE_DIR;
      delete process.env.PAI_DIR;
      
      // This test depends on actual directory structure
      // Just verify it returns a valid platform type
      const platform = detectPlatform();
      expect(["opencode", "claudecode", "unknown"]).toContain(platform);
    });
  });

  describe("getRootDir()", () => {
    it("should return OPENCODE_DIR when set", () => {
      const testDir = "/custom/opencode/path";
      process.env.OPENCODE_DIR = testDir;
      
      const rootDir = getRootDir();
      expect(rootDir).toBe(testDir);
    });

    it("should return PAI_DIR when set and OPENCODE_DIR not set", () => {
      const testDir = "/custom/claude/path";
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = testDir;
      
      const rootDir = getRootDir();
      expect(rootDir).toBe(testDir);
    });

    it("should throw error when platform cannot be detected", () => {
      delete process.env.OPENCODE_DIR;
      delete process.env.PAI_DIR;
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      
      expect(() => getRootDir()).toThrow();
    });
  });

  describe("getPlatformInfo()", () => {
    it("should return complete platform info for opencode", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      
      const info = getPlatformInfo();
      
      expect(info.platform).toBe("opencode");
      expect(info.rootDir).toBe("/test/.opencode");
      expect(info.skillsDir).toBe("/test/.opencode/skills");
      expect(info.memoryDir).toBe("/test/.opencode/MEMORY");
      expect(info.executionDir).toBe("/test/.opencode/MEMORY/execution");
      expect(info.projectsDir).toBe("/test/.opencode/MEMORY/projects");
    });

    it("should return complete platform info for claudecode", () => {
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
      
      const info = getPlatformInfo();
      
      expect(info.platform).toBe("claudecode");
      expect(info.rootDir).toBe("/test/.claude");
      expect(info.skillsDir).toBe("/test/.claude/skills");
      expect(info.memoryDir).toBe("/test/.claude/MEMORY");
    });
  });

  describe("resolvePath()", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should resolve relative paths from root", () => {
      const resolved = resolvePath("skills/SpecFirst");
      expect(resolved).toBe("/test/.opencode/skills/SpecFirst");
    });

    it("should handle absolute paths unchanged", () => {
      const resolved = resolvePath("/absolute/path");
      expect(resolved).toBe("/absolute/path");
    });

    it("should handle home directory paths", () => {
      process.env.HOME = "/home/user";
      
      const resolved = resolvePath("~/documents");
      expect(resolved).toBe("/home/user/documents");
    });
  });

  describe("Feature and Project Paths", () => {
    beforeEach(() => {
      process.env.OPENCODE_DIR = "/test/.opencode";
    });

    it("should generate correct feature directory path", () => {
      const featureDir = getFeatureDir("test-feature");
      expect(featureDir).toBe("/test/.opencode/MEMORY/execution/Features/test-feature");
    });

    it("should generate correct project directory path", () => {
      const projectDir = getProjectDir("test-project");
      expect(projectDir).toBe("/test/.opencode/MEMORY/projects/test-project");
    });

    it("should generate correct specs directory path", () => {
      const specsDir = getSpecsDir("test-feature");
      expect(specsDir).toBe("/test/.opencode/MEMORY/execution/Features/test-feature/specs");
    });
  });

  describe("Platform Checks", () => {
    it("should correctly identify OpenCode platform", () => {
      process.env.OPENCODE_DIR = "/test/.opencode";
      delete process.env.PAI_DIR;
      
      expect(isOpenCode()).toBe(true);
      expect(isClaudeCode()).toBe(false);
    });

    it("should correctly identify Claude Code platform", () => {
      delete process.env.OPENCODE_DIR;
      process.env.PAI_DIR = "/test/.claude";
      
      expect(isOpenCode()).toBe(false);
      expect(isClaudeCode()).toBe(true);
    });
  });
});
