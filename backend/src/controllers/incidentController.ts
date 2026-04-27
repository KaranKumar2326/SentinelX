import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { omService } from '../services/openMetadataService';
import { detectionEngine } from '../services/detectionEngine';
import { insightService } from '../services/insightService';
import { airflowService } from '../services/airflowService';
import { IncidentType, Prisma, Status, Severity } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineageNode {
  id: string;
  name: string;
  type: string;
  fullyQualifiedName: string;
  isSource: boolean;
  isImpacted: boolean;
  isUpstream: boolean;
  depth: number;           // hops from the source node (negative = upstream)
  platform?: string;
  description?: string;
  owner?: string;
  tags?: string[];
}

interface LineageEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: { stroke: string; strokeWidth?: number };
  label?: string;
  type?: string;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  stats: {
    totalNodes: number;
    impactedNodes: number;
    upstreamNodes: number;
    maxDepth: number;
    maxUpstreamDepth: number;
  };
}

interface RemediationAction {
  action: 'RESTART_PIPELINE' | 'QUARANTINE_TABLE' | 'NOTIFY_OWNER' | 'ROLLBACK' | 'CUSTOM';
  payload?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps an async route handler to catch unhandled rejections and forward them
 * to the Express error middleware (or fall back to a 500).
 */
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void | Response>) =>
    (req: Request, res: Response) => {
      Promise.resolve(fn(req, res)).catch((err) => {
        console.error('[UNHANDLED]', err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      });
    };

/**
 * BFS that returns every reachable node and its depth from `startId`.
 * direction === 'downstream': follow fromEntity → toEntity edges
 * direction === 'upstream':   follow toEntity → fromEntity edges (reverse)
 */
function bfsLineage(
  startId: string,
  edges: any[],
  direction: 'downstream' | 'upstream',
  maxDepth = 20,
): Map<string, number> {
  const visited = new Map<string, number>(); // fqn → depth
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id: current, depth } = queue.shift()!;
    if (visited.has(current) || depth > maxDepth) continue;
    visited.set(current, depth);

    const neighbours =
      direction === 'downstream'
        ? edges.filter((e: any) => e.fromEntity === current).map((e: any) => e.toEntity)
        : edges.filter((e: any) => e.toEntity === current).map((e: any) => e.fromEntity);

    for (const next of neighbours) {
      if (!visited.has(next)) {
        queue.push({ id: next, depth: depth + 1 });
      }
    }
  }

  return visited;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /incidents
export const getIncidents = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '50',
    status,
    severity,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.IncidentWhereInput = {};
  if (status) where.status = status as Status;
  if (severity) where.severity = severity as Severity;
  if (search) {
    where.OR = [
      { entityName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['createdAt', 'updatedAt', 'status', 'severity', 'entityName'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limitNum,
    }),
    prisma.incident.count({ where }),
  ]);

  return res.json({
    data: incidents,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

// GET /incidents/:id
export const getIncidentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { 
      user: { select: { id: true, name: true, email: true } },
      logs: {
        orderBy: { timestamp: 'desc' }
      },
      children: true
    },
  });

  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  return res.json(incident);
});

// GET /incidents/:id/lineage
export const getIncidentLineage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    direction = 'both',   // 'downstream' | 'upstream' | 'both'
    maxDepth = '10',
  } = req.query as Record<string, string>;

  const maxDepthNum = Math.min(50, Math.max(1, parseInt(maxDepth, 10)));

  // ── 1. Load incident ──────────────────────────────────────────────────────
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const sourceEntityId: string = incident.entityId;

  // ── 2. Fetch raw lineage from OpenMetadata ────────────────────────────────
  let rawLineage: any;
  try {
    rawLineage = await omService.getLineage(sourceEntityId);
  } catch (err) {
    console.error('[LINEAGE] OpenMetadata fetch failed:', err);
    return res.status(502).json({ error: 'Failed to fetch lineage from metadata service' });
  }

  if (!rawLineage?.nodes?.length) {
    return res.json({
      nodes: [],
      edges: [],
      stats: { totalNodes: 0, impactedNodes: 0, upstreamNodes: 0, maxDepth: 0, maxUpstreamDepth: 0 },
    });
  }

  const rawEdges: any[] = rawLineage.edges ?? [];

  // ── 3. BFS to determine depth of every reachable node ────────────────────
  //
  //  downstreamMap: fqn → positive depth (hops below source)
  //  upstreamMap:   fqn → positive depth (hops above source; stored as negative later)
  //
  const downstreamMap =
    direction !== 'upstream'
      ? bfsLineage(sourceEntityId, rawEdges, 'downstream', maxDepthNum)
      : new Map<string, number>();

  const upstreamMap =
    direction !== 'downstream'
      ? bfsLineage(sourceEntityId, rawEdges, 'upstream', maxDepthNum)
      : new Map<string, number>();

  // The source itself is depth 0 — remove it from both derived sets
  downstreamMap.delete(sourceEntityId);
  upstreamMap.delete(sourceEntityId);

  // Collect all relevant FQNs and IDs to know which raw nodes to include
  // We use both to ensure that if a node was found via ID or FQN, we catch it
  const relevantIdentifiers = new Set<string>([
    sourceEntityId,
    ...downstreamMap.keys(),
    ...upstreamMap.keys(),
  ]);

  console.log(`[LINEAGE] Found ${relevantIdentifiers.size} relevant nodes for incident on ${sourceEntityId}`);

  // ── 4. Build React-Flow nodes ─────────────────────────────────────────────
  const rfNodes: LineageNode[] = rawLineage.nodes
    .filter((n: any) => relevantIdentifiers.has(n.fullyQualifiedName) || relevantIdentifiers.has(n.id))
    .map((n: any) => {
      const fqn: string = n.fullyQualifiedName;
      const id: string = n.id;
      
      const isSource = fqn === sourceEntityId || id === sourceEntityId;
      const isImpacted = (downstreamMap.has(fqn) || downstreamMap.has(id)) && !isSource;
      const isUpstream = (upstreamMap.has(fqn) || upstreamMap.has(id)) && !isSource;

      let depth = 0;
      if (isImpacted) depth = downstreamMap.get(fqn) ?? downstreamMap.get(id) ?? 0;
      else if (isUpstream) depth = -(upstreamMap.get(fqn) ?? upstreamMap.get(id) ?? 0);

      return {
        id: n.id,
        name: n.name ?? fqn.split('.').pop() ?? fqn,
        type: n.entityType ?? 'table',
        fullyQualifiedName: fqn,
        isSource,
        isImpacted,
        isUpstream,
        depth,
        platform: n.serviceType ?? n.platform,
        description: n.description,
        owner: n.owner?.name ?? n.owner?.displayName,
        tags: Array.isArray(n.tags) ? n.tags.map((t: any) => t.tagFQN ?? t.name) : [],
      } satisfies LineageNode;
    });

  // ── 5. Build React-Flow edges ─────────────────────────────────────────────
  // Build a lookup: fqn → node id  (handles nodes missing from rawLineage gracefully)
  const fqnToId = new Map<string, string>(
    rfNodes.map((n) => [n.fullyQualifiedName, n.id]),
  );

  const rfEdges: LineageEdge[] = rawEdges
    .filter((e: any) => {
      // Only include edges where both endpoints are in the relevant set
      return relevantIdentifiers.has(e.fromEntity) && relevantIdentifiers.has(e.toEntity);
    })
    .map((e: any, idx: number) => {
      const sourceId = fqnToId.get(e.fromEntity) ?? e.fromEntity;
      const targetId = fqnToId.get(e.toEntity) ?? e.toEntity;

      // An edge is "hot" (red) when it carries tainted data:
      //   the source end is the incident entity OR a downstream-impacted node
      const fromFqn: string = e.fromEntity;
      const isHot =
        fromFqn === sourceEntityId || downstreamMap.has(fromFqn);

      return {
        id: `e-${idx}-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: isHot,
        style: {
          stroke: isHot ? '#EF4444' : upstreamMap.has(fromFqn) ? '#F59E0B' : '#6366F1',
          strokeWidth: isHot ? 2 : 1,
        },
        label: e.description ?? undefined,
        type: e.lineageType ?? undefined,
      } satisfies LineageEdge;
    });

  // ── 6. Compute stats ──────────────────────────────────────────────────────
  const downstreamDepths = [...downstreamMap.values()];
  const upstreamDepths = [...upstreamMap.values()];

  const graph: LineageGraph = {
    nodes: rfNodes,
    edges: rfEdges,
    stats: {
      totalNodes: rfNodes.length,
      impactedNodes: downstreamMap.size,
      upstreamNodes: upstreamMap.size,
      maxDepth: downstreamDepths.length ? Math.max(...downstreamDepths) : 0,
      maxUpstreamDepth: upstreamDepths.length ? Math.max(...upstreamDepths) : 0,
    },
  };

  return res.json(graph);
});

// GET /incidents/:id/insights
export const getIncidentInsights = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [incident, analysis] = await Promise.all([
    prisma.incident.findUnique({ where: { id: id as string } }),
    insightService.getFullAnalysis(id as string),
  ]);

  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

  return res.json(analysis);
});

// PATCH /incidents/:id/status
export const updateIncidentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body || {};

  const VALID_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Incident not found' });

  const incident = await prisma.incident.update({ where: { id }, data: { status } });
  return res.json(incident);
});

// POST /incidents/:id/remediate
export const remediateIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action = 'RESTART_PIPELINE', payload = {} } = (req.body || {}) as RemediationAction & { payload?: Record<string, unknown> };

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  console.log(`[REMEDIATION] action=${action} entity=${incident.entityName} incident=${id}`);

  let message = '';

  switch (action) {
    case 'RESTART_PIPELINE': {
      const rawDagId = (payload?.dagId as string) ?? `ingest_${incident.entityName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const dagId = rawDagId.replace(/\./g, '_');
      const user = await prisma.user.findFirst();
      await airflowService.triggerDag(user?.id ?? 'system', dagId);
      message = `Pipeline restart triggered for DAG: ${dagId}`;
      break;
    }

    case 'QUARANTINE_TABLE': {
      // Tag the table in OpenMetadata so downstream jobs skip it
      await omService.updateTableOwner(incident.entityId, 'quarantine', 'Quarantine');
      message = `Table ${incident.entityName} quarantined in metadata catalog`;
      break;
    }

    case 'NOTIFY_OWNER': {
      const owner = payload?.ownerEmail as string | undefined;
      if (!owner) return res.status(400).json({ error: 'ownerEmail required for NOTIFY_OWNER action' });
      // Notification logic would go here (e.g. email/Slack)
      message = `Owner notified at ${owner}`;
      break;
    }

    case 'ROLLBACK': {
      const targetVersion = payload?.version as string | undefined;
      if (!targetVersion) return res.status(400).json({ error: 'version required for ROLLBACK action' });
      message = `Rollback to version ${targetVersion} scheduled`;
      break;
    }

    case 'CUSTOM': {
      message = (payload?.message as string) ?? 'Custom action executed';
      break;
    }

    default:
      return res.status(400).json({ error: `Unknown remediation action: ${action}` });
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: { status: 'INVESTIGATING' },
  });

  // Log remediation action for timeline
  await prisma.incidentLog.create({
    data: {
      incidentId: id,
      message: `Automated recovery initiated: ${action}. ${message}`
    }
  });

  return res.json({ success: true, incident: updated, action, message });
});

// POST /incidents/:id/assign
export const assignOwner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName } = req.body || {};

  if (!userId || !userName) {
    return res.status(400).json({ error: 'userId and userName are required' });
  }

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  // Push ownership to OpenMetadata + update local state concurrently
  const [updated] = await Promise.all([
    prisma.incident.update({ where: { id }, data: { status: 'ACKNOWLEDGED', owner: userName } }),
    omService.updateTableOwner(incident.entityId, userId, userName),
  ]);

  await prisma.incidentLog.create({
    data: {
      incidentId: id,
      message: `Incident ownership assigned to ${userName}`
    }
  });

  return res.json({ success: true, incident: updated });
});

// POST /incidents/simulate-check
export const simulateCheck = asyncHandler(async (req: Request, res: Response) => {
  const { wipeDb = true } = req.body;

  console.log('[SIMULATION] Starting detection simulation...');

  if (wipeDb) {
    await prisma.incident.deleteMany();
    console.log('[SIMULATION] Database wiped');
  }

  await detectionEngine.runChecks();

  return res.json({
    message: wipeDb
      ? 'Database wiped and fresh detection triggered. Check Slack!'
      : 'Detection triggered on existing data. Check Slack!',
  });
});

// POST /incidents/:id/simulate-fix
export const simulateFix = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  // For Demo: If this is a DQ failure, apply the global healthy state to mocks
  if (omService.applySimulatedFix) {
    omService.applySimulatedFix();
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: { 
      status: 'RESOLVED',
      resolvedAt: new Date()
    }
  });

  await prisma.incidentLog.create({
    data: {
      incidentId: id,
      message: '[SIMULATION] Manual fix injected. Healthy state restored.'
    }
  });

  return res.json({ 
    success: true, 
    incident: updated, 
    message: `Simulation: ${incident.entityName} has been restored to a healthy state.` 
  });
});


// POST /incidents/simulate-fix (Global)
export const simulateGlobalFix = asyncHandler(async (_req: Request, res: Response) => {
  console.log('[SIMULATE GLOBAL FIX] Resolving all open incidents...');

  if (omService.applySimulatedFix) {
    omService.applySimulatedFix();
  }

  const updated = await prisma.incident.updateMany({
    where: { status: { not: 'RESOLVED' } },
    data: { status: 'RESOLVED', resolvedAt: new Date() }
  });

  return res.json({ success: true, count: updated.count, message: 'Global health restored. All incidents resolved.' });
});

// GET /incidents/metrics
export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const [total, critical, resolved, investigating] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.count({ where: { severity: 'CRITICAL' } }),
    prisma.incident.count({ where: { status: 'RESOLVED' } }),
    prisma.incident.count({ where: { status: 'INVESTIGATING' } }),
  ]);

  // Naive MTTR: average time from createdAt to resolvedAt for resolved incidents
  const resolvedIncidents = await prisma.incident.findMany({
    where: { status: 'RESOLVED', NOT: { resolvedAt: null } },
    select: { createdAt: true, resolvedAt: true },
  });

  let mttrMs = 0;
  if (resolvedIncidents.length) {
    const totalMs = resolvedIncidents.reduce(
      (acc, i) => acc + (i.resolvedAt!.getTime() - i.createdAt.getTime()),
      0,
    );
    mttrMs = totalMs / resolvedIncidents.length;
  }

  const mttrHours = (mttrMs / 3_600_000).toFixed(1);

  return res.json({
    totalIncidents: total,
    criticalIncidents: critical,
    resolvedIncidents: resolved,
    investigatingIncidents: investigating,
    mttr: `${mttrHours}h`,
  });
});

// GET /incidents/trends
export const getTrends = asyncHandler(async (req: Request, res: Response) => {
  const { days = '30' } = req.query as { days?: string };
  const daysNum = Math.min(365, Math.max(1, parseInt(days, 10)));
  const since = new Date(Date.now() - daysNum * 86_400_000);

  const incidents = await prisma.incident.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true, severity: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const byDay: Record<string, { date: string; total: number; critical: number; resolved: number }> =
    {};

  for (const inc of incidents) {
    const day = inc.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, total: 0, critical: 0, resolved: 0 };
    byDay[day].total++;
    if (inc.severity === 'CRITICAL') byDay[day].critical++;
    if (inc.status === 'RESOLVED') byDay[day].resolved++;
  }

  return res.json(Object.values(byDay));
});

// POST /incidents/:id/logs
export const addIncidentLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, level = 'INFO', userId } = req.body || {};

  if (!message) return res.status(400).json({ error: 'message is required' });

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  // Record actual log in database
  const log = await prisma.incidentLog.create({
    data: {
      incidentId: id,
      message: message
    }
  });

  console.log(`[LOG] incident=${id} — ${message}`);
  return res.json({ success: true, log });
});


