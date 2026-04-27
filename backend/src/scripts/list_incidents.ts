import { prisma } from '../services/prisma';

async function main() {
  const count = await prisma.incident.count();
  console.log(`Total incidents: ${count}`);

  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('Recent incidents:');
  incidents.forEach(inc => {
    console.log(`- [${inc.status}] ${inc.type} on ${inc.entityName} (ID: ${inc.id}, entityId: ${inc.entityId})`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
