import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../services/prisma';

async function main() {
  const url = process.env.AIRFLOW_URL;
  const token = process.env.AIRFLOW_API_TOKEN;

  if (!url || !token) {
    throw new Error('AIRFLOW_URL and AIRFLOW_API_TOKEN must be set in .env');
  }
  
  // Update or create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@sentinelx.ai' },
    update: {
      airflowUrl: url,
      airflowUser: 'token',
      airflowPass: token
    },
    create: {
      email: 'demo@sentinelx.ai',
      name: 'Demo Admin',
      password: 'demopassword123',
      airflowUrl: url,
      airflowUser: 'token',
      airflowPass: token
    }
  });

  console.log('Successfully updated Airflow credentials for user:', user.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
