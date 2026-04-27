import { prisma } from './prisma';
import { omService } from './openMetadataService';
import { aiService } from './aiService';
import { IncidentType } from '@prisma/client';

export class InsightService {
  /**
   * Calculates real business impact based on OpenMetadata Usage telemetry.
   */
  async getBusinessImpact(incidentId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return null;

    console.time(`[INSIGHTS] impact:${incidentId}`);
    const [lineage, tables] = await Promise.all([
      omService.getLineage(incident.entityId),
      omService.getTables()
    ]);
    console.timeEnd(`[INSIGHTS] impact:${incidentId}`);
    
    if (!lineage || !lineage.nodes) {
      console.log(`[INSIGHTS] No lineage found for ${incident.entityName}. Impact minimized.`);
      return { affectedAssets: 0, queryImpact24h: 0, estimatedUsers: 0, severityScore: 'LOW' };
    }
    
    const edges = lineage.edges || [];
    const downstreamIds = edges
      .filter((e: any) => e.fromEntity === incident.entityId || e.fromEntity === '1') 
      .map((e: any) => e.toEntity);

    let totalQueries = 0;
    let affectedUsers = 0;

    for (const nodeId of downstreamIds) {
      const node = lineage.nodes.find((n: any) => n.id === nodeId);
      if (node) {
        const tableMeta = tables.find((t: any) => t.fullyQualifiedName === node.fullyQualifiedName);
        if (tableMeta?.usageSummary) {
          totalQueries += tableMeta.usageSummary.dailyStats?.count || 0;
          affectedUsers += Math.ceil((tableMeta.usageSummary.dailyStats?.count || 0) / 5);
        }
      }
    }

    return {
      affectedAssets: downstreamIds.length,
      queryImpact24h: totalQueries,
      estimatedUsers: affectedUsers,
      severityScore: totalQueries > 100 ? 'CRITICAL' : 'HIGH'
    };
  }

  /**
   * Performs a Generative AI diagnosis using Groq/Llama 3.3.
   */
  async getFullAnalysis(incidentId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return null;

    const impact = await this.getBusinessImpact(incidentId);

    // Safe defaults if OM has no lineage yet
    const safeImpact = impact || { affectedAssets: 0, queryImpact24h: 0, estimatedUsers: 0, severityScore: 'UNKNOWN' };

    // Call Groq for real AI analysis
    const aiAnalysis = await aiService.analyzeIncident({
      type: incident.type,
      entityName: incident.entityName,
      description: incident.description,
      impact: safeImpact
    });

    return {
      diagnosis: aiAnalysis.diagnosis,
      suggestedFix: aiAnalysis.suggestedFix,
      impact: safeImpact
    };
  }
}

export const insightService = new InsightService();
