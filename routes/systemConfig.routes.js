import { Router } from 'express';
import { getSystemConfig, updateSystemConfig } from '../controllers/systemConfig.controller.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const systemConfigRouter = Router();

systemConfigRouter.use(adminAuth);

systemConfigRouter.get('/', getSystemConfig);
systemConfigRouter.put('/', updateSystemConfig);

export default systemConfigRouter;
