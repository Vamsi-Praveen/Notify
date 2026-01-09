import { getQueue } from '../config/queue.js';
import Notification from '../models/notification.model.js';
import logger from '../utils/logger.js';

const PRIORITY_MAP = {
  critical: 1,
  high: 3,
  medium: 5,
  low: 10,
};

export const reprocessStuckEvents = async () => {
  let queue;

  try {
    queue = getQueue();
  } catch {
    logger.warn('Redis unavailable. Skipping dispatch.');
    return;
  }

  const events = await Notification.find({
    status: 'PENDING',
  })
    .limit(100)
    .lean();

  if (!events.length) return;

  logger.info(`Dispatching ${events.length} events`);

  const jobs = events.map((e) => ({
    name: 'notification-job',
    data: {
      logId: e._id,
      tenantId: e.tenantId,
      eventName: e.eventName,
      data: e.data,
      user: e.user,
    },
    opts: {
      jobId: e._id.toString(),
      priority: PRIORITY_MAP[e.priority || 'medium'],
    },
  }));

  try {
    await queue.addBulk(jobs);

    await Notification.updateMany({ _id: { $in: events.map((e) => e._id) } }, { status: 'QUEUED' });

    logger.info('Events queued successfully');
  } catch (err) {
    logger.error({ err }, 'Dispatch failed');
  }
};
