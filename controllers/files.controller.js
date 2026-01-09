import multer from 'multer';
import { uploadFile } from '../services/minioService.js';
import logger from '../utils/logger.js';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file');

export const uploadFileHandler = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      logger.error({ err }, 'File upload error');
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const url = await uploadFile(req.file);
      return res.status(200).json({ success: true, url });
    } catch (error) {
      logger.error({ error }, 'Error uploading file to MinIO');
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};
