import Log from '../models/log.model.js';
import Notification from '../models/notification.model.js';
import logger from '../utils/logger.js';

export const getDashboard = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;

    // Aggregate stats
    const stats = await Log.aggregate([
      { $match: { tenantId: tenantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      sent: 0,
      failed: 0,
      pending: 0,
      total: 0,
    };

    stats.forEach((s) => {
      if (s._id === 'SENT' || s._id === 'DELIVERED') formattedStats.sent += s.count;
      else if (s._id === 'FAILED') formattedStats.failed += s.count;
      else formattedStats.pending += s.count;
      formattedStats.total += s.count;
    });

    // Recent logs
    const recentLogs = await Log.find({ tenantId })
      .populate('workflowId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.render('client/dashboard', {
      title: 'Tenant Dashboard',
      stats: formattedStats,
      recentLogs,
      tenant: req.session.tenant,
      path: '/dashboard',
    });
  } catch (err) {
    logger.error({ err }, 'Error loading tenant dashboard');
    return res.status(500).send('Error loading dashboard');
  }
};
