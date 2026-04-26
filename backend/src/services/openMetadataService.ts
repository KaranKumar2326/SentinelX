import axios from 'axios';

// ─── Simulation Data ──────────────────────────────────────────────────────────
let MOCK_TABLES = [
  { id: '1', name: 'user_orders', fullyQualifiedName: 'ecommerce.raw.user_orders', owner: { name: 'data_team' }, updatedAt: Date.now() },
  { id: '2', name: 'product_catalog', fullyQualifiedName: 'ecommerce.dim.product_catalog', owner: null, updatedAt: Date.now() },
  { id: '3', name: 'customer_metrics', fullyQualifiedName: 'ecommerce.analytics.customer_metrics', owner: { name: 'analytics_team' }, updatedAt: Date.now() - 36 * 60 * 60 * 1000 },
];

let MOCK_DQ_TESTS = [
  { id: 'dq1', entityLink: '<#E::table::ecommerce.raw.user_orders>', name: 'not_null_check', testCaseResult: { testCaseStatus: 'Success' } },
  { id: 'dq2', entityLink: '<#E::table::ecommerce.raw.user_orders>', name: 'row_count_check', testCaseResult: { testCaseStatus: 'Failed', resultMessage: 'Row count 0 - expected > 1000' } },
  { id: 'dq3', entityLink: '<#E::table::ecommerce.dim.product_catalog>', name: 'id_unique', testCaseResult: { testCaseStatus: 'Success' } },
];

export function applySimulatedFix() {
  console.log('[SIMULATE FIX] Applying healthy state...');
  MOCK_DQ_TESTS = MOCK_DQ_TESTS.map(t =>
    t.id === 'dq2' ? { ...t, testCaseResult: { testCaseStatus: 'Success' } } : t
  );
  MOCK_TABLES = MOCK_TABLES.map(t =>
    t.id === '2' ? { ...t, owner: { name: 'platform_team' } } : t
  );
  MOCK_TABLES = MOCK_TABLES.map(t =>
    t.id === '3' ? { ...t, updatedAt: Date.now() } : t
  );
}

export function resetSimulatedFailure() {
  console.log('[SIMULATE FAILURE] Injecting data pipeline issues...');
  MOCK_DQ_TESTS = MOCK_DQ_TESTS.map(t =>
    t.id === 'dq2' ? { ...t, testCaseResult: { testCaseStatus: 'Failed', resultMessage: 'Row count 0 - expected > 1000' } } : t
  );
  MOCK_TABLES = MOCK_TABLES.map(t =>
    t.id === '2' ? { ...t, owner: null } : t
  );
  MOCK_TABLES = MOCK_TABLES.map(t =>
    t.id === '3' ? { ...t, updatedAt: Date.now() - 36 * 60 * 60 * 1000 } : t
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────
export class OpenMetadataService {
  private baseUrl: string;
  private token: string;
  private isSimulation: boolean;

  constructor() {
    this.baseUrl = process.env.OPEN_METADATA_URL || 'http://localhost:8585/api/v1';
    this.token = process.env.OPEN_METADATA_TOKEN || '';
    this.isSimulation = process.env.SIMULATION_MODE === 'true';
    console.log(`[OM SERVICE] Mode: ${this.isSimulation ? 'SIMULATION' : 'LIVE'} | URL: ${this.baseUrl}`);
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getTables() {
    if (this.isSimulation) return MOCK_TABLES;
    try {
      const res = await axios.get(`${this.baseUrl}/tables?fields=owners,tags,usageSummary&limit=100`, { headers: this.headers });
      return res.data.data || [];
    } catch (err: any) {
      console.error('[OM] getTables failed:', err.response?.status, err.message);
      return [];
    }
  }

  async getTestCases() {
    if (this.isSimulation) return MOCK_DQ_TESTS;
    try {
      const res = await axios.get(`${this.baseUrl}/dataQuality/testCases?fields=testCaseResult&limit=100`, { headers: this.headers });
      return res.data.data || [];
    } catch (err: any) {
      console.error('[OM] getTestCases failed:', err.response?.status, err.message);
      return [];
    }
  }

  async getLineage(entityFQN: string) {
    // Safe empty fallback for all callers
    const empty = { nodes: [], edges: [] };
    if (this.isSimulation) {
      return {
        nodes: [
          { id: '1', fullyQualifiedName: 'ecommerce.raw.user_orders', name: 'user_orders' },
          { id: '3', fullyQualifiedName: 'ecommerce.analytics.customer_metrics', name: 'customer_metrics' }
        ],
        edges: [{ fromEntity: '1', toEntity: '3' }]
      };
    }
    try {
      // FQN may contain dots — encode each segment except the dots between segments
      const encodedFQN = entityFQN.split('.').map(encodeURIComponent).join('.');
      const res = await axios.get(
        `${this.baseUrl}/lineage/table/name/${encodedFQN}?upstreamDepth=1&downstreamDepth=3`,
        { headers: this.headers }
      );
      // OM lineage response shape: { entity, nodes, upstreamEdges, downstreamEdges }
      const data = res.data;
      const nodes = [ ...(data.nodes || []), data.entity ].filter(Boolean);
      const fqnMap = Object.fromEntries(nodes.map((n: any) => [n.id, n.fullyQualifiedName]));

      const edges = [
        ...(data.upstreamEdges || []).map((e: any) => ({ 
          fromEntity: fqnMap[e.fromEntity] || e.fromEntity, 
          toEntity: fqnMap[e.toEntity] || e.toEntity 
        })),
        ...(data.downstreamEdges || []).map((e: any) => ({ 
          fromEntity: fqnMap[e.fromEntity] || e.fromEntity, 
          toEntity: fqnMap[e.toEntity] || e.toEntity 
        }))
      ];
      return { nodes, edges };
    } catch (err: any) {
      // 404 just means no lineage configured yet — not a hard error
      console.log(`[OM] No lineage for "${entityFQN}" (${err.response?.status || err.message}). Returning empty.`);
      return empty;
    }
  }

  async updateTableOwner(fqn: string, userId: string, userName: string) {
    if (this.isSimulation) {
      console.log(`[SIMULATION] Patching OM Owner for ${fqn} to ${userName}`);
      return { success: true };
    }
    const patch = [{ op: 'add', path: '/owners', value: [{ id: userId, type: 'user' }] }];
    try {
      const encodedFQN = fqn.split('.').map(encodeURIComponent).join('.');
      const res = await axios.patch(`${this.baseUrl}/tables/name/${encodedFQN}`, patch, {
        headers: { ...this.headers, 'Content-Type': 'application/json-patch+json' }
      });
      return res.data;
    } catch (err: any) {
      console.error('[OM] updateTableOwner failed:', err.response?.status, err.message);
      throw err;
    }
  }

  applySimulatedFix() {
    applySimulatedFix(); // Call the shared top-level mock updater
    console.log('[OM SERVICE] Health state recovery initiated.');
  }
}

export const omService = new OpenMetadataService();
