import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
dotenv.config();

export const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.fatal({ err }, 'MongoDB connection failed');
    process.exit(1);
  }
};
