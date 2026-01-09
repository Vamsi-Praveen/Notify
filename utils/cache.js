import IORedis from 'ioredis';
import logger from './logger.js';

export const cacheClient = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    return Math.min(times * 50, 30000);
  },
});

cacheClient.on('error', (err) => {
  logger.debug({ err: err.message }, 'Redis Cache Client offline');
});

cacheClient.on('connect', () => {
  logger.info('Redis Cache Client Connected');
});

const DEFAULT_TTL = 3600;

export const getCache = async (key) => {
  if (cacheClient.status !== 'ready') return null;

  try {
    const data = await cacheClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.debug({ key, err: err.message }, 'Redis Get skipped (offline)');
    return null;
  }
};

export const setCache = async (key, value, ttl = DEFAULT_TTL) => {
  if (cacheClient.status !== 'ready') return;

  try {
    await cacheClient.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    logger.debug({ key, err: err.message }, 'Redis Set skipped (offline)');
  }
};

export const delCache = async (key) => {
  if (cacheClient.status !== 'ready') return;

  try {
    await cacheClient.del(key);
  } catch (err) {
    logger.debug({ key, err: err.message }, 'Redis Del skipped (offline)');
  }
};

export const delCacheByPattern = async (pattern) => {
  if (cacheClient.status !== 'ready') return;

  try {
    let cursor = '0';
    do {
      const [newCursor, keys] = await cacheClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await cacheClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.debug({ pattern, err: err.message }, 'Redis DelByPattern skipped (offline)');
  }
};
