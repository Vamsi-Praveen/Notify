import { Router } from 'express';
import {
  getAllApiKeys,
  createApiKey,
  revokeApiKey,
  updateApiKey,
} from '../controllers/apiKey.controller.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const apiKeyRouter = Router();

apiKeyRouter.use(adminAuth);

apiKeyRouter.get('/', getAllApiKeys);
apiKeyRouter.post('/', createApiKey);
apiKeyRouter.put('/:id', updateApiKey);
apiKeyRouter.put('/:id/revoke', revokeApiKey);

export default apiKeyRouter;
