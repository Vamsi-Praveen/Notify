import { Router } from 'express';
import {
  getAllIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
} from '../controllers/integration.controller.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const integrationRouter = Router();

integrationRouter.use(adminAuth);

integrationRouter.get('/', getAllIntegrations);
integrationRouter.get('/:id', getIntegrationById);
integrationRouter.post('/', createIntegration);
integrationRouter.put('/:id', updateIntegration);
integrationRouter.delete('/:id', deleteIntegration);

export default integrationRouter;
