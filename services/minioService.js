import logger from '../utils/logger.js';
import { minioClient } from '../utils/minio.js';

export const ensureBucketExists = async () => {
  try {
    const isBucketExists = await minioClient.bucketExists('notify-files');
    if (!isBucketExists) {
      await minioClient.makeBucket('notify-files');
    }
  } catch (error) {
    logger.error({ error }, 'Error checking bucket:');
  }
};

export const uploadFile = async (file) => {
  const bucketName = 'notify-files';

  const fileName = `${Date.now()}-${file.originalname}`;

  await minioClient.putObject(bucketName, fileName, file.buffer);

  const url = await minioClient.presignedGetObject(bucketName, fileName, 7 * 24 * 60 * 60);

  return url;
};
