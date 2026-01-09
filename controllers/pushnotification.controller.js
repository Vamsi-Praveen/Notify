import Device from '../models/device.model.js';
import PushConfig from '../models/pushnotification.model.js';
import PushApp from '../models/pushApp.model.js';
import logger from '../utils/logger.js';

export const registerDevice = async (req, res) => {
  try {
    const { tenantId, fcmToken, platform, appId, user, deviceInfo } = req.body;

    if (!tenantId || !fcmToken || !platform || !appId) {
      return res
        .status(400)
        .json({ message: 'Missing required fields: tenantId, fcmToken, platform, appId' });
    }

    if (user && !user.userId && !user.email && !user.username) {
      return res.status(400).json({
        message: 'User must contain at least one identifier (userId, email, or username)',
      });
    }

    // Check if there is a configured PushApp for this specific appId
    const pushApp = await PushApp.findOne({ tenantId, appId, isActive: true });

    // Fallback to global PushConfig if no specific app is found (backward compatibility)
    let pushConfig = null;
    if (!pushApp) {
      pushConfig = await PushConfig.findOne({ tenantId, enabled: true });
    }

    if (!pushApp && !pushConfig) {
      return res
        .status(404)
        .json({ message: 'Push configuration not found or disabled for this tenant/app' });
    }

    if (!['android', 'ios', 'web'].includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    const device = await Device.findOneAndUpdate(
      { fcmToken },
      {
        tenantId,
        platform,
        appId,
        ...(user && { user }),
        deviceInfo,
        status: 'active',
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: 'Device registered successfully', data: device });
  } catch (error) {
    logger.error('Error registering device:', error);
    return res.status(500).json({ message: 'Failed to register device' });
  }
};

export const deregisterDevice = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'Missing required field: fcmToken' });
    }

    const device = await Device.findOneAndDelete({ fcmToken });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    return res.status(200).json({ message: 'Device deregistered successfully', data: device });
  } catch (error) {
    logger.error('Error deregistering device:', error);
    return res.status(500).json({ message: 'Failed to deregister device' });
  }
};
