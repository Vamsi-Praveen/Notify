import handlebars from 'handlebars';
import logger from '../utils/logger.js';
import SystemConfig from '../models/systemConfig.model.js';
import { getCache, setCache } from '../utils/cache.js';

export const sendTelegram = async (integration, template, data) => {
  logger.info(
    { integrationId: integration._id, templateId: template._id },
    'Sending Telegram message'
  );

  try {
    let credentials = integration.credentials;

    if (!credentials?.botToken) {
      logger.info('Using system default Telegram credentials');

      const CACHE_KEY = 'system:telegram';
      let systemConfig = await getCache(CACHE_KEY);

      if (!systemConfig) {
        systemConfig = await SystemConfig.findOne();
        if (systemConfig) {
          await setCache(CACHE_KEY, systemConfig?.telegram, 86400);
        }
      }

      if (!systemConfig?.telegram?.botToken) {
        throw new Error('Telegram configuration not found in system config');
      }

      credentials = {
        botToken: systemConfig.telegram.botToken,
      };
    }

    const { botToken } = credentials;
    const chatId = data.chatId || data.telegramChatId;

    if (!chatId) {
      throw new Error('Recipient chatId not found in data');
    }

    const message = handlebars.compile(template.body)(data);

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', // Optional: default to HTML or Markdown?
      }),
    });

    const resData = await response.json();

    if (!response.ok || !resData.ok) {
      throw new Error(`Telegram API Error: ${resData.description || response.statusText}`);
    }

    logger.info({ messageId: resData.result.message_id }, 'Telegram message sent successfully');
    return { success: true, messageId: resData.result.message_id };
  } catch (error) {
    logger.error({ err: error }, 'Failed to send Telegram message');
    throw error;
  }
};
