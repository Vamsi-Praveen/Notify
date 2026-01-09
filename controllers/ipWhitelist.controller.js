import Tenant from '../models/tenant.model.js';
import ApiKey from '../models/apiKey.model.js';
import logger from '../utils/logger.js';
import { delCache } from '../utils/cache.js';

export const getIpWhitelistPage = async (req, res) => {
  try {
    const tenants = await Tenant.find({}, 'name allowedIps').sort({ name: 1 });
    const apiKeys = await ApiKey.find({}, 'name keyPrefix allowedIps tenantId')
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 });

    // Flatten IPs for the view, similar to Origins
    const ipEntries = [];

    tenants.forEach((tenant) => {
      if (tenant.allowedIps && tenant.allowedIps.length > 0) {
        tenant.allowedIps.forEach((ip) => {
          ipEntries.push({
            ip,
            type: 'tenant',
            entityId: tenant._id,
            entityName: tenant.name,
            context: 'Tenant Global',
          });
        });
      }
    });

    apiKeys.forEach((key) => {
      if (key.allowedIps && key.allowedIps.length > 0) {
        key.allowedIps.forEach((ip) => {
          ipEntries.push({
            ip,
            type: 'apikey',
            entityId: key._id,
            entityName: key.name,
            context: key.tenantId ? `${key.tenantId.name} (Key)` : 'System Key',
          });
        });
      }
    });

    return res.render('layout', {
      title: 'IP Allowlist',
      body: 'ipWhitelist/index',
      path: '/admin/ip-whitelist',
      ipEntries, // The flat list
      tenants, // For dropdowns
      apiKeys, // For dropdowns
    });
  } catch (error) {
    logger.error({ err: error }, 'Error loading IP whitelist page');
    return res.status(500).send('Error loading IP whitelist page');
  }
};

export const addIp = async (req, res) => {
  try {
    const { type, entityId, ip } = req.body;

    if (!ip) return res.status(400).json({ message: 'IP address is required' });

    let model;
    if (type === 'tenant') model = Tenant;
    else if (type === 'apikey') model = ApiKey;
    else return res.status(400).json({ message: 'Invalid entity type' });

    const entity = await model.findById(entityId);
    if (!entity) return res.status(404).json({ message: 'Entity not found' });

    if (!entity.allowedIps) entity.allowedIps = [];
    if (entity.allowedIps.includes(ip)) {
      return res.status(400).json({ message: 'IP already allowed' });
    }

    entity.allowedIps.push(ip);
    await entity.save();

    // Invalidate caches
    if (type === 'apikey') {
      await delCache(`auth:apikey:${entity.keyHash}`);
    } else {
      const apiKeys = await ApiKey.find({ tenantId: entityId });
      for (const key of apiKeys) {
        await delCache(`auth:apikey:${key.keyHash}`);
      }
    }

    res.status(200).json({ message: 'IP added successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error adding IP');
    return res.status(500).json({ message: 'Error adding IP' });
  }
};

export const removeIp = async (req, res) => {
  try {
    const { type, entityId, ip } = req.params;
    const decodedIp = decodeURIComponent(ip);

    let model;
    if (type === 'tenant') model = Tenant;
    else if (type === 'apikey') model = ApiKey;
    else return res.status(400).json({ message: 'Invalid entity type' });

    const entity = await model.findById(entityId);
    if (!entity) return res.status(404).json({ message: 'Entity not found' });

    if (entity.allowedIps) {
      entity.allowedIps = entity.allowedIps.filter((i) => i !== decodedIp);
      await entity.save();

      // Invalidate caches
      if (type === 'apikey') {
        await delCache(`auth:apikey:${entity.keyHash}`);
      } else {
        const apiKeys = await ApiKey.find({ tenantId: entityId });
        for (const key of apiKeys) {
          await delCache(`auth:apikey:${key.keyHash}`);
        }
      }
    }

    return res.status(200).json({ message: 'IP removed successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error removing IP');
    return res.status(500).json({ message: 'Error removing IP' });
  }
};
