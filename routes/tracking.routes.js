import { Router } from 'express';
import { trackEmailOpen } from '../controllers/tracking.controller.js';

const trackRouter = Router();

trackRouter.get('/:logId/pixel.png', trackEmailOpen);

export default trackRouter;
