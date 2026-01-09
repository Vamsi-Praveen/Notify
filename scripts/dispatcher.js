import dotenv from 'dotenv';
import { connectToDB } from '../config/db.js';
import { initQueue } from '../config/queue.js';
import { reprocessStuckEvents } from '../cron/reprocess.js';
import logger from '../utils/logger.js';

dotenv.config();

const startDispatcher = async () => {
  try {
    await connectToDB();
    await initQueue();

    logger.info('Dispatcher started');

    setInterval(async () => {
      try {
        await reprocessStuckEvents();
      } catch (err) {
        logger.error({ err }, 'Dispatcher error');
      }
    }, 30 * 1000);
  } catch (error) {
    logger.fatal({ error }, 'Failed to start dispatcher');
    process.exit(1);
  }
};

startDispatcher();
