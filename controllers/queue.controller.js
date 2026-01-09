import { getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

export const getQueuePage = async (req, res) => {
  return res.render('layout', {
    title: 'Queue Management',
    path: '/admin/queue',
    body: 'admin/queue',
  });
};

export const getQueueStats = async (req, res) => {
  try {
    const queue = getQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    // Fetch latest jobs from active, waiting, failed, and completed states
    const activeJobs = await queue.getJobs(['active'], 0, 9, false);
    const waitingJobs = await queue.getWaiting(0, 9);
    const failedJobs = await queue.getFailed(0, 9);
    const completedJobs = await queue.getJobs(['completed'], 0, 9, false);

    const mapJob = (job, state) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      state,
    });

    return res.json({
      stats: { waiting, active, completed, failed, delayed },
      jobs: [
        ...activeJobs.map((j) => mapJob(j, 'active')),
        ...waitingJobs.map((j) => mapJob(j, 'waiting')),
        ...failedJobs.map((j) => mapJob(j, 'failed')),
        ...completedJobs.map((j) => mapJob(j, 'completed')),
      ].sort((a, b) => b.timestamp - a.timestamp),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch queue stats');
    return res.status(500).json({ message: 'Failed to fetch queue data' });
  }
};

export const retryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const queue = getQueue();
    const job = await queue.getJob(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await job.retry();
    return res.json({ message: 'Job scheduled for retry' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const queue = getQueue();
    const job = await queue.getJob(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await job.remove();
    return res.json({ message: 'Job removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
