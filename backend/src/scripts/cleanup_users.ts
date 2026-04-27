import { prisma } from '../services/prisma';

async function main() {
  await prisma.user.deleteMany({
    where: {
      email: { in: ['admin@example.com', 'demo@sentinelx.ai'] }
    }
  });
  console.log('Cleaned up fake users for demo.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
