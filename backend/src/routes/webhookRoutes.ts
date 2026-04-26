import { Router } from 'express';
import { handleOpenMetadataEvent } from '../controllers/webhookController';

const router = Router();

// Endpoint for OpenMetadata Event Publisher
// You will configure this in OM UI -> Settings -> Webhooks
router.post('/openmetadata', handleOpenMetadataEvent);

export default router;
