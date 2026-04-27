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
  private cache: Map<string, { data: any; expiry: number }>;
  private CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.cache = new Map();
    this.baseUrl = process.env.OPEN_METADATA_URL || 'http://localhost:8585/api/v1';
    this.token = process.env.OPEN_METADATA_TOKEN || '';
    this.isSimulation = process.env.SIMULATION_MODE === 'true';
    console.log(`[OM SERVICE] Mode: ${this.isSimulation ? 'SIMULATION' : 'LIVE'} | URL: ${this.baseUrl}`);
  }

  private async fetchWithCache(key: string, fetcher: () => Promise<any>) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) return cached.data;
    const data = await fetcher();
    this.cache.set(key, { data, expiry: Date.now() + this.CACHE_TTL });
    return data;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getTables() {
    if (this.isSimulation) return MOCK_TABLES;
    return this.fetchWithCache('tables', async () => {
      try {
        console.time('[OM] fetchTables');
        const res = await axios.get(`${this.baseUrl}/tables?fields=owners,tags,usageSummary&limit=100`, { 
          headers: this.headers,
          timeout: 5000 
        });
        console.timeEnd('[OM] fetchTables');
        return res.data.data || [];
      } catch (err: any) {
        console.timeEnd('[OM] fetchTables');
        console.error('[OM] getTables failed:', err.code === 'ECONNABORTED' ? 'TIMEOUT' : err.message);
        return [];
      }
    });
  }

  async getTestCases() {
    if (this.isSimulation) return MOCK_DQ_TESTS;
    return this.fetchWithCache('testCases', async () => {
      try {
        const res = await axios.get(`${this.baseUrl}/dataQuality/testCases?fields=testCaseResult&limit=100`, { headers: this.headers });
        return res.data.data || [];
      } catch (err: any) {
        console.error('[OM] getTestCases failed:', err.response?.status, err.message);
        return [];
      }
    });
  }

  async getLineage(entityFQN: string) {
    const empty = { nodes: [], edges: [] };
    if (this.isSimulation) {
      return {
        nodes: [
          { id: '1', fullyQualifiedName: 'ecommerce.raw.user_orders', name: 'user_orders', entityType: 'table' },
          { id: '2', fullyQualifiedName: 'ecommerce.dim.product_catalog', name: 'product_catalog', entityType: 'table' },
          { id: '3', fullyQualifiedName: 'ecommerce.analytics.customer_metrics', name: 'customer_metrics', entityType: 'table' }
        ],
        edges: [
          { fromEntity: 'ecommerce.raw.user_orders', toEntity: 'ecommerce.analytics.customer_metrics' },
          { fromEntity: 'ecommerce.dim.product_catalog', toEntity: 'ecommerce.analytics.customer_metrics' }
        ]
      };
    }
    
    return this.fetchWithCache(`lineage:${entityFQN}`, async () => {
      try {
        console.log(`[OM] Fetching lineage for: ${entityFQN}`);
        const encodedFQN = entityFQN.split('.').map(encodeURIComponent).join('.');
        const res = await axios.get(
          `${this.baseUrl}/lineage/table/name/${encodedFQN}?upstreamDepth=1&downstreamDepth=3`,
          { headers: this.headers, timeout: 15000 }
        );
        const data = res.data;
        const nodes = [ ...(data.nodes || []), data.entity ].filter(Boolean).map((n: any) => ({
          ...n,
          fullyQualifiedName: n.fullyQualifiedName || n.fqn || n.id // Fallback for safety
        }));
        
        const fqnMap = Object.fromEntries(nodes.map((n: any) => [n.id, n.fullyQualifiedName]));
        console.log(`[OM] Found ${nodes.length} nodes in lineage for ${entityFQN}`);

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
        console.log(`[OM] Error/Timeout on lineage for "${entityFQN}":`, err.message);
        return empty;
      }
    });
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
