import { Router } from 'express';
import { getApps, createApp, updateApp, deleteApp } from '../controllers/pushApp.controller.js';
import { protect } from '../middleware/auth.js'; // Assuming standard auth middleware

const router = Router();

router.use(protect); // Ensure all routes are protected

router.get('/', getApps);
router.post('/', createApp);
router.put('/:id', updateApp);
router.delete('/:id', deleteApp);

export default router;
