import logger from '../utils/logger.js';
import { URL } from 'url';

const normalizeOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    return null;
  }
};

const isOriginAllowed = (origin, allowedOrigins = []) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  return allowedOrigins.some((allowed) => {
    if (allowed === normalizedOrigin) return true;

    if (allowed.startsWith('*.')) {
      const domain = allowed.replace('*.', '');
      return normalizedOrigin.endsWith(domain);
    }

    return false;
  });
};

export const validateOrigin = (req, res, next) => {
  try {
    const origin = req.headers.origin;

    if (!origin) return next();

    const tenant = req.tenant;

    if (tenant?.allowedOrigins?.length > 0) {
      const allowed = isOriginAllowed(origin, tenant.allowedOrigins);

      if (!allowed) {
        logger.warn(
          {
            tenant: tenant.name,
            origin,
          },
          'CORS blocked'
        );

        return res.status(403).json({
          error: 'CORS_POLICY_VIOLATION',
          message: `Origin '${origin}' is not allowed for this tenant`,
        });
      }
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  } catch (err) {
    logger.error({ err }, 'CORS validation failed');
    return res.status(500).json({ error: 'Internal Security Error' });
  }
};
