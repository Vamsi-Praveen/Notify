import dotenv from 'dotenv';
import app from '../app.js';
import { connectToDB } from '../config/db.js';
import { initQueue } from '../config/queue.js';
import logger from '../utils/logger.js';
import { ensureBucketExists } from '../services/minioService.js';
dotenv.config();

async function start() {
  try {
    logger.info('Starting Services');
    await connectToDB();
    logger.info('Database connected');

    try {
      await initQueue();
      logger.info('Notification Queue initialized');
    } catch (err) {
      logger.err({ err }, 'Notification Queue Intialization Failed');
    }
    await ensureBucketExists();
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start application');
    process.exit(1);
  }
}

start();
