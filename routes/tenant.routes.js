import { Router } from 'express';
import * as tenantController from '../controllers/tenant.controller.js';

const router = Router();

router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.post('/', tenantController.createTenant);
router.put('/:id', tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);

export default router;
