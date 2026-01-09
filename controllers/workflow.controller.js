import Workflow from '../models/workflow.model.js';
import logger from '../utils/logger.js';
import { delCache, delCacheByPattern } from '../utils/cache.js';

export const createWorkflow = async (req, res) => {
  try {
    const {
      triggerEvent,
      actions,
      rules,
      active,
      priority,
      name,
      tenantId: bodyTenantId,
    } = req.body;

    const tenantId = bodyTenantId || (req.tenant ? req.tenant._id : null);
    // tenantId is optional for admins (Global workflows)
    const isAdmin = req.session && req.session.admin;
    if (!tenantId && !isAdmin) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    logger.info({ tenantId: tenantId || 'global', triggerEvent }, 'Creating new workflow');

    const workflow = new Workflow({
      tenantId,
      name,
      triggerEvent,
      actions,
      rules,
      active,
      active,
      priority,
    });

    // Sanitize actions to ensure empty integration is undefined (triggers auto-detect)
    if (workflow.actions && Array.isArray(workflow.actions)) {
      workflow.actions.forEach((action) => {
        if (!action.integration) {
          action.integration = undefined;
        }
      });
    }

    await workflow.save();

    const tenantIdKey = tenantId || 'global';
    await delCacheByPattern(`workflows:${tenantIdKey}:*`);

    logger.info({ tenantId, workflowId: workflow._id }, 'Workflow created successfully');

    return res.status(201).json(workflow);
  } catch (error) {
    logger.error({ err: error }, 'Error creating workflow');
    return res.status(500).json({ message: 'Error creating workflow' });
  }
};

export const getAllWorkflows = async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10), 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10), 1), 50);

    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    logger.info({ tenantId, page: pageNum, limit: limitNum }, 'Fetching workflows');

    let query = {};
    if (req.tenant) {
      query = { tenantId: req.tenant._id };
    } else if (isAdmin) {
      query = {};
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const workflows = await Workflow.find(query)
      .lean()
      .populate('actions.integration', 'name type')
      .populate('actions.template', 'name type')
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Workflow.countDocuments(query);

    logger.info({ tenantId, count: workflows.length, total }, 'Workflows fetched successfully');

    return res.status(200).json({
      workflows,
      currentPage: Number(pageNum),
      totalPages: Math.ceil(total / limitNum),
      totalWorkflows: total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching workflows');
    return res.status(500).json({ message: 'Error fetching workflows' });
  }
};

export const getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    logger.info({ tenantId, workflowId: id }, 'Fetching workflow by ID');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const workflow = await Workflow.findOne(query)
      .populate('actions.integration')
      .populate('actions.template');

    if (!workflow) {
      logger.warn({ tenantId, workflowId: id }, 'Workflow not found');
      return res.status(404).json({ message: 'Workflow not found' });
    }

    logger.info({ tenantId, workflowId: id }, 'Workflow fetched successfully');

    return res.status(200).json(workflow);
  } catch (error) {
    logger.error({ err: error, workflowId: req.params.id }, 'Error fetching workflow');
    return res.status(500).json({ message: 'Error fetching workflow' });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.session && req.session.admin;
    const {
      triggerEvent,
      actions,
      rules,
      active,
      priority,
      name,
      tenantId: bodyTenantId,
    } = req.body;

    const tenantId = bodyTenantId || (req.tenant ? req.tenant._id : null);

    logger.info({ tenantId, workflowId: id }, 'Updating workflow');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const originalWorkflow = await Workflow.findOne(query);
    if (!originalWorkflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Sanitize actions logic
    if (actions && Array.isArray(actions)) {
      actions.forEach((action) => {
        if (!action.integration) {
          action.integration = undefined;
        }
      });
    }

    const updatedWorkflow = await Workflow.findOneAndUpdate(
      query,
      { triggerEvent, actions, rules, active, priority, tenantId, name },
      { new: true }
    );

    if (originalWorkflow.triggerEvent) {
      const oldTenantIdKey = originalWorkflow.tenantId || 'global';
      await delCacheByPattern(`workflows:${oldTenantIdKey}:*`);
    }
    if (updatedWorkflow.triggerEvent) {
      const newTenantIdKey = updatedWorkflow.tenantId || 'global';
      await delCacheByPattern(`workflows:${newTenantIdKey}:*`);
    }

    logger.info({ tenantId, workflowId: id }, 'Workflow updated successfully');

    return res.status(200).json(updatedWorkflow);
  } catch (error) {
    logger.error({ err: error, workflowId: req.params.id }, 'Error updating workflow');
    return res.status(500).json({ message: 'Error updating workflow' });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    logger.info({ tenantId, workflowId: id }, 'Deleting workflow');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const workflow = await Workflow.findOneAndDelete(query);

    if (!workflow) {
      logger.warn({ tenantId, workflowId: id }, 'Workflow not found for deletion');
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.triggerEvent) {
      const tenantIdKey = workflow.tenantId || 'global';
      await delCacheByPattern(`workflows:${tenantIdKey}:*`);
    }

    logger.info({ tenantId, workflowId: id }, 'Workflow deleted successfully');

    return res.status(200).json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    logger.error({ err: error, workflowId: req.params.id }, 'Error deleting workflow');
    return res.status(500).json({ message: 'Error deleting workflow' });
  }
};
