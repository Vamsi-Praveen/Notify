import ApiKey from '../models/apiKey.model.js';
import Tenant from '../models/tenant.model.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { delCache } from '../utils/cache.js';

const generateKey = () => {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
};

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

export const getAllApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find().populate('tenantId', 'name').sort({ createdAt: -1 });
    return res.status(200).json(keys);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching api keys');
    return res.status(500).json({ message: 'Error fetching api keys' });
  }
};

export const createApiKey = async (req, res) => {
  try {
    const { tenantId, name, scopes, allowedIps } = req.body;

    const rawKey = generateKey();
    const hashedKey = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8); // Store 'sk_xxxxx' part

    const apiKey = new ApiKey({
      tenantId,
      name,
      keyPrefix,
      keyHash: hashedKey,
      scopes: scopes || [], // e.g., ['notify', 'read']
      allowedIps: allowedIps || [],
      status: 'active',
    });

    await apiKey.save();

    // Return the RAW key only once!
    return res.status(201).json({
      ...apiKey.toObject(),
      key: rawKey, // Explicitly return raw key for display
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating api key');
    return res.status(500).json({ message: 'Error creating api key' });
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(id);
    if (apiKey) {
      await ApiKey.findByIdAndUpdate(id, { status: 'revoked' });
      await delCache(`auth:apikey:${apiKey.keyHash}`);
    }
    return res.status(200).json({ message: 'API key revoked' });
  } catch (error) {
    logger.error({ err: error }, 'Error revoking api key');
    return res.status(500).json({ message: 'Error revoking api key' });
  }
};

export const updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, scopes, allowedIps } = req.body;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) return res.status(404).json({ message: 'API Key not found' });

    if (name) apiKey.name = name;
    if (scopes) apiKey.scopes = scopes;
    if (allowedIps) apiKey.allowedIps = allowedIps;

    await apiKey.save();
    await delCache(`auth:apikey:${apiKey.keyHash}`);
    return res.status(200).json(apiKey);
  } catch (error) {
    logger.error({ err: error }, 'Error updating api key');
    return res.status(500).json({ message: 'Error updating api key' });
  }
};
