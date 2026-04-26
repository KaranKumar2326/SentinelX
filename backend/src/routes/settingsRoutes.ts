import { Router } from 'express';
import { getSettings, saveSettings, testConnection } from '../controllers/settingsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getSettings);
router.put('/', saveSettings);
router.post('/test-connection', testConnection);

export default router;
