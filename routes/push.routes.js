import { Router } from 'express';
import { deregisterDevice, registerDevice } from '../controllers/pushnotification.controller.js';

const pushRouter = Router();

pushRouter.post('/register', registerDevice);
pushRouter.post('/deregister', deregisterDevice);

export default pushRouter;
