import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectToDB } from '../config/db.js';
import { getQueue, initQueue } from '../config/queue.js';
import { reprocessStuckEvents } from '../cron/reprocess.js';
import logger from '../utils/logger.js';
import { startWorker } from '../worker/worker.js';

dotenv.config();

const startReprocessLoop = () => {
  const runLoop = async () => {
    try {
      await reprocessStuckEvents();
    } catch (error) {
      logger.error({ err: error }, 'Reprocess Job Failed');
    } finally {
      setTimeout(runLoop, 60000);
    }
  };

  logger.info('Reprocess Scheduler started');
  runLoop();
};

const run = async () => {
  try {
    logger.info('Worker Process Starting...');

    await connectToDB();
    await initQueue();
    const queue = getQueue();
    await queue.resume();

    startWorker();
    logger.info('Worker is now processing jobs from Redis.');

    startReprocessLoop();
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down worker...`);

      try {
        const queue = getQueue();

        await queue.pause(true);
        logger.info('Queue paused.');

        await queue.close();
        logger.info('Redis connection closed.');

        await mongoose.disconnect();
        logger.info('Database disconnected.');

        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Worker failed to start');
    process.exit(1);
  }
};

run();
