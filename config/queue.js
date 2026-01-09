import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';

let notificationQueue;

export const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const initQueue = async () => {
  logger.info('Initializing Notification Queue');

  notificationQueue = new Queue('notifications', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 50 },
      removeOnFail: false,
    },
  });

  return notificationQueue;
};

export const getQueue = () => {
  if (!notificationQueue) {
    throw new Error('Queue not initialized! Call initQueue() first.');
  }
  return notificationQueue;
};

export const closeQueue = async () => {
  logger.info('Closing Notification Queue');

  if (notificationQueue) {
    await notificationQueue.close();
  }

  await connection.quit();
};
