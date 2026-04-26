import { Request, Response } from 'express';
import { detectionEngine } from '../services/detectionEngine';

export const handleOpenMetadataEvent = async (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log(`[WEBHOOK] Received event from OpenMetadata: ${event.eventType} for ${event.entityType}`);

    // If it's a Data Quality test failure or an entity update, trigger immediate re-scan
    if (
        event.entityType === 'testCase' || 
        event.entityType === 'table' || 
        event.eventType === 'entityUpdated'
    ) {
      console.log(`[WEBHOOK] Critical change detected. Triggering immediate detection run...`);
      // We run the detection engine specifically for the updated entity soon
      // For now, we trigger a global check to ensure consistency
      await detectionEngine.runChecks();
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
