import { prisma } from '../services/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DATABASE ---');
  users.forEach(u => console.log(`- ${u.email}`));
  console.log('-------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
