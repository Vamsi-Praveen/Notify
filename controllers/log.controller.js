import Log from '../models/log.model.js';
import logger from '../utils/logger.js';

export const getLogs = async (req, res) => {
  try {
    const limit = 50;
    const logs = await Log.find()
      .populate('tenantId', 'name')
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json(logs);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching logs');
    return res.status(500).json({ message: 'Error fetching logs' });
  }
};
