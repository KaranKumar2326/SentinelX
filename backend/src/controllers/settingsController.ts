import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export const getSettings = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { omUrl: true, omConnected: true, omToken: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    omUrl: user.omUrl || '',
    omConnected: user.omConnected,
    omToken: user.omToken ? '***' + user.omToken.slice(-4) : '' // masked
  });
};

export const saveSettings = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { omUrl, omToken } = req.body;

  await prisma.user.update({
    where: { id: userId },
    data: { omUrl, omToken, omConnected: false } // Reset connected until tested
  });

  res.json({ message: 'Settings saved. Test your connection to verify.' });
};

export const testConnection = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { omUrl, omToken } = req.body;

  try {
    const url = omUrl.replace(/\/$/, '');
    const response = await axios.get(`${url}/api/v1/system/version`, {
      headers: { Authorization: `Bearer ${omToken}` },
      timeout: 8000
    });

    // Save as connected
    await prisma.user.update({
      where: { id: userId },
      data: { omUrl, omToken, omConnected: true }
    });

    res.json({
      success: true,
      version: response.data?.version || 'Unknown',
      message: `✅ Connected to OpenMetadata successfully!`
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: `❌ Connection failed: ${error.response?.status === 401 ? 'Invalid token' : error.message}`
    });
  }
};
