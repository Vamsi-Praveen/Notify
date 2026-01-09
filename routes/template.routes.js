import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  getTemplateById,
  renderTemplatePreview,
  updateTemplate,
} from '../controllers/template.controller.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const templateRouter = Router();

// Apply admin auth
templateRouter.use(adminAuth);

templateRouter.post('/', createTemplate);
templateRouter.get('/', getAllTemplates);
templateRouter.get('/:id', getTemplateById);
templateRouter.put('/:id', updateTemplate);
templateRouter.delete('/:id', deleteTemplate);
templateRouter.post('/preview', renderTemplatePreview);

export default templateRouter;
