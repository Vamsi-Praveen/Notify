import { Router } from 'express';
import { authenticateApi, requireScope } from '../middlewares/apiAuth.middleware.js';
import { validateOrigin } from '../middlewares/cors.middleware.js';
import { getMessages, markAsRead } from '../controllers/inbox.controller.js';

const inboxRouter = Router();

inboxRouter.use(authenticateApi);
inboxRouter.use(validateOrigin);

inboxRouter.get('/:userId', requireScope('inbox:read'), getMessages);

inboxRouter.patch('/:messageId/read', requireScope('inbox:write'), markAsRead);

export default inboxRouter;
