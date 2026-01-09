import InAppMessage from '../models/inAppMessage.model.js';
import logger from '../utils/logger.js';

export const getMessages = async ({ tenantId, userId, unreadOnly = false, limit = 50 }) => {
  logger.debug({ tenantId, userId, unreadOnly }, 'Fetching in-app messages');

  try {
    const query = { tenantId, userId };
    if (unreadOnly) query.read = false;

    const messages = await InAppMessage.find(query).sort({ createdAt: -1 }).limit(limit);

    return {
      count: messages.length,
      messages,
    };
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Failed to fetch in-app messages');
    throw err;
  }
};

export const markMessageAsRead = async ({ tenantId, messageId }) => {
  logger.debug({ tenantId, messageId }, 'Marking message as read');

  try {
    const message = await InAppMessage.findOneAndUpdate(
      { _id: messageId, tenantId },
      { read: true },
      { new: true }
    );

    if (!message) {
      logger.warn({ tenantId, messageId }, 'Message not found');
      const err = new Error('Message not found');
      err.statusCode = 404;
      throw err;
    }

    return { success: true };
  } catch (err) {
    logger.error({ err, tenantId, messageId }, 'Failed to mark message as read');
    throw err;
  }
};
