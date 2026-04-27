import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const incidents = await prisma.incident.findMany({ take: 5 });
  console.log(JSON.stringify(incidents, null, 2));
  process.exit(0);
}
check();
