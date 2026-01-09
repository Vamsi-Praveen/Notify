import { Router } from 'express';
import { ingestEvent } from '../controllers/api.controller.js';
import { authenticateApi, requireScope } from '../middlewares/apiAuth.middleware.js';
import { validateOrigin } from '../middlewares/cors.middleware.js';
import { uploadFileHandler } from '../controllers/files.controller.js';
import pushRouter from './push.routes.js';
import inboxRouter from './inbox.routes.js';
import trackingRouter from './tracking.routes.js';

const apiRouter = Router();

apiRouter.post(
  '/notify',
  authenticateApi,
  validateOrigin,
  requireScope('event:write'),
  ingestEvent
);

apiRouter.post(
  '/files/upload',
  authenticateApi,
  validateOrigin,
  requireScope('files:upload'),
  uploadFileHandler
);

apiRouter.use('/inbox', inboxRouter);
apiRouter.use('/tracking', trackingRouter);
apiRouter.use('/devices', pushRouter);

export default apiRouter;
