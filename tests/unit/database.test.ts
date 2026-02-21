import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";
import {
  initDatabase,
  closeDatabase,
  getDbPath,
  addFeature,
  getFeature,
  getFeatures,
  getNextFeature,
  updateFeatureStatus,
  updateFeaturePhase,
  updateFeaturePaths,
  addCriterion,
  getCriteria,
  updateCriterionStatus,
  createSession,
  getSession,
  getCurrentSession,
  claimFeature,
  releaseFeature,
  endSession,
  getStats,
} from "../../lib/database";

describe("Database Module", () => {
  let tempDir: string;
  let featureIdCounter = 0;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "specfirst-test-"));
    initDatabase(tempDir);
    featureIdCounter = 0;
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to generate unique feature IDs
  function nextFeatureId(): string {
    return `feat-${String(++featureIdCounter).padStart(3, '0')}`;
  }

  // 1. Database Initialization
  describe("Database Initialization", () => {
    test("creates .specfirst directory", () => {
      const specFirstDir = join(tempDir, ".specfirst");
      expect(existsSync(specFirstDir)).toBe(true);
    });

    test("creates database file", () => {
      const dbPath = getDbPath(tempDir);
      expect(existsSync(dbPath)).toBe(true);
    });

    test("schema has all required tables", () => {
      const tables = ["features", "criteria", "sessions"];
      
      // Query sqlite_master to check tables exist
      const { Database } = require("bun:sqlite");
      const db = new Database(getDbPath(tempDir));
      
      for (const table of tables) {
        const result = db
          .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
          .get(table);
        expect(result).toBeTruthy();
      }
      
      db.close();
    });

    test("re-initialization is idempotent", () => {
      // Add a feature
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test Feature",
        description: "Test",
        priority: 1,
      });

      // Re-initialize
      initDatabase(tempDir);

      // Feature should still exist
      const feature = getFeature(featureId);
      expect(feature).toBeTruthy();
      expect(feature?.name).toBe("Test Feature");
    });
  });

  // 2. Feature Operations
  describe("Feature Operations", () => {
    test("addFeature creates feature correctly", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "My Feature",
        description: "A test feature",
        priority: 5,
      });
      
      const feature = getFeature(featureId);
      expect(feature).toBeTruthy();
      expect(feature?.name).toBe("My Feature");
      expect(feature?.description).toBe("A test feature");
      expect(feature?.priority).toBe(5);
      expect(feature?.status).toBe("pending");
      expect(feature?.phase).toBe("none");
    });

    test("getFeature returns null for non-existent", () => {
      const feature = getFeature("non-existent-id");
      expect(feature).toBeNull();
    });

    test("getFeatures returns all features sorted by priority", () => {
      addFeature({ id: nextFeatureId(), name: "Low Priority", description: "Test", priority: 3 });
      addFeature({ id: nextFeatureId(), name: "High Priority", description: "Test", priority: 1 });
      addFeature({ id: nextFeatureId(), name: "Medium Priority", description: "Test", priority: 2 });

      const features = getFeatures();
      expect(features).toHaveLength(3);
      expect(features[0].name).toBe("High Priority");
      expect(features[1].name).toBe("Medium Priority");
      expect(features[2].name).toBe("Low Priority");
    });

    test("getNextFeature returns highest priority pending", () => {
      const id1 = nextFeatureId();
      const id2 = nextFeatureId();
      const id3 = nextFeatureId();
      
      addFeature({ id: id1, name: "Priority 3", description: "Test", priority: 3 });
      addFeature({ id: id2, name: "Priority 1", description: "Test", priority: 1 });
      addFeature({ id: id3, name: "Priority 2", description: "Test", priority: 2 });

      // Mark priority 1 as in_progress
      updateFeatureStatus(id2, "in_progress");

      const next = getNextFeature();
      expect(next).toBeTruthy();
      expect(next?.name).toBe("Priority 2");
      expect(next?.priority).toBe(2);
    });

    test("updateFeatureStatus updates correctly", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      updateFeatureStatus(featureId, "in_progress");
      let feature = getFeature(featureId);
      expect(feature?.status).toBe("in_progress");

      updateFeatureStatus(featureId, "completed");
      feature = getFeature(featureId);
      expect(feature?.status).toBe("completed");
    });

    test("updateFeaturePhase updates correctly", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      updateFeaturePhase(featureId, "specify");
      let feature = getFeature(featureId);
      expect(feature?.phase).toBe("specify");

      updateFeaturePhase(featureId, "plan");
      feature = getFeature(featureId);
      expect(feature?.phase).toBe("plan");
    });

    test("updateFeaturePaths updates only provided paths", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      updateFeaturePaths(featureId, {
        proposalPath: "/path/to/proposal.md",
      });
      let feature = getFeature(featureId);
      expect(feature?.proposalPath).toBe("/path/to/proposal.md");
      expect(feature?.specPath).toBeNull();

      updateFeaturePaths(featureId, {
        specPath: "/path/to/spec.md",
        planPath: "/path/to/plan.md",
      });
      feature = getFeature(featureId);
      expect(feature?.proposalPath).toBe("/path/to/proposal.md");
      expect(feature?.specPath).toBe("/path/to/spec.md");
      expect(feature?.planPath).toBe("/path/to/plan.md");
    });
  });

  // 3. Criteria Operations
  describe("Criteria Operations", () => {
    test("addCriterion creates criterion with auto-id", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      const criterionId1 = addCriterion(featureId, "First criterion");
      const criterionId2 = addCriterion(featureId, "Second criterion");

      // IDs are generated with timestamp format, not ISC-1, ISC-2
      expect(criterionId1).toBeTypeOf("string");
      expect(criterionId2).toBeTypeOf("string");
      expect(criterionId1).not.toBe(criterionId2);

      const criteria = getCriteria(featureId);
      expect(criteria).toHaveLength(2);
      
      // Check both criteria exist (order may vary)
      const texts = criteria.map(c => c.criterion);
      expect(texts).toContain("First criterion");
      expect(texts).toContain("Second criterion");
    });

    test("getCriteria returns all for feature", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      addCriterion(featureId, "Criterion 1");
      addCriterion(featureId, "Criterion 2");
      addCriterion(featureId, "Criterion 3");

      const criteria = getCriteria(featureId);
      expect(criteria).toHaveLength(3);
    });

    test("updateCriterionStatus updates status and evidence", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      const criterionId = addCriterion(featureId, "Test criterion");

      // updateCriterionStatus takes just id, not featureId
      updateCriterionStatus(criterionId, "verified", "All tests passed");

      const criteria = getCriteria(featureId);
      const criterion = criteria.find((c) => c.id === criterionId);
      expect(criterion?.status).toBe("verified");
      expect(criterion?.evidence).toBe("All tests passed");
    });
  });

  // 4. Session Operations
  describe("Session Operations", () => {
    test("createSession creates with unique id", () => {
      const sessionId = createSession();
      expect(sessionId).toBeTypeOf("string");
      expect(sessionId.length).toBeGreaterThan(0);

      const session = getSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.status).toBe("running");
    });

    test("getSession returns null for non-existent", () => {
      const session = getSession("non-existent-id");
      expect(session).toBeNull();
    });

    test("getCurrentSession returns running session", () => {
      const sessionId = createSession();
      const current = getCurrentSession();
      
      expect(current).toBeTruthy();
      expect(current?.id).toBe(sessionId);
      expect(current?.status).toBe("running");
    });

    test("claimFeature links feature to session", () => {
      const sessionId = createSession();
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      const result = claimFeature(sessionId, featureId);

      expect(result).toBe(true);
      const feature = getFeature(featureId);
      expect(feature?.sessionId).toBe(sessionId);
      // Note: claimFeature doesn't update status - that's separate
    });

    test("releaseFeature clears session link", () => {
      const sessionId = createSession();
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      claimFeature(sessionId, featureId);
      releaseFeature(sessionId, featureId);

      const feature = getFeature(featureId);
      expect(feature?.sessionId).toBeNull();
      // Note: releaseFeature doesn't update status - that's separate
    });

    test("endSession marks session completed", () => {
      const sessionId = createSession();
      
      endSession(sessionId);

      const session = getSession(sessionId);
      expect(session?.status).toBe("completed");
      expect(session?.endedAt).toBeTruthy();
    });
  });

  // 5. Statistics
  describe("Statistics", () => {
    test("getStats returns correct counts", () => {
      // Add features with different statuses
      const id1 = nextFeatureId();
      const id2 = nextFeatureId();
      const id3 = nextFeatureId();
      
      addFeature({ id: id1, name: "F1", description: "Test", priority: 1 });
      addFeature({ id: id2, name: "F2", description: "Test", priority: 2 });
      addFeature({ id: id3, name: "F3", description: "Test", priority: 3 });

      updateFeatureStatus(id1, "in_progress");
      updateFeatureStatus(id3, "completed");

      const stats = getStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
    });

    test("empty database returns zeros", () => {
      const stats = getStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
    });
  });

  // 6. Edge Cases
  describe("Edge Cases", () => {
    test("handles multiple features with same priority", () => {
      addFeature({ id: nextFeatureId(), name: "F1", description: "Test", priority: 1 });
      addFeature({ id: nextFeatureId(), name: "F2", description: "Test", priority: 1 });
      addFeature({ id: nextFeatureId(), name: "F3", description: "Test", priority: 1 });

      const features = getFeatures();
      expect(features).toHaveLength(3);
      expect(features.every((f) => f.priority === 1)).toBe(true);
    });

    test("handles empty criteria list", () => {
      const featureId = nextFeatureId();
      addFeature({
        id: featureId,
        name: "Test",
        description: "Test",
        priority: 1,
      });

      const criteria = getCriteria(featureId);
      expect(criteria).toHaveLength(0);
    });

    test("getNextFeature returns null when all in_progress or completed", () => {
      const id1 = nextFeatureId();
      const id2 = nextFeatureId();
      
      addFeature({ id: id1, name: "F1", description: "Test", priority: 1 });
      addFeature({ id: id2, name: "F2", description: "Test", priority: 2 });

      updateFeatureStatus(id1, "in_progress");
      updateFeatureStatus(id2, "completed");

      const next = getNextFeature();
      expect(next).toBeNull();
    });

    test("getCurrentSession returns null when no running session", () => {
      const sessionId = createSession();
      endSession(sessionId);

      const current = getCurrentSession();
      expect(current).toBeNull();
    });
  });
});
