import Tenant from '../models/tenant.model.js';
import ApiKey from '../models/apiKey.model.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import { delCache, delCacheByPattern } from '../utils/cache.js';

const generateKey = () => {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
};

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

export const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    return res.status(200).json(tenants);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenants');
    return res.status(500).json({ message: 'Error fetching tenants' });
  }
};

export const getTenantById = async (req, res) => {
  try {
    // The model no longer has apiKey directly, so no need to select it.
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    return res.status(200).json(tenant);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenant');
    return res.status(500).json({ message: 'Error fetching tenant' });
  }
};

export const createTenant = async (req, res) => {
  try {
    const {
      name,
      email,
      allowedChannels,
      allowedOrigins,
      allowedIps,
      maxPriority,
      rateLimitPoints,
      rateLimitDuration,
      isActive,
      password,
      scopes,
    } = req.body;

    // 1. Create Tenant
    const tenant = new Tenant({
      name,
      email,
      passwordHash: password,
      allowedChannels: allowedChannels || ['in-app'],
      allowedOrigins: allowedOrigins || [],
      allowedIps: allowedIps || [],
      maxPriority: maxPriority || 'medium',
      rateLimitPoints: rateLimitPoints || 100,
      rateLimitDuration: rateLimitDuration || 900,
      isActive: true,
    });

    await tenant.save();

    // 2. Create Initial API Key
    const rawKey = generateKey();
    const hashedKey = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = new ApiKey({
      tenantId: tenant._id,
      name: 'Default Key',
      keyPrefix,
      keyHash: hashedKey,
      scopes: scopes || ['notify.send', 'notify.read'], // Default scopes
      status: 'active',
    });

    await apiKey.save();

    logger.info({ tenantId: tenant._id }, 'Tenant and Initial Key created successfully');

    // 3. Return Tenant and RAW Key
    return res.status(201).json({
      tenant,
      apiKey: rawKey, // Explicitly return raw key for display
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating tenant');
    return res.status(500).json({ message: 'Error creating tenant: ' + error.message });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      allowedChannels,
      allowedOrigins,
      allowedIps,
      maxPriority,
      rateLimitPoints,
      rateLimitDuration,
      isActive,
    } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    if (name) tenant.name = name;
    if (email) tenant.email = email;
    if (isActive !== undefined) tenant.isActive = isActive;
    if (allowedChannels) tenant.allowedChannels = allowedChannels;
    if (allowedOrigins) tenant.allowedOrigins = allowedOrigins;
    if (allowedIps) tenant.allowedIps = allowedIps;
    if (maxPriority) tenant.maxPriority = maxPriority;
    if (rateLimitPoints !== undefined) tenant.rateLimitPoints = rateLimitPoints;
    if (rateLimitDuration !== undefined) tenant.rateLimitDuration = rateLimitDuration;

    await tenant.save();

    // Invalidate all API key caches for this tenant
    const apiKeys = await ApiKey.find({ tenantId: tenant._id });
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.status(200).json(tenant);
  } catch (error) {
    logger.error({ err: error }, 'Error updating tenant');
    return res.status(500).json({ message: 'Error updating tenant' });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    const apiKeys = await ApiKey.find({ tenantId });

    await Tenant.findByIdAndDelete(tenantId);
    await ApiKey.deleteMany({ tenantId });

    // Invalidate caches
    for (const key of apiKeys) {
      await delCache(`auth:apikey:${key.keyHash}`);
    }

    return res.status(200).json({ message: 'Tenant deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting tenant');
    return res.status(500).json({ message: 'Error deleting tenant' });
  }
};
