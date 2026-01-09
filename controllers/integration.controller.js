import Integration from '../models/integration.model.js';
import logger from '../utils/logger.js';
import { delCacheByPattern } from '../utils/cache.js';

export const getAllIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find()
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 });
    return res.status(200).json(integrations);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching integrations');
    return res.status(500).json({ message: 'Error fetching integrations' });
  }
};

export const getIntegrationById = async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    return res.status(200).json(integration);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching integration');
    return res.status(500).json({ message: 'Error fetching integration' });
  }
};

export const createIntegration = async (req, res) => {
  try {
    const { name, type, tenantId, credentials, active } = req.body;
    const integration = new Integration({
      name,
      type,
      tenantId,
      credentials,
      active: active !== undefined ? active : true,
    });
    await integration.save();
    return res.status(201).json(integration);
  } catch (error) {
    logger.error({ err: error }, 'Error creating integration');
    return res.status(500).json({ message: 'Error creating integration' });
  }
};

export const updateIntegration = async (req, res) => {
  try {
    const { name, type, tenantId, credentials, active } = req.body;
    const integration = await Integration.findById(req.params.id);

    if (!integration) return res.status(404).json({ message: 'Integration not found' });

    if (name) integration.name = name;
    if (type) integration.type = type;
    if (tenantId) integration.tenantId = tenantId;
    if (credentials) integration.credentials = credentials;
    if (active !== undefined) integration.active = active;

    await integration.save();

    // Invalidate workflow caches for this tenant (or global if tenantId is null)
    const tId = integration.tenantId || 'global';
    await delCacheByPattern(`workflows:${tId}:*`);

    return res.status(200).json(integration);
  } catch (error) {
    logger.error({ err: error }, 'Error updating integration');
    return res.status(500).json({ message: 'Error updating integration' });
  }
};
export const deleteIntegration = async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (integration) {
      const tenantId = integration.tenantId || 'global';
      await Integration.findByIdAndDelete(req.params.id);
      await delCacheByPattern(`workflows:${tenantId}:*`);
    }
    return res.status(200).json({ message: 'Integration deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting integration');
    return res.status(500).json({ message: 'Error deleting integration' });
  }
};
