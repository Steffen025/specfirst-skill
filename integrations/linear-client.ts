/**
 * Linear API Client for SpecFirst
 * 
 * Provides GraphQL API access to Linear for milestone tracking,
 * issue management, and workflow state synchronization.
 * 
 * ISC 35: Query current milestone successfully
 * ISC 36: Handle authentication with tokens
 */

export interface LinearConfig {
  apiToken: string;
  teamId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  targetDate?: string;
}

export interface WorkflowState {
  id: string;
  name: string;
  type?: string;
}

export interface Issue {
  id: string;
  identifier: string; // e.g., "PAI-123"
  title: string;
  state: WorkflowState;
  milestone?: Milestone;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
    };
  }>;
}

export class LinearAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "LinearAPIError";
  }
}

export class LinearClient {
  private apiToken: string;
  private baseUrl = "https://api.linear.app/graphql";

  constructor(config?: LinearConfig) {
    this.apiToken = config?.apiToken || process.env.LINEAR_API_TOKEN || "";
  }

  /**
   * ISC 36: Check if client is configured with valid token
   */
  isConfigured(): boolean {
    return this.apiToken.length > 0;
  }

  /**
   * Execute GraphQL query against Linear API
   * ISC 36: Authentication via Bearer token
   */
  private async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new LinearAPIError(
        "Linear API token not configured. Set LINEAR_API_TOKEN environment variable.",
        "UNCONFIGURED"
      );
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "60",
          10
        );
        throw new LinearAPIError(
          `Rate limit exceeded. Retry after ${retryAfter}s`,
          "RATE_LIMIT",
          retryAfter
        );
      }

      if (!response.ok) {
        throw new LinearAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          "HTTP_ERROR"
        );
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        throw new LinearAPIError(
          error.message,
          error.extensions?.code || "GRAPHQL_ERROR"
        );
      }

      if (!result.data) {
        throw new LinearAPIError("No data in response", "EMPTY_RESPONSE");
      }

      return result.data;
    } catch (error) {
      if (error instanceof LinearAPIError) {
        throw error;
      }
      throw new LinearAPIError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * ISC 35: Get current milestone (active cycle) for a team
   */
  async getCurrentMilestone(teamId: string): Promise<Milestone | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const query = `
        query CurrentMilestone($teamId: String!) {
          team(id: $teamId) {
            activeCycle {
              id
              name
              endsAt
            }
          }
        }
      `;

      const result = await this.query<{
        team: {
          activeCycle: {
            id: string;
            name: string;
            endsAt: string;
          } | null;
        };
      }>(query, { teamId });

      if (!result.team.activeCycle) {
        return null;
      }

      return {
        id: result.team.activeCycle.id,
        name: result.team.activeCycle.name,
        targetDate: result.team.activeCycle.endsAt,
      };
    } catch (error) {
      if (error instanceof LinearAPIError && error.code === "UNCONFIGURED") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get issue by identifier (e.g., "PAI-123")
   */
  async getIssue(identifier: string): Promise<Issue | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const query = `
        query GetIssue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            state {
              id
              name
              type
            }
            cycle {
              id
              name
              endsAt
            }
          }
        }
      `;

      const result = await this.query<{
        issue: {
          id: string;
          identifier: string;
          title: string;
          state: {
            id: string;
            name: string;
            type: string;
          };
          cycle: {
            id: string;
            name: string;
            endsAt: string;
          } | null;
        } | null;
      }>(query, { id: identifier });

      if (!result.issue) {
        return null;
      }

      return {
        id: result.issue.id,
        identifier: result.issue.identifier,
        title: result.issue.title,
        state: {
          id: result.issue.state.id,
          name: result.issue.state.name,
          type: result.issue.state.type,
        },
        milestone: result.issue.cycle
          ? {
              id: result.issue.cycle.id,
              name: result.issue.cycle.name,
              targetDate: result.issue.cycle.endsAt,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof LinearAPIError && error.code === "UNCONFIGURED") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update issue state
   */
  async updateIssueState(issueId: string, stateId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const mutation = `
        mutation UpdateIssue($id: String!, $stateId: String!) {
          issueUpdate(id: $id, input: { stateId: $stateId }) {
            success
            issue {
              id
              state {
                name
              }
            }
          }
        }
      `;

      const result = await this.query<{
        issueUpdate: {
          success: boolean;
        };
      }>(mutation, { id: issueId, stateId });

      return result.issueUpdate.success;
    } catch (error) {
      if (error instanceof LinearAPIError && error.code === "UNCONFIGURED") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get team's workflow states
   */
  async getTeamStates(teamId: string): Promise<WorkflowState[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const query = `
        query TeamStates($teamId: String!) {
          team(id: $teamId) {
            states {
              nodes {
                id
                name
                type
              }
            }
          }
        }
      `;

      const result = await this.query<{
        team: {
          states: {
            nodes: Array<{
              id: string;
              name: string;
              type: string;
            }>;
          };
        };
      }>(query, { teamId });

      return result.team.states.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
      }));
    } catch (error) {
      if (error instanceof LinearAPIError && error.code === "UNCONFIGURED") {
        return [];
      }
      throw error;
    }
  }
}

// Singleton for easy access
let _client: LinearClient | null = null;

export function getLinearClient(): LinearClient {
  if (!_client) {
    _client = new LinearClient();
  }
  return _client;
}

/**
 * Check if Linear integration is available
 */
export function isLinearAvailable(): boolean {
  return getLinearClient().isConfigured();
}

/**
 * Self-test: Verify Linear client configuration
 * 
 * ISC 35: Query milestone successfully
 * ISC 36: Handle authentication
 */
export async function selfTest(): Promise<{
  configured: boolean;
  canConnect?: boolean;
  error?: string;
}> {
  const client = getLinearClient();

  if (!client.isConfigured()) {
    return {
      configured: false,
      error: "LINEAR_API_TOKEN not set",
    };
  }

  try {
    // Test with a minimal query that doesn't require team ID
    const query = `
      query Viewer {
        viewer {
          id
          name
        }
      }
    `;

    await client["query"]<{ viewer: { id: string; name: string } }>(query);

    return {
      configured: true,
      canConnect: true,
    };
  } catch (error) {
    return {
      configured: true,
      canConnect: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
