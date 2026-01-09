import Notification from '../models/notification.model.js';
import Workflow from '../models/workflow.model.js';
import Tenant from '../models/tenant.model.js';
import { getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

const PRIORITY_MAP = {
  critical: 1,
  high: 3,
  medium: 5,
  low: 10,
};

const PRIORITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const RANK_TO_PRIORITY = ['critical', 'high', 'medium', 'low'];

export const ingestEvent = async (req, res) => {
  try {
    const { event, data, user } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Missing event name' });
    }

    const tenantId = req.tenant._id;

    // Determine Priority
    // 1. Get tenant's max priority
    const tenant = await Tenant.findById(tenantId).select('allowedChannels maxPriority');
    const tenantMaxRank = PRIORITY_RANK[tenant?.maxPriority || 'medium'];

    // 2. Find matching active workflows (tenant-specific + global)
    const workflows = await Workflow.find({
      $or: [{ tenantId }, { tenantId: null }],
      triggerEvent: event,
      active: true,
    }).populate('actions.template');

    const requiredDataFields = new Set();
    const requiredUserFields = new Set();
    let bestRank = PRIORITY_RANK['low']; // Default to lowest

    // Validation Errors Collection
    const validationErrors = [];

    if (workflows.length > 0) {
      workflows.forEach((wf) => {
        // Priority Calculation
        const wfRank = PRIORITY_RANK[wf.priority || 'medium'];
        if (wfRank < bestRank) bestRank = wfRank;

        // Validation Requirement Collection
        if (wf.actions) {
          wf.actions.forEach((action) => {
            const template = action.template;
            if (template) {
              const channel = template.type; // 'email', 'sms', 'in-app'

              // 1. Verify Tenant Allowed Channels
              if (tenant.allowedChannels && !tenant.allowedChannels.includes(channel)) {
                validationErrors.push(`Channel '${channel}' is not enabled for this tenant.`);
              }

              // Collect data fields
              if (template.fields && Array.isArray(template.fields)) {
                template.fields.forEach((field) => requiredDataFields.add(field));
              }
              // Collect user fields based on channel
              if (channel === 'email') requiredUserFields.add('email');
              if (channel === 'sms') requiredUserFields.add('mobile');
            }
          });
        }
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Channel Validation Failed',
        details: [...new Set(validationErrors)], // Remove duplicates
      });
    }

    // Perform Validation
    const missingFields = [];
    const requestData = data || {};
    const requestUser = user || {};

    // Check Template Fields (can be in data OR user object)
    requiredDataFields.forEach((field) => {
      const inData = requestData[field] !== undefined;
      const inUser = requestUser[field] !== undefined;

      if (!inData && !inUser) {
        missingFields.push(field);
      }
    });

    // Check Channel Specific Requirements (Strictly in User object)
    requiredUserFields.forEach((field) => {
      if (!requestUser[field]) {
        missingFields.push(`user.${field}`);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // 3. Cap by tenant's max permission
    if (bestRank < tenantMaxRank) {
      bestRank = tenantMaxRank;
    }

    const finalPriority = RANK_TO_PRIORITY[bestRank];

    const logEntry = await Notification.create({
      tenantId,
      eventName: event,
      data: data || {},
      user: user || {},
      status: 'PENDING',
      priority: finalPriority,
    });

    logger.info({ logId: logEntry._id, priority: finalPriority }, 'Event persisted');

    // Push to Queue immediately for real-time processing
    try {
      const queue = getQueue();
      await queue.add(
        'notifications',
        {
          logId: logEntry._id,
          tenantId: logEntry.tenantId,
          eventName: logEntry.eventName,
          data: logEntry.data,
          user: logEntry.user,
        },
        {
          jobId: logEntry._id.toString(),
          priority: PRIORITY_MAP[finalPriority],
        }
      );

      logEntry.status = 'QUEUED';
      await logEntry.save();
      logger.info({ logId: logEntry._id }, 'Event queued immediately');
    } catch (qErr) {
      logger.error(
        { err: qErr, logId: logEntry._id },
        'Immediate queuing failed, will be picked up by dispatcher'
      );
    }

    return res.status(202).json({
      status: 'accepted',
      eventId: logEntry._id,
      priority: finalPriority,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ingest API failed');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
