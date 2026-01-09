import Workflow from '../models/workflow.model.js';
import Template from '../models/template.model.js';
import Integration from '../models/integration.model.js';
import logger from '../utils/logger.js';
import { delCache } from '../utils/cache.js';

export const getWorkflows = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const workflows = await Workflow.find({ $or: [{ tenantId }, { tenantId: null }] })
      .populate('actions.integration', 'name type')
      .populate('actions.template', 'name type')
      .sort({ createdAt: -1 });

    return res.render('client/clientLayout', {
      title: 'Workflows',
      body: '../client/workflows',
      path: '/tenant/workflows',
      tenant: req.session.tenant,
      workflows,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading tenant workflows');
    return res.status(500).send('Error loading workflows');
  }
};

export const getNewWorkflowForm = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const [templates, integrations] = await Promise.all([
      Template.find({ $or: [{ tenantId }, { isPublished: true }] }),
      Integration.find({ tenantId, active: true }),
    ]);

    return res.render('client/clientLayout', {
      title: 'New Workflow',
      body: '../client/workflowForm',
      path: '/tenant/workflows',
      tenant: req.session.tenant,
      workflow: {},
      templates,
      integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading workflow form');
    return res.status(500).send('Error loading form');
  }
};

export const getEditWorkflowForm = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;

    const [workflow, templates, integrations] = await Promise.all([
      Workflow.findOne({ _id: id, tenantId }),
      Template.find({ $or: [{ tenantId }, { isPublished: true }] }),
      Integration.find({ tenantId, active: true }),
    ]);

    if (!workflow) return res.status(404).send('Workflow not found');

    return res.render('client/clientLayout', {
      title: 'Edit Workflow',
      body: '../client/workflowForm',
      path: '/tenant/workflows',
      tenant: req.session.tenant,
      workflow,
      templates,
      integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading edit workflow form');
    return res.status(500).send('Error loading form');
  }
};

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const RANK_TO_PRIORITY = ['critical', 'high', 'medium', 'low'];

export const createWorkflow = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { triggerEvent, actions, rules, active, priority, name } = req.body;

    // Cap Priority
    const tenantMaxRank = PRIORITY_RANK[req.session.tenant.maxPriority || 'medium'];
    const requestedRank = PRIORITY_RANK[priority || 'medium'];
    const finalPriority = RANK_TO_PRIORITY[Math.max(requestedRank, tenantMaxRank)];

    const workflow = new Workflow({
      tenantId,
      triggerEvent,
      actions,
      rules,
      name,
      priority: finalPriority,
      active: active !== undefined ? active : true,
    });

    await workflow.save();
    await delCache(`workflows:${tenantId}:${triggerEvent}`);

    return res.status(201).json(workflow);
  } catch (err) {
    logger.error({ err }, 'Error creating tenant workflow');
    return res.status(500).json({ message: 'Error creating workflow' });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;
    const { triggerEvent, actions, rules, active, priority, name } = req.body;

    const workflow = await Workflow.findOne({ _id: id, tenantId });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    // Cap Priority
    const tenantMaxRank = PRIORITY_RANK[req.session.tenant.maxPriority || 'medium'];
    const requestedRank = PRIORITY_RANK[priority || 'medium'];
    const finalPriority = RANK_TO_PRIORITY[Math.max(requestedRank, tenantMaxRank)];

    const oldTrigger = workflow.triggerEvent;

    workflow.name = name || workflow.name;
    workflow.triggerEvent = triggerEvent;
    workflow.actions = actions;
    workflow.rules = rules;
    workflow.active = active !== undefined ? active : true;
    workflow.priority = finalPriority;

    await workflow.save();

    await delCache(`workflows:${tenantId}:${oldTrigger}`);
    if (triggerEvent !== oldTrigger) {
      await delCache(`workflows:${tenantId}:${triggerEvent}`);
    }

    return res.status(200).json(workflow);
  } catch (err) {
    logger.error({ err }, 'Error updating tenant workflow');
    return res.status(500).json({ message: 'Error updating workflow' });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;

    const workflow = await Workflow.findOneAndDelete({ _id: id, tenantId });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    await delCache(`workflows:${tenantId}:${workflow.triggerEvent}`);

    return res.status(200).json({ message: 'Workflow deleted' });
  } catch (err) {
    logger.error({ err }, 'Error deleting tenant workflow');
    return res.status(500).json({ message: 'Error deleting workflow' });
  }
};
