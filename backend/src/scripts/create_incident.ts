import { prisma } from '../services/prisma';
import { IncidentType, Severity, Status } from '@prisma/client';

async function main() {
  const incident = await prisma.incident.create({
    data: {
      type: IncidentType.DQ_FAILURE,
      severity: Severity.CRITICAL,
      entityId: 'SentinelX_Demo_DB.ecommerce.raw.user_orders',
      entityName: 'user_orders_dq_failure',
      entityType: 'table',
      description: 'Critical data quality degradation: user_id null rate exceeded 10%.',
      status: Status.OPEN
    }
  });
  console.log('Successfully created manual incident:', incident.id);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
