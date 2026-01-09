import Log from '../models/log.model.js';
import logger from '../utils/logger.js';

const PIXEL_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const trackEmailOpen = async (req, res) => {
  const { logId } = req.params;

  try {
    await Log.findByIdAndUpdate(logId, {
      status: 'opened',
      openedAt: new Date(),
    });
    logger.info(`Email Opened! Log ID: ${logId}`);
  } catch (error) {
    logger.error({ error }, `Tracking Error`);
  }

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': PIXEL_BUFFER.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  });
  return res.end(PIXEL_BUFFER);
};
