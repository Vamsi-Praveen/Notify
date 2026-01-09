import * as inAppService from '../services/inAppService.js';
import logger from '../utils/logger.js';

export const getMessages = async (req, res) => {
  try {
    const result = await inAppService.getMessages({
      tenantId: req.tenant._id,
      userId: req.params.userId,
      unreadOnly: req.query.unreadOnly === 'true',
    });

    return res.json(result);
  } catch (err) {
    logger.error({ err, path: req.originalUrl }, 'Get messages failed');

    return res.status(500).json({
      error: 'Failed to fetch messages',
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const result = await inAppService.markMessageAsRead({
      tenantId: req.tenant._id,
      messageId: req.params.messageId,
    });

    return res.json(result);
  } catch (err) {
    logger.error({ err, path: req.originalUrl }, 'Mark as read failed');

    return res.status(err.statusCode || 500).json({
      error: err.message || 'Failed to update message',
    });
  }
};
