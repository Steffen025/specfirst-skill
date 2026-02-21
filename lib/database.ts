/**
 * Database Module for SpecFirst 4.0
 * SQLite operations for feature, ISC criteria, and PRD management.
 * Updated for Algorithm v1.8.0: PRD lifecycle status fields.
 * 
 * Uses Bun's native SQLite with WAL mode for concurrency.
 * Database location: .specfirst/specfirst.db (relative to project root)
 * 
 * @module database
 * @version 4.0.0
 */

import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// =============================================================================
// Module State
// =============================================================================

let db: Database | null = null;

// =============================================================================
// Types
// =============================================================================

/** Feature status states */
export type FeatureStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/** PRD lifecycle status (Algorithm v1.8.0) */
export type PRDStatus = 'DRAFT' | 'CRITERIA_DEFINED' | 'PLANNED' | 'IN_PROGRESS' | 'VERIFYING' | 'COMPLETE' | 'FAILED' | 'BLOCKED';

/** SpecFirst workflow phases */
export type Phase = 'none' | 'propose' | 'specify' | 'plan' | 'implement' | 'release';

/** ISC criterion status states */
export type CriterionStatus = 'pending' | 'in_progress' | 'verified' | 'failed';

/** Session status for multi-session workflows (Cedars) */
export type SessionStatus = 'running' | 'paused' | 'completed' | 'failed';

/** Feature entity from database */
export interface Feature {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  status: FeatureStatus;
  phase: Phase;
  proposalPath: string | null;
  specPath: string | null;
  planPath: string | null;
  tasksPath: string | null;
  constitutionPath: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  sessionId: string | null;
  skipReason: string | null;
  /** PRD lifecycle status (Algorithm v1.8.0) */
  prdStatus: PRDStatus | null;
  /** Path to PRD file */
  prdPath: string | null;
  /** Effort level tier for this feature */
  effortLevel: string | null;
  /** Current iteration count for loop mode */
  iteration: number;
  /** Verification summary "N/M" */
  verificationSummary: string | null;
}

/** ISC Criterion entity from database */
export interface Criterion {
  id: string;
  featureId: string;
  criterion: string;
  status: CriterionStatus;
  evidence: string | null;
  verifiedAt: Date | null;
}

/** Session entity for multi-session workflows */
export interface Session {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  currentFeatureId: string | null;
  featuresCompleted: number;
  status: SessionStatus;
}

/** Statistics about feature queue */
export interface FeatureStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  skipped: number;
  percentComplete: number;
}

/** Input for adding a new feature */
export interface AddFeatureInput {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  proposalPath?: string;
  specPath?: string;
  planPath?: string;
  tasksPath?: string;
  constitutionPath?: string;
}

/** Paths to update for a feature */
export interface FeaturePaths {
  proposalPath?: string;
  specPath?: string;
  planPath?: string;
  tasksPath?: string;
  constitutionPath?: string;
}

// =============================================================================
// Internal Types
// =============================================================================

interface FeatureRow {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  status: string;
  phase: string;
  proposal_path: string | null;
  spec_path: string | null;
  plan_path: string | null;
  tasks_path: string | null;
  constitution_path: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  session_id: string | null;
  skip_reason: string | null;
  prd_status: string | null;
  prd_path: string | null;
  effort_level: string | null;
  iteration: number;
  verification_summary: string | null;
}

interface CriterionRow {
  id: string;
  feature_id: string;
  criterion: string;
  status: string;
  evidence: string | null;
  verified_at: string | null;
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  current_feature_id: string | null;
  features_completed: number;
  status: string;
}

interface StatsRow {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  skipped: number;
}

// =============================================================================
// Database Path Management
// =============================================================================

/** Directory name for SpecFirst data */
const SPECFIRST_DIR = ".specfirst";

/** Database filename */
const DB_FILENAME = "specfirst.db";

/**
 * Get the database path for a project
 * @param projectPath - Root path of the project
 * @returns Full path to database file
 */
export function getDbPath(projectPath: string): string {
  return join(projectPath, SPECFIRST_DIR, DB_FILENAME);
}

/**
 * Ensure the .specfirst directory exists
 * @param projectPath - Root path of the project
 */
function ensureSpecFirstDir(projectPath: string): void {
  const specfirstDir = join(projectPath, SPECFIRST_DIR);
  if (!existsSync(specfirstDir)) {
    mkdirSync(specfirstDir, { recursive: true });
  }
}

// =============================================================================
// Database Initialization
// =============================================================================

/**
 * Initialize the database with schema
 * Creates tables and indexes if they don't exist
 * Enables WAL mode for better concurrency
 * 
 * @param projectPath - Root path of the project
 * @returns Database instance
 * 
 * @example
 * ```typescript
 * const db = initDatabase('/path/to/project');
 * // Use database operations
 * closeDatabase();
 * ```
 */
export function initDatabase(projectPath: string): Database {
  // Close existing connection if any
  if (db) {
    db.close();
  }

  // Ensure directory exists
  ensureSpecFirstDir(projectPath);

  // Get database path and create
  const dbPath = getDbPath(projectPath);
  db = new Database(dbPath, { create: true });

  // Enable WAL mode for better concurrency
  db.exec("PRAGMA journal_mode = WAL");

  // Create features table
  db.exec(`
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      priority INTEGER DEFAULT 999,
      status TEXT DEFAULT 'pending',
      phase TEXT DEFAULT 'none',
      proposal_path TEXT,
      spec_path TEXT,
      plan_path TEXT,
      tasks_path TEXT,
      constitution_path TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      session_id TEXT,
      skip_reason TEXT,
      prd_status TEXT DEFAULT NULL,
      prd_path TEXT DEFAULT NULL,
      effort_level TEXT DEFAULT NULL,
      iteration INTEGER DEFAULT 0,
      verification_summary TEXT DEFAULT NULL
    )
  `);

  // Create criteria table
  db.exec(`
    CREATE TABLE IF NOT EXISTS criteria (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL,
      criterion TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      evidence TEXT,
      verified_at TEXT,
      FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
    )
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      current_feature_id TEXT,
      features_completed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      FOREIGN KEY (current_feature_id) REFERENCES features(id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
    CREATE INDEX IF NOT EXISTS idx_features_phase ON features(phase);
    CREATE INDEX IF NOT EXISTS idx_features_session ON features(session_id);
    CREATE INDEX IF NOT EXISTS idx_criteria_feature ON criteria(feature_id);
    CREATE INDEX IF NOT EXISTS idx_criteria_status ON criteria(status);
  `);

  // v4.0 Migration: Add PRD fields if not present
  try { db.exec("ALTER TABLE features ADD COLUMN prd_status TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE features ADD COLUMN prd_path TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE features ADD COLUMN effort_level TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE features ADD COLUMN iteration INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE features ADD COLUMN verification_summary TEXT DEFAULT NULL"); } catch {}

  return db;
}

/**
 * Close the database connection
 * Safe to call multiple times
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get the current database instance
 * @throws Error if database not initialized
 * @internal
 */
function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// =============================================================================
// Feature Operations
// =============================================================================

/**
 * Add a new feature to the queue
 * 
 * @param input - Feature data
 * @throws Error if database not initialized
 * 
 * @example
 * ```typescript
 * addFeature({
 *   id: 'feat-001',
 *   name: 'User Authentication',
 *   description: 'Add login/logout functionality',
 *   priority: 1
 * });
 * ```
 */
export function addFeature(input: AddFeatureInput): void {
  const database = getDb();
  const now = new Date().toISOString();

  database.run(
    `INSERT INTO features (
      id, name, description, priority, proposal_path, spec_path, 
      plan_path, tasks_path, constitution_path, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.description ?? null,
      input.priority ?? 999,
      input.proposalPath ?? null,
      input.specPath ?? null,
      input.planPath ?? null,
      input.tasksPath ?? null,
      input.constitutionPath ?? null,
      now,
    ]
  );
}

/**
 * Get a specific feature by ID
 * 
 * @param id - Feature ID
 * @returns Feature or null if not found
 */
export function getFeature(id: string): Feature | null {
  const database = getDb();

  const row = database.query<FeatureRow, [string]>(
    `SELECT * FROM features WHERE id = ?`
  ).get(id);

  return row ? rowToFeature(row) : null;
}

/**
 * Get all features ordered by priority
 * 
 * @returns Array of features
 */
export function getFeatures(): Feature[] {
  const database = getDb();

  const rows = database.query<FeatureRow, []>(
    `SELECT * FROM features ORDER BY priority ASC, created_at ASC`
  ).all();

  return rows.map(rowToFeature);
}

/**
 * Get the next pending feature (highest priority)
 * 
 * @returns Next feature or null if none pending
 */
export function getNextFeature(): Feature | null {
  const database = getDb();

  const row = database.query<FeatureRow, []>(
    `SELECT * FROM features
     WHERE status = 'pending'
     ORDER BY priority ASC, created_at ASC
     LIMIT 1`
  ).get();

  return row ? rowToFeature(row) : null;
}

/**
 * Update a feature's status
 * Automatically sets started_at and completed_at timestamps
 * 
 * @param id - Feature ID
 * @param status - New status
 */
export function updateFeatureStatus(id: string, status: FeatureStatus): void {
  const database = getDb();
  const now = new Date().toISOString();

  let startedAt: string | null = null;
  let completedAt: string | null = null;

  if (status === "in_progress") {
    startedAt = now;
  } else if (status === "completed") {
    completedAt = now;
    // Also set startedAt if not already set
    const feature = getFeature(id);
    if (feature && !feature.startedAt) {
      startedAt = now;
    }
  }

  if (startedAt && completedAt) {
    database.run(
      `UPDATE features SET status = ?, started_at = ?, completed_at = ? WHERE id = ?`,
      [status, startedAt, completedAt, id]
    );
  } else if (startedAt) {
    database.run(
      `UPDATE features SET status = ?, started_at = ? WHERE id = ?`,
      [status, startedAt, id]
    );
  } else if (completedAt) {
    database.run(
      `UPDATE features SET status = ?, completed_at = ? WHERE id = ?`,
      [status, completedAt, id]
    );
  } else {
    database.run(
      `UPDATE features SET status = ? WHERE id = ?`,
      [status, id]
    );
  }
}

/**
 * Update a feature's phase
 * 
 * @param id - Feature ID
 * @param phase - New phase
 */
export function updateFeaturePhase(id: string, phase: Phase): void {
  const database = getDb();
  database.run(`UPDATE features SET phase = ? WHERE id = ?`, [phase, id]);
}

/**
 * Update a feature's artifact paths
 * Only updates paths that are provided
 * 
 * @param id - Feature ID
 * @param paths - Paths to update
 */
export function updateFeaturePaths(id: string, paths: FeaturePaths): void {
  const database = getDb();

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (paths.proposalPath !== undefined) {
    updates.push("proposal_path = ?");
    values.push(paths.proposalPath);
  }
  if (paths.specPath !== undefined) {
    updates.push("spec_path = ?");
    values.push(paths.specPath);
  }
  if (paths.planPath !== undefined) {
    updates.push("plan_path = ?");
    values.push(paths.planPath);
  }
  if (paths.tasksPath !== undefined) {
    updates.push("tasks_path = ?");
    values.push(paths.tasksPath);
  }
  if (paths.constitutionPath !== undefined) {
    updates.push("constitution_path = ?");
    values.push(paths.constitutionPath);
  }

  if (updates.length === 0) {
    return; // Nothing to update
  }

  values.push(id);
  database.run(
    `UPDATE features SET ${updates.join(", ")} WHERE id = ?`,
    values
  );
}

// =============================================================================
// Criteria Operations
// =============================================================================

/**
 * Add a new ISC criterion for a feature
 * 
 * @param featureId - Feature ID this criterion belongs to
 * @param criterion - The 8-word criterion text
 * @returns Generated criterion ID
 * 
 * @example
 * ```typescript
 * const criterionId = addCriterion('feat-001', 'User can log in with email password');
 * ```
 */
export function addCriterion(featureId: string, criterion: string): string {
  const database = getDb();
  const id = `crit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  database.run(
    `INSERT INTO criteria (id, feature_id, criterion) VALUES (?, ?, ?)`,
    [id, featureId, criterion]
  );

  return id;
}

/**
 * Get all criteria for a feature
 * 
 * @param featureId - Feature ID
 * @returns Array of criteria
 */
export function getCriteria(featureId: string): Criterion[] {
  const database = getDb();

  const rows = database.query<CriterionRow, [string]>(
    `SELECT * FROM criteria WHERE feature_id = ? ORDER BY id ASC`
  ).all(featureId);

  return rows.map(rowToCriterion);
}

/**
 * Update a criterion's status and optionally add evidence
 * 
 * @param id - Criterion ID
 * @param status - New status
 * @param evidence - Optional verification evidence
 */
export function updateCriterionStatus(
  id: string,
  status: CriterionStatus,
  evidence?: string
): void {
  const database = getDb();
  const now = new Date().toISOString();

  if (status === "verified") {
    database.run(
      `UPDATE criteria SET status = ?, evidence = ?, verified_at = ? WHERE id = ?`,
      [status, evidence ?? null, now, id]
    );
  } else {
    database.run(
      `UPDATE criteria SET status = ?, evidence = ? WHERE id = ?`,
      [status, evidence ?? null, id]
    );
  }
}

// =============================================================================
// Session Operations (for Cedars)
// =============================================================================

/**
 * Create a new work session
 * 
 * @returns Session ID
 */
export function createSession(): string {
  const database = getDb();
  const id = `session-${Date.now()}`;
  const now = new Date().toISOString();

  database.run(
    `INSERT INTO sessions (id, started_at) VALUES (?, ?)`,
    [id, now]
  );

  return id;
}

/**
 * Get a specific session by ID
 * 
 * @param id - Session ID
 * @returns Session or null if not found
 */
export function getSession(id: string): Session | null {
  const database = getDb();

  const row = database.query<SessionRow, [string]>(
    `SELECT * FROM sessions WHERE id = ?`
  ).get(id);

  return row ? rowToSession(row) : null;
}

/**
 * Get the current running session
 * 
 * @returns Current session or null if none running
 */
export function getCurrentSession(): Session | null {
  const database = getDb();

  const row = database.query<SessionRow, []>(
    `SELECT * FROM sessions WHERE status = 'running' ORDER BY started_at DESC LIMIT 1`
  ).get();

  return row ? rowToSession(row) : null;
}

/**
 * Claim a feature for a session
 * Sets the feature's session_id and updates session's current_feature_id
 * 
 * @param sessionId - Session ID
 * @param featureId - Feature ID to claim
 * @returns true if successful, false if feature already claimed
 */
export function claimFeature(sessionId: string, featureId: string): boolean {
  const database = getDb();

  // Check if feature is already claimed by another session
  const feature = getFeature(featureId);
  if (feature?.sessionId && feature.sessionId !== sessionId) {
    return false;
  }

  // Claim the feature
  database.run(
    `UPDATE features SET session_id = ? WHERE id = ?`,
    [sessionId, featureId]
  );

  // Update session
  database.run(
    `UPDATE sessions SET current_feature_id = ? WHERE id = ?`,
    [featureId, sessionId]
  );

  return true;
}

/**
 * Release a feature from a session
 * Clears the feature's session_id and session's current_feature_id
 * 
 * @param sessionId - Session ID
 * @param featureId - Feature ID to release
 */
export function releaseFeature(sessionId: string, featureId: string): void {
  const database = getDb();

  database.run(
    `UPDATE features SET session_id = NULL WHERE id = ? AND session_id = ?`,
    [featureId, sessionId]
  );

  database.run(
    `UPDATE sessions SET current_feature_id = NULL WHERE id = ? AND current_feature_id = ?`,
    [sessionId, featureId]
  );
}

/**
 * End a session
 * Sets end timestamp and status to completed
 * 
 * @param id - Session ID
 */
export function endSession(id: string): void {
  const database = getDb();
  const now = new Date().toISOString();

  database.run(
    `UPDATE sessions SET ended_at = ?, status = 'completed' WHERE id = ?`,
    [now, id]
  );
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get aggregate statistics about the feature queue
 * 
 * @returns Feature statistics
 */
export function getStats(): FeatureStats {
  const database = getDb();

  const row = database.query<StatsRow, []>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM features
  `).get();

  if (!row) {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
      percentComplete: 0,
    };
  }

  const total = row.total ?? 0;
  const completed = row.completed ?? 0;

  return {
    total,
    pending: row.pending ?? 0,
    inProgress: row.in_progress ?? 0,
    completed,
    skipped: row.skipped ?? 0,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert database row to Feature object
 * @internal
 */
function rowToFeature(row: FeatureRow): Feature {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priority: row.priority,
    status: row.status as FeatureStatus,
    phase: row.phase as Phase,
    proposalPath: row.proposal_path,
    specPath: row.spec_path,
    planPath: row.plan_path,
    tasksPath: row.tasks_path,
    constitutionPath: row.constitution_path,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    sessionId: row.session_id,
    skipReason: row.skip_reason,
    prdStatus: row.prd_status as PRDStatus | null,
    prdPath: row.prd_path,
    effortLevel: row.effort_level,
    iteration: row.iteration ?? 0,
    verificationSummary: row.verification_summary,
  };
}

/**
 * Convert database row to Criterion object
 * @internal
 */
function rowToCriterion(row: CriterionRow): Criterion {
  return {
    id: row.id,
    featureId: row.feature_id,
    criterion: row.criterion,
    status: row.status as CriterionStatus,
    evidence: row.evidence,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
  };
}

/**
 * Convert database row to Session object
 * @internal
 */
function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    currentFeatureId: row.current_feature_id,
    featuresCompleted: row.features_completed,
    status: row.status as SessionStatus,
  };
}

// =============================================================================
// Testing Interface
// =============================================================================

/**
 * Internal testing interface
 * Exported for test access only
 * @internal
 */
export const __testing = {
  getDb,
  rowToFeature,
  rowToCriterion,
  rowToSession,
};

// =============================================================================
// Self-Test
// =============================================================================

if (import.meta.main) {
  console.log("Running database module self-test...\n");

  // Create temporary test database
  const testDir = "/tmp/specfirst-test-" + Date.now();
  mkdirSync(testDir, { recursive: true });

  try {
    // Initialize database
    console.log("1. Initializing database...");
    const testDb = initDatabase(testDir);
    console.log(`   ✓ Database created at: ${getDbPath(testDir)}`);

    // Add a feature
    console.log("\n2. Adding feature...");
    addFeature({
      id: "test-001",
      name: "Test Feature",
      description: "A test feature",
      priority: 1,
    });
    console.log("   ✓ Feature added");

    // Get the feature
    console.log("\n3. Getting feature...");
    const feature = getFeature("test-001");
    console.log(`   ✓ Feature retrieved: ${feature?.name}`);

    // Add ISC criteria
    console.log("\n4. Adding ISC criteria...");
    const crit1 = addCriterion("test-001", "Database module exists with WAL mode enabled");
    const crit2 = addCriterion("test-001", "Features table stores all required feature metadata");
    console.log(`   ✓ Criteria added: ${crit1}, ${crit2}`);

    // Get criteria
    console.log("\n5. Getting criteria...");
    const criteria = getCriteria("test-001");
    console.log(`   ✓ Retrieved ${criteria.length} criteria`);

    // Update criterion status
    console.log("\n6. Verifying criterion...");
    updateCriterionStatus(crit1, "verified", "Self-test demonstrates functionality");
    const updatedCrit = getCriteria("test-001").find(c => c.id === crit1);
    console.log(`   ✓ Criterion verified: ${updatedCrit?.status}`);

    // Update feature status
    console.log("\n7. Updating feature status...");
    updateFeatureStatus("test-001", "in_progress");
    const inProgressFeature = getFeature("test-001");
    console.log(`   ✓ Feature status: ${inProgressFeature?.status}`);

    // Update feature phase
    console.log("\n8. Updating feature phase...");
    updateFeaturePhase("test-001", "specify");
    const phasedFeature = getFeature("test-001");
    console.log(`   ✓ Feature phase: ${phasedFeature?.phase}`);

    // Create session
    console.log("\n9. Creating session...");
    const sessionId = createSession();
    console.log(`   ✓ Session created: ${sessionId}`);

    // Claim feature
    console.log("\n10. Claiming feature for session...");
    const claimed = claimFeature(sessionId, "test-001");
    console.log(`   ✓ Feature claimed: ${claimed}`);

    // Get stats
    console.log("\n11. Getting statistics...");
    const stats = getStats();
    console.log(`   ✓ Stats: ${stats.total} total, ${stats.inProgress} in progress`);

    // Close database
    console.log("\n12. Closing database...");
    closeDatabase();
    console.log("   ✓ Database closed");

    console.log("\n✅ All tests passed!");
    console.log(`\nTest database created at: ${testDir}`);
    console.log("You can inspect it with: sqlite3 " + getDbPath(testDir));

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}
