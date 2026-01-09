import Integration from '../models/integration.model.js';
import logger from '../utils/logger.js';

export const getTenantIntegrations = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const integrations = await Integration.find({ tenantId }).sort({ createdAt: -1 });
    return res.status(200).json(integrations);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenant integrations');
    return res.status(500).json({ message: 'Error fetching integrations' });
  }
};

export const createTenantIntegration = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { name, type, credentials, isActive } = req.body;

    const integration = new Integration({
      tenantId,
      name,
      type,
      credentials,
      isActive: isActive !== undefined ? isActive : true,
    });

    await integration.save();
    return res.status(201).json(integration);
  } catch (error) {
    logger.error({ err: error }, 'Error creating tenant integration');
    return res.status(500).json({ message: 'Error creating integration' });
  }
};

export const updateTenantIntegration = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;
    const { name, type, credentials, isActive } = req.body;

    const integration = await Integration.findOne({ _id: id, tenantId });
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    if (name) integration.name = name;
    if (type) integration.type = type;
    if (credentials) integration.credentials = credentials;
    if (isActive !== undefined) integration.isActive = isActive;

    await integration.save();
    return res.status(200).json(integration);
  } catch (error) {
    logger.error({ err: error }, 'Error updating tenant integration');
    return res.status(500).json({ message: 'Error updating integration' });
  }
};

export const deleteTenantIntegration = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;

    const integration = await Integration.findOne({ _id: id, tenantId });
    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    await Integration.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Integration deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting tenant integration');
    return res.status(500).json({ message: 'Error deleting integration' });
  }
};
