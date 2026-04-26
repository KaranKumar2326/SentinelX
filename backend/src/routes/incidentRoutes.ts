import { Router } from 'express';
import * as incidentController from '../controllers/incidentController';

const router = Router();

router.get('/', incidentController.getIncidents);
router.get('/metrics', incidentController.getMetrics);
router.get('/trends', incidentController.getTrends);
router.get('/:id', incidentController.getIncidentById);
router.get('/:id/lineage', incidentController.getIncidentLineage);
router.get('/:id/insights', incidentController.getIncidentInsights);
router.post('/:id/remediate', incidentController.remediateIncident);
router.post('/:id/owner', incidentController.assignOwner);
router.post('/:id/logs', incidentController.addIncidentLog);
router.patch('/:id', incidentController.updateIncidentStatus);
router.post('/simulate', incidentController.simulateCheck);
router.post('/simulate-fix', incidentController.simulateGlobalFix);
router.post('/:id/simulate-fix', incidentController.simulateFix);

export default router;
