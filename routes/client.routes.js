import * as authController from '../controllers/auth.controller.js';
import * as pushAppUiController from '../controllers/client/pushAppUi.controller.js';
import * as pushAppController from '../controllers/pushApp.controller.js';
import * as tenantApiKeyController from '../controllers/tenantApiKey.controller.js';
import * as tenantIntegrationController from '../controllers/tenantIntegration.controller.js';
import * as tenantSettingsController from '../controllers/tenantSettings.controller.js';
import * as tenantWorkflowController from '../controllers/tenantWorkflow.controller.js';
import ApiKey from '../models/apiKey.model.js';
import Integration from '../models/integration.model.js';
import Log from '../models/log.model.js';
import Template from '../models/template.model.js';
import Tenant from '../models/tenant.model.js';
import logger from '../utils/logger.js';

// Middleware to check tenant session
const requireTenantAuth = (req, res, next) => {
  if (req.session && req.session.tenant) {
    return next();
  }
  res.redirect('/login');
};

const router = Router();

router.get('/login', (req, res) => {
  res.render('client/login', { error: null, title: 'Tenant Login' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tenant = await Tenant.findOne({ email }).select('+passwordHash');

    if (!tenant) {
      return res.render('client/login', { error: 'Invalid email or password' });
    }

    // Use the matchPassword method from the model
    const isPasswordValid = await tenant.matchPassword(password);

    if (!isPasswordValid) {
      return res.render('client/login', { error: 'Invalid email or password' });
    }

    req.session.tenant = {
      _id: tenant._id,
      name: tenant.name,
      email: tenant.email,
    };

    res.redirect('/dashboard');
  } catch (err) {
    logger.error({ err }, 'Tenant login failed');
    res.render('client/login', { error: 'Internal server error' });
  }
});

router.get('/dashboard', requireTenantAuth, async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const stats = await Log.aggregate([
      { $match: { tenantId: tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const formattedStats = { sent: 0, failed: 0, pending: 0, total: 0 };
    stats.forEach((s) => {
      if (s._id === 'SENT' || s._id === 'DELIVERED') formattedStats.sent += s.count;
      else if (s._id === 'FAILED') formattedStats.failed += s.count;
      else formattedStats.pending += s.count;
      formattedStats.total += s.count;
    });

    const recentLogs = await Log.find({ tenantId })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('client/clientLayout', {
      title: 'Dashboard',
      body: '../client/dashboardContent',
      stats: formattedStats,
      recentLogs,
      tenant: req.session.tenant,
      path: '/dashboard',
    });
  } catch (err) {
    logger.error({ err }, 'Error loading dashboard');
    res.status(500).send('Error loading dashboard');
  }
});

// API Keys UI Routes
router.get('/tenant/api-keys', requireTenantAuth, async (req, res) => {
  try {
    const keys = await ApiKey.find({ tenantId: req.session.tenant._id }).sort({ createdAt: -1 });
    res.render('client/clientLayout', {
      title: 'API Keys',
      body: '../client/apiKeys',
      path: '/tenant/api-keys',
      tenant: req.session.tenant,
      keys,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading API keys');
    res.status(500).send('Error loading API keys');
  }
});

// Integrations UI Routes
router.get('/tenant/integrations', requireTenantAuth, async (req, res) => {
  try {
    const integrations = await Integration.find({ tenantId: req.session.tenant._id }).sort({
      createdAt: -1,
    });
    res.render('client/clientLayout', {
      title: 'Integrations',
      body: '../client/integrations',
      path: '/tenant/integrations',
      tenant: req.session.tenant,
      integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading integrations');
    res.status(500).send('Error loading integrations');
  }
});

import { jsonToCsv } from '../utils/csvExport.js';
import { Router } from 'express';
router.get('/tenant/logs', requireTenantAuth, async (req, res) => {
  try {
    const logs = await Log.find({ tenantId: req.session.tenant._id })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.render('client/clientLayout', {
      title: 'Delivery Logs',
      body: '../client/logs',
      path: '/tenant/logs',
      tenant: req.session.tenant,
      logs,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading logs');
    res.status(500).send('Error loading logs');
  }
});

router.get('/tenant/templates', requireTenantAuth, async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const templates = await Template.find({
      $or: [{ tenantId: tenantId }, { isPublished: true }],
    }).sort({ createdAt: -1 });

    res.render('client/clientLayout', {
      title: 'Templates',
      body: '../client/templates',
      path: '/tenant/templates',
      tenant: req.session.tenant,
      templates,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading templates');
    res.status(500).send('Error loading templates');
  }
});

router.get('/tenant/workflows', requireTenantAuth, tenantWorkflowController.getWorkflows);
router.get('/tenant/workflows/new', requireTenantAuth, tenantWorkflowController.getNewWorkflowForm);
router.get(
  '/tenant/workflows/:id/edit',
  requireTenantAuth,
  tenantWorkflowController.getEditWorkflowForm
);

router.get('/tenant/settings', requireTenantAuth, tenantSettingsController.getSettings);

router.get('/tenant/logs/export', requireTenantAuth, async (req, res) => {
  try {
    const logs = await Log.find({ tenantId: req.session.tenant._id })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(1000);

    const fields = ['createdAt', 'workflowId.name', 'eventName', 'status', 'channel'];
    const csv = jsonToCsv(logs, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=delivery_logs_tenant.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).send('Error exporting logs');
  }
});

// API Routes for tenant operations
router.get('/tenant-api/api-keys', requireTenantAuth, tenantApiKeyController.getTenantApiKeys);
router.post('/tenant-api/api-keys', requireTenantAuth, tenantApiKeyController.createTenantApiKey);
router.put(
  '/tenant-api/api-keys/:id/revoke',
  requireTenantAuth,
  tenantApiKeyController.revokeTenantApiKey
);
router.post(
  '/tenant-api/api-keys/:id/refresh',
  requireTenantAuth,
  tenantApiKeyController.refreshTenantApiKey
);

router.get(
  '/tenant-api/integrations',
  requireTenantAuth,
  tenantIntegrationController.getTenantIntegrations
);
router.post(
  '/tenant-api/integrations',
  requireTenantAuth,
  tenantIntegrationController.createTenantIntegration
);
router.put(
  '/tenant-api/integrations/:id',
  requireTenantAuth,
  tenantIntegrationController.updateTenantIntegration
);
router.delete(
  '/tenant-api/integrations/:id',
  requireTenantAuth,
  tenantIntegrationController.deleteTenantIntegration
);

router.post(
  '/tenant-api/settings/allowed-origins',
  requireTenantAuth,
  tenantSettingsController.addAllowedOrigin
);
router.delete(
  '/tenant-api/settings/allowed-origins',
  requireTenantAuth,
  tenantSettingsController.removeAllowedOrigin
);

router.post(
  '/tenant-api/settings/allowed-ips',
  requireTenantAuth,
  tenantSettingsController.addAllowedIp
);
router.delete(
  '/tenant-api/settings/allowed-ips',
  requireTenantAuth,
  tenantSettingsController.removeAllowedIp
);

router.post('/tenant-api/workflows', requireTenantAuth, tenantWorkflowController.createWorkflow);
router.put('/tenant-api/workflows/:id', requireTenantAuth, tenantWorkflowController.updateWorkflow);
router.delete(
  '/tenant-api/workflows/:id',
  requireTenantAuth,
  tenantWorkflowController.deleteWorkflow
);

router.post('/tenant-api/change-password', requireTenantAuth, authController.changeTenantPassword);

// Push App Routes (UI)
router.get('/tenant/push-apps', requireTenantAuth, pushAppUiController.renderPushApps);
router.get('/tenant/push-apps/new', requireTenantAuth, pushAppUiController.renderPushAppForm);
router.get('/tenant/push-apps/:id/edit', requireTenantAuth, pushAppUiController.renderPushAppForm);

// Push App Routes (API)
router.get('/tenant-api/push-apps', requireTenantAuth, pushAppController.getApps);
router.post('/tenant-api/push-apps', requireTenantAuth, pushAppController.createApp);
router.put('/tenant-api/push-apps/:id', requireTenantAuth, pushAppController.updateApp);
router.delete('/tenant-api/push-apps/:id', requireTenantAuth, pushAppController.deleteApp);

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

export default router;
