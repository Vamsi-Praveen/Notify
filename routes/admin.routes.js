import { Router } from 'express';
import mongoose from 'mongoose';
import * as authController from '../controllers/auth.controller.js';
import * as ipWhitelistController from '../controllers/ipWhitelist.controller.js';
import * as queueController from '../controllers/queue.controller.js';
import Admin from '../models/admin.model.js';
import ApiKey from '../models/apiKey.model.js';
import Integration from '../models/integration.model.js';
import Log from '../models/log.model.js';
import PushApp from '../models/pushApp.model.js';
import SystemConfig from '../models/systemConfig.model.js';
import Template from '../models/template.model.js';
import Tenant from '../models/tenant.model.js';
import Workflow from '../models/workflow.model.js';


const adminRouter = Router();

// Middleware to protect admin routes for UI (redirects to login)
const requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  res.redirect('/admin/login');
};

// Admin Auth Routes
adminRouter.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

adminRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email }).select('+passwordHash');
    if (admin && (await admin.matchPassword(password))) {
      req.session.admin = {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      };
      return res.redirect('/admin');
    }
    res.render('admin/login', { error: 'Invalid credentials' });
  } catch (err) {
    res.render('admin/login', { error: 'System Authentication Failure' });
  }
});

adminRouter.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/admin/login');
  });
});

import { cacheClient } from '../utils/cache.js';

adminRouter.get('/', requireAdminAuth, async (req, res) => {
  try {
    const [tenantCount, templateCount, workflowCount, totalLogs] = await Promise.all([
      Tenant.countDocuments(),
      Template.countDocuments(),
      Workflow.countDocuments(),
      Log.countDocuments(),
    ]);

    // Check system health
    const dbStatus = mongoose.connection.readyState === 1 ? 'Healthy' : 'Degraded';
    const redisStatus = cacheClient.status === 'ready' ? 'Healthy' : 'Disconnected';

    // Fetch system configuration for readiness check
    const config = (await SystemConfig.findOne()) || {};

    // Recent activity (Last 5 logs)
    const recentActivity = await Log.find()
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('layout', {
      title: 'System Overview',
      path: '/admin',
      body: 'dashboard',
      stats: {
        tenants: tenantCount,
        templates: templateCount,
        workflows: workflowCount,
        totalNotifications: totalLogs,
        status: dbStatus,
        redis: redisStatus,
      },
      config,
      recentActivity,
    });
  } catch (err) {
    res.status(500).send('Error loading dashboard stats');
  }
});

// Template UI Routes
adminRouter.get('/templates', requireAdminAuth, async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.render('layout', {
      title: 'Templates',
      body: 'templates/index',
      path: '/admin/templates',
      templates,
    });
  } catch (e) {
    res.status(500).send('Error loading templates');
  }
});

adminRouter.get('/templates/new', requireAdminAuth, async (req, res) => {
  try {
    const [tenants, integrations] = await Promise.all([
      Tenant.find({}, 'name'),
      Integration.find({}, 'name type tenantId active'),
    ]);
    res.render('layout', {
      title: 'New Template',
      body: 'templates/form',
      path: '/templates/new',
      template: {},
      tenants,
      integrations,
    });
  } catch (e) {
    res.status(500).send('Error loading form');
  }
});

adminRouter.get('/templates/:id/edit', requireAdminAuth, async (req, res) => {
  try {
    const [template, tenants, integrations] = await Promise.all([
      Template.findById(req.params.id),
      Tenant.find({}, 'name'),
      Integration.find({}, 'name type tenantId active'),
    ]);
    if (!template) return res.status(404).send('Template not found');

    res.render('layout', {
      title: 'Edit Template',
      body: 'templates/form',
      path: '/templates',
      template,
      tenants,
      integrations,
    });
  } catch (e) {
    res.status(500).send('Error loading template');
  }
});

// Workflow UI Routes
adminRouter.get('/workflows', requireAdminAuth, async (req, res) => {
  try {
    const workflows = await Workflow.find()
      .populate('actions.template')
      .populate('actions.integration')
      .sort({ createdAt: -1 });
    res.render('layout', {
      title: 'Workflows',
      body: 'workflows/index',
      path: '/admin/workflows',
      workflows,
    });
  } catch (e) {
    res.status(500).send('Error loading workflows');
  }
});

adminRouter.get('/workflows/new', requireAdminAuth, async (req, res) => {
  try {
    const templates = await Template.find({}, 'name type fields isPublished');
    const integrations = await Integration.find({}, 'name type');
    const tenants = await Tenant.find({}, 'name');
    console.log(integrations);

    res.render('layout', {
      title: 'New Workflow',
      body: 'workflows/form',
      path: '/workflows/new',
      workflow: {},
      templates,
      integrations,
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading form dependencies');
  }
});

adminRouter.get('/workflows/:id/edit', requireAdminAuth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('actions.template')
      .populate('actions.integration');
    if (!workflow) return res.status(404).send('Workflow not found');

    const templates = await Template.find({}, 'name type fields isPublished');
    const integrations = await Integration.find({}, 'name type');
    const tenants = await Tenant.find({}, 'name');

    res.render('layout', {
      title: 'Edit Workflow',
      body: 'workflows/form',
      path: '/workflows',
      workflow,
      templates,
      integrations,
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading workflow');
  }
});

// System Config UI Route
adminRouter.get('/system-config', requireAdminAuth, async (req, res) => {
  try {
    const config = (await SystemConfig.findOne()) || {};
    res.render('layout', {
      title: 'System Configuration',
      body: 'systemConfig',
      path: '/admin/system-config',
      config,
    });
  } catch (e) {
    res.status(500).send('Error loading system config');
  }
});

// Tenant UI Routes
adminRouter.get('/tenants', requireAdminAuth, async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.render('layout', {
      title: 'Tenants',
      body: 'tenants/index',
      path: '/admin/tenants',
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading tenants');
  }
});

// Mobile Apps UI Route
adminRouter.get('/mobile-apps', requireAdminAuth, async (req, res) => {
  try {
    const apps = await PushApp.find().populate('tenantId', 'name').sort({ createdAt: -1 });

    res.render('layout', {
      title: 'Mobile Apps',
      body: 'admin/mobileApps/index',
      path: '/admin/mobile-apps',
      apps,
    });
  } catch (e) {
    res.status(500).send('Error loading mobile apps');
  }
});

adminRouter.get('/mobile-apps/:id/edit', requireAdminAuth, async (req, res) => {
  try {
    const app = await PushApp.findById(req.params.id).populate('tenantId', 'name');
    if (!app) return res.status(404).send('App not found');

    res.render('layout', {
      title: 'Edit Mobile App',
      body: 'admin/mobileApps/form',
      path: '/admin/mobile-apps',
      app,
    });
  } catch (e) {
    res.status(500).send('Error loading app details');
  }
});

// Admin-API for Mobile Apps
adminRouter.put('/admin-api/mobile-apps/:id', requireAdminAuth, async (req, res) => {
  try {
    const { name, platform, isActive, serviceAccountJson } = req.body;
    const app = await PushApp.findById(req.params.id);

    if (!app) return res.status(404).json({ message: 'App not found' });

    app.name = name;
    app.platform = platform;
    app.isActive = isActive;

    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
          return res.status(400).json({ message: 'Invalid Firebase JSON' });
        }
        app.firebaseConfig = {
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
        };
      } catch (e) {
        return res.status(400).json({ message: 'Invalid JSON format' });
      }
    }

    await app.save();
    res.json({ message: 'App updated successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Error updating app' });
  }
});

adminRouter.get('/tenants/new', requireAdminAuth, (req, res) => {
  res.render('layout', {
    title: 'New Tenant',
    body: 'tenants/form',
    path: '/tenants/new',
    tenant: {},
  });
});

adminRouter.get('/tenants/:id/edit', requireAdminAuth, async (req, res) => {
  try {
    // Need to fetch with +apiKey to show it if needed, or controller handles it?
    // Here we just render the view. The view might need data.
    // Let's use the model directly here for SSR convenience
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).send('Tenant not found');

    res.render('layout', {
      title: 'Edit Tenant',
      body: 'tenants/form',
      path: '/tenants',
      tenant,
    });
  } catch (e) {
    res.status(500).send('Error loading tenant');
  }
});

// Integrations UI Routes
adminRouter.get('/integrations', requireAdminAuth, async (req, res) => {
  try {
    const integrations = await Integration.find()
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 });
    res.render('layout', {
      title: 'Integrations',
      body: 'integrations/index',
      path: '/admin/integrations',
      integrations,
    });
  } catch (e) {
    res.status(500).send('Error loading integrations');
  }
});

adminRouter.get('/integrations/new', requireAdminAuth, async (req, res) => {
  try {
    const tenants = await Tenant.find({}, 'name');
    res.render('layout', {
      title: 'New Integration',
      body: 'integrations/form',
      path: '/integrations',
      integration: {},
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading form');
  }
});

adminRouter.get('/integrations/:id/edit', requireAdminAuth, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    const tenants = await Tenant.find({}, 'name');
    res.render('layout', {
      title: 'Edit Integration',
      body: 'integrations/form',
      path: '/integrations',
      integration,
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading integration');
  }
});

// API Keys UI Route
adminRouter.get('/api-keys', requireAdminAuth, async (req, res) => {
  try {
    const keys = await ApiKey.find().populate('tenantId', 'name').sort({ createdAt: -1 });
    const tenants = await Tenant.find({}, 'name'); // For create modal
    res.render('layout', {
      title: 'API Keys',
      body: 'apiKeys/index',
      path: '/admin/api-keys',
      keys,
      tenants,
    });
  } catch (e) {
    res.status(500).send('Error loading api keys');
  }
});

import { jsonToCsv } from '../utils/csvExport.js';

// Logs UI Route
adminRouter.get('/logs', requireAdminAuth, async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('tenantId', 'name')
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.render('layout', {
      title: 'Delivery Logs',
      body: 'logs/index',
      path: '/admin/logs',
      logs,
    });
  } catch (e) {
    res.status(500).send('Error loading logs');
  }
});

// Allowed Origins UI Route
adminRouter.get('/origins', requireAdminAuth, async (req, res) => {
  try {
    const tenants = await Tenant.find({}, 'name allowedOrigins').sort({ name: 1 });

    // Aggregate origins for the view
    const origins = tenants.reduce((acc, tenant) => {
      tenant.allowedOrigins.forEach((url) => {
        acc.push({
          tenantId: tenant._id,
          tenantName: tenant.name,
          url: url,
        });
      });
      return acc;
    }, []);

    res.render('layout', {
      title: 'Allowed Origins',
      body: 'origins/index',
      path: '/admin/origins',
      origins,
      tenants: tenants.map((t) => ({ id: t._id, name: t.name })),
    });
  } catch (e) {
    res.status(500).send('Error loading origins');
  }
});

// Queue Management UI Route
adminRouter.get('/queue', requireAdminAuth, queueController.getQueuePage);

// IP Whitelist UI Route
adminRouter.get('/ip-whitelist', requireAdminAuth, ipWhitelistController.getIpWhitelistPage);

// IP Whitelist API Routes
adminRouter.post('/admin-api/ip-whitelist', requireAdminAuth, ipWhitelistController.addIp);
adminRouter.delete(
  '/admin-api/ip-whitelist/:type/:entityId/:ip',
  requireAdminAuth,
  ipWhitelistController.removeIp
);

// Queue Management API Routes
adminRouter.get('/admin-api/queue/stats', requireAdminAuth, queueController.getQueueStats);
adminRouter.post('/admin-api/queue/retry/:id', requireAdminAuth, queueController.retryJob);
adminRouter.delete('/admin-api/queue/delete/:id', requireAdminAuth, queueController.deleteJob);

// Admin-API for Origins (Tenant-based)
adminRouter.post('/admin-api/origins', requireAdminAuth, async (req, res) => {
  const { tenantId, url } = req.body;
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    if (tenant.allowedOrigins.includes(url)) {
      return res.status(400).json({ message: 'Origin already exists for this tenant' });
    }

    tenant.allowedOrigins.push(url);
    await tenant.save();
    res.status(201).json({ message: 'Origin added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding origin' });
  }
});

adminRouter.delete('/admin-api/origins/:tenantId/:url', requireAdminAuth, async (req, res) => {
  const { tenantId, url } = req.params;
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    tenant.allowedOrigins = tenant.allowedOrigins.filter((o) => o !== url);
    await tenant.save();
    res.status(200).json({ message: 'Origin removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing origin' });
  }
});

adminRouter.get('/logs/export', requireAdminAuth, async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('tenantId', 'name')
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(1000);

    const fields = [
      'createdAt',
      'tenantId.name',
      'workflowId.name',
      'eventName',
      'status',
      'channel',
    ];
    const csv = jsonToCsv(logs, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=delivery_logs_admin.csv');
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).send('Error exporting logs');
  }
});

// Mount Admin APIs
// Note: We mount these under /admin-api to distinguish from UI routes
import apiKeyRouter from './apiKey.routes.js';
import integrationRouter from './integration.routes.js';
import systemConfigRouter from './systemConfig.routes.js';
import templateRouter from './template.routes.js';
import tenantRouter from './tenant.routes.js';
import workflowRouter from './workflow.routes.js';

adminRouter.use('/admin-api/templates', templateRouter);
adminRouter.use('/admin-api/workflows', workflowRouter);
adminRouter.use('/admin-api/system-config', systemConfigRouter);
adminRouter.use('/admin-api/tenants', tenantRouter);
adminRouter.use('/admin-api/api-keys', apiKeyRouter);
adminRouter.use('/admin-api/integrations', integrationRouter);

// Auth Routes (Password Change)
adminRouter.post(
  '/admin-api/change-password',
  requireAdminAuth,
  authController.changeAdminPassword
);

export default adminRouter;
