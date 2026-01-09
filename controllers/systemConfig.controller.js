import SystemConfig from '../models/systemConfig.model.js';
import { delCacheByPattern } from '../utils/cache.js';
import logger from '../utils/logger.js';

export const getSystemConfig = async (req, res) => {
  try {
    const systemConfig = await SystemConfig.findOne();

    if (!systemConfig) {
      return res.status(404).json({ message: 'System configuration not found' });
    }

    return res.status(200).json(systemConfig);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching system config');
    return res.status(500).json({ message: 'Error fetching system config' });
  }
};

export const updateSystemConfig = async (req, res) => {
  try {
    const { smtp, teams, slack, telegram, sms, pushNotification } = req.body;

    let systemConfig = await SystemConfig.findOne();

    if (systemConfig) {
      systemConfig.smtp = smtp || systemConfig.smtp;
      systemConfig.teams = teams || systemConfig.teams;
      systemConfig.slack = slack || systemConfig.slack;
      systemConfig.telegram = telegram || systemConfig.telegram;
      systemConfig.sms = sms || systemConfig.sms;
      systemConfig.pushNotification = pushNotification || systemConfig.pushNotification;

      await systemConfig.save();
    } else {
      systemConfig = new SystemConfig({
        smtp,
        teams,
        slack,
        telegram,
        sms,
        pushNotification,
      });
      await systemConfig.save();
    }
    if (smtp || teams || slack || telegram || sms || pushNotification) {
      await delCacheByPattern('system:*');
    }

    logger.info('System configuration updated successfully');

    return res.status(200).json(systemConfig);
  } catch (error) {
    logger.error({ err: error }, 'Error updating system config');
    return res.status(500).json({ message: 'Error updating system config' });
  }
};
