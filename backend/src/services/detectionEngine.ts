import cron from 'node-cron';
import { omService } from './openMetadataService';
import { prisma } from './prisma';
import { notifyIncident, io } from '../index';
import { IncidentType, Severity, Status } from '@prisma/client';
import { alertService } from './alertService';

export class DetectionEngine {
  private pollInterval: string;

  constructor() {
    this.pollInterval = process.env.DETECTION_POLL_INTERVAL || '*/5 * * * *'; // Default 5 mins
  }

  start() {
    console.log('Incident Detection Engine started...');
    cron.schedule(this.pollInterval, () => this.runChecks());
  }

  async runChecks() {
    console.log('Running data incident checks...');
    try {
      await this.checkDataQuality();
      await this.checkOwnership();
      await this.checkStaleData();
      await this.autoResolveIncidents(); // Healing pass – must run AFTER detection
    } catch (error) {
      console.error('Error running detection engine checks:', error);
    }
  }

  private async checkDataQuality() {
    const testCases = await omService.getTestCases();
    for (const test of testCases) {
      const status = test.testCaseResult?.testCaseStatus;
      const tableFqn = test.entityLink?.split('::')[2]?.replace('>', '') || 'unknown_table';
      
      if (status === 'Failed') {
        await this.createIncident({
          type: IncidentType.DQ_FAILURE,
          severity: Severity.HIGH,
          entityId: tableFqn,
          entityName: test.name,
          entityType: 'testCase',
          description: `Data Quality test '${test.name}' failed on table '${tableFqn}'.`
        });
      }
    }
  }

  private async checkOwnership() {
    const tables = await omService.getTables();
    for (const table of tables) {
      const ownerInfo = (table.owners && table.owners.length > 0) ? table.owners[0] : table.owner;
      if (!ownerInfo) {
        await this.createIncident({
          type: IncidentType.MISSING_OWNER,
          severity: Severity.MEDIUM,
          entityId: table.fullyQualifiedName,
          entityName: table.name,
          entityType: 'table',
          description: `Table '${table.name}' has no registered owner in OpenMetadata.`
        });
      }
    }
  }

  private async checkStaleData() {
    const tables = await omService.getTables();
    const STALE_THRESHOLD_HOURS = parseInt(process.env.STALE_THRESHOLD_HOURS || '24');
    
    for (const table of tables) {
      const lastUpdate = new Date(table.updatedAt);
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate > STALE_THRESHOLD_HOURS) {
        await this.createIncident({
          type: IncidentType.STALE_DATA,
          severity: Severity.HIGH,
          entityId: table.fullyQualifiedName,
          entityName: table.name,
          entityType: 'table',
          description: `Data in table '${table.name}' has not been updated in over ${STALE_THRESHOLD_HOURS} hours.`
        });
      }
    }
  }

  private async createIncident(data: any, parentId?: string) {
    // Check if an open incident already exists for this entity and type
    const existing = await prisma.incident.findFirst({
      where: {
        entityId: data.entityId,
        type: data.type,
        status: { in: [Status.OPEN, Status.INVESTIGATING] }
      }
    });

    if (existing) return existing;

    const incident = await prisma.incident.create({
      data: {
        ...data,
        parentId: parentId || null,
        status: Status.OPEN
      }
    });

    console.log(`[INCIDENT CREATED] ${incident.type} on ${incident.entityName} ${parentId ? '(Linked to ' + parentId + ')' : ''}`);
    notifyIncident(incident);
    alertService.sendIncidentAlert(incident);

    // If it's a primary DQ failure, propagate to downstream nodes as linked incidents
    if (incident.type === IncidentType.DQ_FAILURE && !parentId) {
        setImmediate(() => this.propagateLineageFailure(incident).catch(console.error));
    }
    
    return incident;
  }

  /**
   * Auto-Resolution / Healing Engine
   * Cross-references every open/investigating incident against the latest
   * OpenMetadata telemetry. When the underlying issue is fixed, automatically
   * resolves the incident and notifies connected clients in real-time.
   */
  async autoResolveIncidents() {
    const openIncidents = await prisma.incident.findMany({
      where: { status: { in: [Status.OPEN, Status.INVESTIGATING] } }
    });
    if (!openIncidents.length) return;

    const [tables, testCases] = await Promise.all([
      omService.getTables(),
      omService.getTestCases()
    ]);
    const STALE_THRESHOLD_HOURS = parseInt(process.env.STALE_THRESHOLD_HOURS || '24');

    for (const incident of openIncidents) {
      let shouldResolve = false;

      if (incident.type === IncidentType.DQ_FAILURE) {
        // Check if the failing test is now passing
        const matchingTest = testCases.find((t: any) => {
          const fqn = t.entityLink?.split('::')[2]?.replace('>', '') || '';
          return (fqn === incident.entityId || t.name === incident.entityName);
        });
        if (matchingTest && matchingTest.testCaseResult?.testCaseStatus === 'Success') {
          shouldResolve = true;
        }
      }

      if (incident.type === IncidentType.MISSING_OWNER) {
        const table = tables.find((t: any) => t.fullyQualifiedName === incident.entityId);
        const ownerInfo = table && ((table.owners && table.owners.length > 0) ? table.owners[0] : table.owner);
        if (ownerInfo) {
          shouldResolve = true;
        }
      }

      if (incident.type === IncidentType.STALE_DATA) {
        const table = tables.find((t: any) => t.fullyQualifiedName === incident.entityId);
        if (table) {
          const hoursSinceUpdate = (Date.now() - new Date(table.updatedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate <= STALE_THRESHOLD_HOURS) {
            shouldResolve = true;
          }
        }
      }

      if (incident.type === IncidentType.LINEAGE_BREAK) {
        // Precise healing: Resolve if the specific parent that caused this is now resolved
        if (incident.parentId) {
            const parent = await prisma.incident.findUnique({ where: { id: incident.parentId } });
            if (!parent || parent.status === Status.RESOLVED) {
                shouldResolve = true;
            }
        } else {
            // Fallback: resolve if no open DQ_FAILURE exists (system wide cleanup)
            const anyOpenDQFailure = openIncidents.some(i => i.type === IncidentType.DQ_FAILURE && i.id !== incident.id);
            if (!anyOpenDQFailure) shouldResolve = true;
        }
      }

      if (shouldResolve) {
        await prisma.incident.update({
          where: { id: incident.id },
          data: { status: Status.RESOLVED, resolvedAt: new Date() }
        });
        const resolvedMsg = `[AUTO-RESOLVED] Incident '${incident.type}' on '${incident.entityName}' — healthy state detected.`;
        console.log(resolvedMsg);
        // Emit real-time update to dashboard
        io.emit('incident_resolved', { id: incident.id, entityName: incident.entityName, type: incident.type });
      }
    }
  }

  private async propagateLineageFailure(sourceIncident: any) {
      console.log(`Analyzing root cause propagation for: ${sourceIncident.entityId}`);
      try {
          const lineage = await omService.getLineage(sourceIncident.entityId);
          if (!lineage || !lineage.nodes || !lineage.edges) return;
          
          // Edges now use FQNs (Fully Qualified Names) as the source of truth
          const sourceFqn = sourceIncident.entityId;
          
          // Find all immediate downstream nodes from the source FQN
          const affectedFqns = lineage.edges
            .filter((e: any) => e.fromEntity === sourceFqn)
            .map((e: any) => e.toEntity);
          
          for (const targetFqn of affectedFqns) {
              const node = lineage.nodes.find((n: any) => n.fullyQualifiedName === targetFqn);
              if (node && node.fullyQualifiedName !== sourceFqn) {
                  await this.createIncident({
                      type: IncidentType.LINEAGE_BREAK,
                      severity: Severity.CRITICAL,
                      entityId: node.fullyQualifiedName,
                      entityName: node.name,
                      entityType: node.entityType || 'table',
                      description: `Critical: Cascading failure caused by upstream incident on '${sourceIncident.entityName}'.`
                  }, sourceIncident.id);
              }
          }
      } catch (err) {
          console.error('Failed to propagate lineage failure:', err);
      }
  }
}

export const detectionEngine = new DetectionEngine();
