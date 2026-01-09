import { RateLimiterRedis } from 'rate-limiter-flexible';
import crypto from 'crypto';
import ApiKey from '../models/apiKey.model.js';
import Tenant from '../models/tenant.model.js';
import { getCache, setCache, cacheClient } from '../utils/cache.js';
import logger from '../utils/logger.js';
import { isIpAllowed } from '../utils/ip.js';

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

const CACHE_TTL = 600;

/**
 * Enforces per-tenant rate limiting
 */
const checkRateLimit = async (tenant) => {
  if (!tenant || cacheClient.status !== 'ready') return;

  const points = tenant.rateLimitPoints || 100;
  const duration = tenant.rateLimitDuration || 900;

  const rateLimiter = new RateLimiterRedis({
    storeClient: cacheClient,
    keyPrefix: 'ratelimit',
    points: points,
    duration: duration,
  });

  try {
    const res = await rateLimiter.consume(tenant._id.toString());
    return {
      remaining: res.remainingPoints,
      reset: new Date(Date.now() + res.msBeforeNext),
    };
  } catch (rej) {
    if (rej instanceof Error) throw rej;
    throw {
      type: 'RATE_LIMIT_EXCEEDED',
      points,
      duration,
      retryAfter: Math.round(rej.msBeforeNext / 1000) || 1,
    };
  }
};

export const authenticateApi = async (req, res, next) => {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  try {
    const hashedKey = hashKey(rawKey);
    const CACHE_KEY = `auth:apikey:${hashedKey}`;

    let auth;
    auth = await getCache(CACHE_KEY);

    if (!auth) {
      const apiKeyDoc = await ApiKey.findOne({
        keyHash: hashedKey,
        status: 'active',
      }).lean();

      if (!apiKeyDoc) {
        return res.status(403).json({ error: 'Invalid API Key' });
      }

      const tenant = await Tenant.findById(apiKeyDoc.tenantId).lean();
      if (!tenant) {
        return res.status(403).json({ error: 'Invalid API Key' });
      }

      auth = {
        apiKeyId: apiKeyDoc._id,
        scopes: apiKeyDoc.scopes || [],
        apiKeyIps: apiKeyDoc.allowedIps || [],
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          allowedOrigins: tenant.allowedOrigins || [],
          allowedIps: tenant.allowedIps || [],
          rateLimitPoints: tenant.rateLimitPoints,
          rateLimitDuration: tenant.rateLimitDuration,
        },
      };

      await setCache(CACHE_KEY, auth, CACHE_TTL);

      ApiKey.updateOne({ _id: apiKeyDoc._id }, { $set: { lastUsedAt: new Date() } }).catch(
        () => {}
      );
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    const normalizedIp = clientIp
      ?.split(',')[0]
      ?.trim()
      ?.replace(/^::ffff:/, '');

    if (normalizedIp) {
      let allowed = true;
      let source = '';

      if (auth.apiKeyIps.length > 0) {
        allowed = isIpAllowed(normalizedIp, auth.apiKeyIps);
        source = 'API Key Policy';
      } else if (auth.tenant.allowedIps.length > 0) {
        allowed = isIpAllowed(normalizedIp, auth.tenant.allowedIps);
        source = 'Tenant Policy';
      }

      if (!allowed) {
        logger.warn(
          {
            apiKeyId: auth.apiKeyId,
            tenantId: auth.tenant._id,
            ip: normalizedIp,
            source,
          },
          'IP access denied'
        );

        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: `Access denied from IP ${normalizedIp} by ${source}`,
        });
      }
    }

    try {
      const limitInfo = await checkRateLimit(auth.tenant);
      if (limitInfo) {
        res.set('X-RateLimit-Remaining', limitInfo.remaining);
        res.set('X-RateLimit-Reset', limitInfo.reset.toUTCString());
      }
    } catch (err) {
      if (err.type === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: err.retryAfter,
        });
      }
      throw err;
    }

    req.tenant = auth.tenant;
    req.apiKeyId = auth.apiKeyId;
    req.apiKeyScopes = auth.scopes;

    next();
  } catch (err) {
    logger.error({ err }, 'API authentication failed');
    return res.status(500).json({ error: 'Authentication Failed' });
  }
};

export const requireScope = (requiredScope) => {
  return (req, res, next) => {
    const scopes = req.apiKeyScopes || [];

    if (scopes.includes(requiredScope)) {
      return next();
    }

    logger.warn(
      {
        apiKeyId: req.apiKeyId,
        requiredScope,
        scopes,
      },
      'Insufficient permissions'
    );

    return res.status(403).json({
      error: 'INSUFFICIENT_SCOPE',
      message: `API key requires '${requiredScope}' scope`,
    });
  };
};
