import SystemConfig from '../models/systemConfig.model.js';
import { getCache, setCache } from '../utils/cache.js';
import logger from '../utils/logger.js';

const CACHE_KEY = 'system:smtp';

export const getSmtpConfig = async (integrationCredentials) => {
  if (integrationCredentials?.host && integrationCredentials?.user) {
    return integrationCredentials;
  }

  logger.info('Using system default SMTP credentials');

  try {
    const cached = await getCache(CACHE_KEY);
    if (cached) {
      return cached;
    }
    const systemConfig = await SystemConfig.findOne().lean();
    if (!systemConfig?.smtp) {
      throw new Error('System email configuration not found');
    }

    const credentials = {
      host: systemConfig.smtp.host,
      port: systemConfig.smtp.port,
      user: systemConfig.smtp.userName,
      pass: systemConfig.smtp.password,
      fromEmail: systemConfig.smtp.fromEmail,
      fromName: systemConfig.smtp.displayName,
    };

    await setCache(CACHE_KEY, credentials, 86400);
    return credentials;
  } catch (error) {
    logger.error('Error fetching SMTP config', error);
    throw error;
  }
};
