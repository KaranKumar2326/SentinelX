import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
    });
    
    // Attach user info to request
    (req as any).user = {
      userId: verified.sub,
      email: (verified as any).email || ""
    };
    
    next();
  } catch (error: any) {
    console.error('[AUTH] Clerk verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
