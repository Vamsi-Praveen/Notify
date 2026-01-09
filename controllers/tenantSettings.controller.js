import logger from '../utils/logger.js';
import ApiKey from '../models/apiKey.model.js';
import { delCache } from '../utils/cache.js';
import Tenant from '../models/tenant.model.js';

export const getSettings = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const tenant = await Tenant.findById(tenantId);

    return res.render('client/clientLayout', {
      title: 'Settings',
      body: '../client/settings',
      path: '/tenant/settings',
      tenant: req.session.tenant,
      allowedOrigins: tenant.allowedOrigins || [],
      allowedIps: tenant.allowedIps || [],
    });
  } catch (err) {
    logger.error({ err }, 'Error loading settings');
    return res.status(500).send('Error loading settings');
  }
};

export const addAllowedOrigin = async (req, res) => {
  try {
    const { origin } = req.body;
    const tenantId = req.session.tenant._id;

    if (!origin) {
      return res.status(400).json({ success: false, message: 'Origin is required' });
    }

    // Basic URL validation or normalization could go here
    // For now, we trust the tenant but enforce uniqueness
    const tenant = await Tenant.findById(tenantId);
    if (tenant.allowedOrigins.includes(origin)) {
      return res.status(400).json({ success: false, message: 'Origin already exists' });
    }

    tenant.allowedOrigins.push(origin);
    await tenant.save();

    // Invalidate all API key caches for this tenant
    const apiKeys = await ApiKey.find({ tenantId });
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.json({ success: true, message: 'Origin added successfully' });
  } catch (err) {
    logger.error({ err }, 'Error adding allowed origin');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeAllowedOrigin = async (req, res) => {
  try {
    const { origin } = req.body;
    const tenantId = req.session.tenant._id;

    await Tenant.findByIdAndUpdate(tenantId, {
      $pull: { allowedOrigins: origin },
    });

    // Invalidate all API key caches for this tenant
    const apiKeys = await ApiKey.find({ tenantId });
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.json({ success: true, message: 'Origin removed successfully' });
  } catch (err) {
    logger.error({ err }, 'Error removing allowed origin');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addAllowedIp = async (req, res) => {
  try {
    const { ip } = req.body;
    const tenantId = req.session.tenant._id;

    if (!ip) {
      return res.status(400).json({ success: false, message: 'IP is required' });
    }

    const tenant = await Tenant.findById(tenantId);
    // Simple validation could be added here
    if (tenant.allowedIps.includes(ip)) {
      return res.status(400).json({ success: false, message: 'IP already exists' });
    }

    tenant.allowedIps.push(ip);
    await tenant.save();

    // Invalidate all API key caches for this tenant
    const apiKeys = await ApiKey.find({ tenantId });
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.json({ success: true, message: 'IP added successfully' });
  } catch (err) {
    logger.error({ err }, 'Error adding allowed IP');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeAllowedIp = async (req, res) => {
  try {
    const { ip } = req.body;
    const tenantId = req.session.tenant._id;

    await Tenant.findByIdAndUpdate(tenantId, {
      $pull: { allowedIps: ip },
    });

    // Invalidate all API key caches for this tenant
    const apiKeys = await ApiKey.find({ tenantId });
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.json({ success: true, message: 'IP removed successfully' });
  } catch (err) {
    logger.error({ err }, 'Error removing allowed IP');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
