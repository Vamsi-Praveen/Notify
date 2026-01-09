import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
} from '../controllers/workflow.controller.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const workflowRouter = Router();

// Apply authentication middleware to all workflow routes
workflowRouter.use(adminAuth);

workflowRouter.post('/', createWorkflow);
workflowRouter.get('/', getAllWorkflows);
workflowRouter.get('/:id', getWorkflowById);
workflowRouter.put('/:id', updateWorkflow);
workflowRouter.delete('/:id', deleteWorkflow);

export default workflowRouter;
