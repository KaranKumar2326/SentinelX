import { Router } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { time: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalCount = await prisma.notificationLog.count();
    const successCount = await prisma.notificationLog.count({ where: { status: 'Delivered' } });
    const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(1) : '100.0';
    
    // Simple count of unique channels
    const channels = await prisma.notificationLog.groupBy({
      by: ['channel']
    });

    res.json({
      total: totalCount,
      successRate: `${successRate}%`,
      activeChannels: channels.length || 2 // Default to Email/Slack if logs empty
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
});

export default router;
