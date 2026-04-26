import { PrismaClient, IncidentType, Severity, Status } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Injecting DQ Failure...');
  // 1. Wipe existing boring missing owner incidents to clean up the dashboard
  await prisma.incident.deleteMany();

  // 2. Insert the critical DQ Failure
  const type = IncidentType.DQ_FAILURE;
  const severity = Severity.CRITICAL;
  
  const dqIncident = await prisma.incident.create({
    data: {
      type,
      severity,
      status: Status.OPEN,
      entityId: 'SentinelX_Demo_DB.ecommerce.raw.user_orders',
      entityName: 'user_orders',
      entityType: 'table',
      description: 'Data Quality test `row_count_too_low` failed on table `user_orders`. CRITICAL: Expected > 500 rows but found 0. Upstream ingestion pipeline has stopped.',
    }
  });

  console.log('DQ Incident created! ' + dqIncident.id);

  // 3. Trigger detection engine's native method to recursively create the LINEAGE_BREAK incidents so the dashboard highlights them in red!
  // Note: Since detection engine methods are sometimes private or don't expose propagateLineageFailure directly, we will just manually insert them for the demo.
  
  await prisma.incident.create({
    data: {
      type: IncidentType.LINEAGE_BREAK,
      severity: Severity.HIGH,
      status: Status.OPEN,
      entityId: 'SentinelX_Demo_DB.ecommerce.analytics.customer_metrics',
      entityName: 'customer_metrics',
      entityType: 'table',
      description: 'Cascading failure caused by upstream incident on user_orders.',
      parentId: dqIncident.id
    }
  });

  await prisma.incident.create({
    data: {
      type: IncidentType.LINEAGE_BREAK,
      severity: Severity.HIGH,
      status: Status.OPEN,
      entityId: 'SentinelX_Demo_DB.ecommerce.analytics.core_dashboard',
      entityName: 'core_dashboard',
      entityType: 'table',
      description: 'Cascading failure caused by upstream incident on user_orders.',
      parentId: dqIncident.id
    }
  });

  console.log('Cascading Lineage Breaks created! Done.');
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
