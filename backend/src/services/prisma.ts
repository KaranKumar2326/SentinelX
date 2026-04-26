import { PrismaClient, IncidentType, Severity, Status } from '@prisma/client';

// Mock Storage for Hackathon Demo when DB is not available
class MockPrisma {
  private incidents: any[] = [];
  private logs: any[] = [];

  incident = {
    findMany: async (args: any) => {
      let filtered = [...this.incidents];
      if (args?.where?.status) filtered = filtered.filter(i => i.status === args.where.status);
      if (args?.where?.severity) filtered = filtered.filter(i => i.severity === args.where.severity);
      return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    findUnique: async (args: any) => this.incidents.find(i => i.id === args.where.id),
    findFirst: async (args: any) => this.incidents.find(i => i.entityId === args.where.entityId && i.type === args.where.type),
    create: async (args: any) => {
      const newIncident = {
        id: Math.random().toString(36).substr(2, 9),
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.incidents.push(newIncident);
      return newIncident;
    },
    update: async (args: any) => {
      const idx = this.incidents.findIndex(i => i.id === args.where.id);
      if (idx === -1) throw new Error('Not found');
      this.incidents[idx] = { ...this.incidents[idx], ...args.data };
      return this.incidents[idx];
    },
    count: async (args: any) => {
      if (!args?.where) return this.incidents.length;
      if (args.where.status) return this.incidents.filter(i => i.status === args.where.status).length;
      if (args.where.severity) return this.incidents.filter(i => i.severity === args.where.severity).length;
      return this.incidents.length;
    },
    deleteMany: async () => { this.incidents = []; }
  };

  incidentLog = {
    create: async (args: any) => {
      const log = { id: Math.random().toString(36), ...args.data, timestamp: new Date() };
      this.logs.push(log);
      return log;
    },
    deleteMany: async () => { this.logs = []; }
  };
}

let prisma: any;
const isSimulation = process.env.SIMULATION_MODE === 'true';

if (isSimulation) {
  console.log('--- RUNNING IN SIMULATION MODE WITH MOCK STORAGE ---');
  prisma = new MockPrisma();
} else {
  try {
    prisma = new PrismaClient();
  } catch (e) {
    console.error('Failed to connect to Prisma, falling back to mock storage.');
    prisma = new MockPrisma();
  }
}

export { prisma };
