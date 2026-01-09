import ApiKey from '../models/apiKey.model.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const generateKey = () => {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
};

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

export const getTenantApiKeys = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const keys = await ApiKey.find({ tenantId }).sort({ createdAt: -1 });
    return res.status(200).json(keys);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenant API keys');
    return res.status(500).json({ message: 'Error fetching API keys' });
  }
};

export const createTenantApiKey = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { name, scopes } = req.body;

    const rawKey = generateKey();
    const hashedKey = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = new ApiKey({
      tenantId,
      name,
      keyPrefix,
      keyHash: hashedKey,
      scopes: scopes || ['event:write'],
      status: 'active',
    });

    await apiKey.save();

    return res.status(201).json({
      ...apiKey.toObject(),
      key: rawKey,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating tenant API key');
    return res.status(500).json({ message: 'Error creating API key' });
  }
};

export const revokeTenantApiKey = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;

    const apiKey = await ApiKey.findOne({ _id: id, tenantId });
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    await ApiKey.findByIdAndUpdate(id, { status: 'revoked' });
    return res.status(200).json({ message: 'API key revoked' });
  } catch (error) {
    logger.error({ err: error }, 'Error revoking tenant API key');
    return res.status(500).json({ message: 'Error revoking API key' });
  }
};

export const refreshTenantApiKey = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { id } = req.params;

    const oldKey = await ApiKey.findOne({ _id: id, tenantId });
    if (!oldKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    // Revoke old key
    await ApiKey.findByIdAndUpdate(id, { status: 'revoked' });

    // Create new key with same name and scopes
    const rawKey = generateKey();
    const hashedKey = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const newApiKey = new ApiKey({
      tenantId,
      name: oldKey.name,
      keyPrefix,
      keyHash: hashedKey,
      scopes: oldKey.scopes,
      status: 'active',
    });

    await newApiKey.save();

    return res.status(201).json({
      ...newApiKey.toObject(),
      key: rawKey,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error refreshing tenant API key');
    return res.status(500).json({ message: 'Error refreshing API key' });
  }
};
