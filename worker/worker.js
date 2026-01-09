import { QueueEvents, Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import Notification from '../models/notification.model.js';
import Workflow from '../models/workflow.model.js';
import Integration from '../models/integration.model.js';
import Tenant from '../models/tenant.model.js';
import Template from '../models/template.model.js';
import logger from '../utils/logger.js';

import * as emailService from '../services/emailService.js';
import * as telegramService from '../services/telegramService.js';
import * as webhookService from '../services/webhookService.js';
import * as smsService from '../services/smsService.js';

import { getCache, setCache } from '../utils/cache.js';

const processJob = async (job) => {
  const { logId, tenantId, eventName, data, user } = job.data;

  // if (user) data.user = user;
  let mergedData = { ...data, ...user };

  logger.info({ jobId: job.id, tenantId, eventName }, 'Processing job');

  const TENANT_CACHE_KEY = `workflows:${tenantId}:${eventName}`;
  const GLOBAL_CACHE_KEY = `workflows:global:${eventName}`;

  let tenantWorkflows = await getCache(TENANT_CACHE_KEY);
  if (!tenantWorkflows) {
    const dbWorkflows = await Workflow.find({
      tenantId,
      triggerEvent: eventName,
      active: true,
    })
      .populate('actions.integration')
      .populate({
        path: 'actions.template',
        populate: { path: 'integration' },
      });
    tenantWorkflows = dbWorkflows.map((wf) => wf.toObject());
    await setCache(TENANT_CACHE_KEY, tenantWorkflows, 600);
  }

  let globalWorkflows = await getCache(GLOBAL_CACHE_KEY);
  if (!globalWorkflows) {
    const dbGlobalWorkflows = await Workflow.find({
      tenantId: null,
      triggerEvent: eventName,
      active: true,
    })
      .populate('actions.integration')
      .populate({
        path: 'actions.template',
        populate: { path: 'integration' },
      });
    globalWorkflows = dbGlobalWorkflows.map((wf) => wf.toObject());
    await setCache(GLOBAL_CACHE_KEY, globalWorkflows, 600);
  }

  const workflows = [...tenantWorkflows, ...globalWorkflows];

  if (!workflows.length) {
    await markDelivered(logId);
    return;
  }

  try {
    for (const workflow of workflows) {
      if (!evaluateRules(data, workflow.rules)) continue;

      for (const action of workflow.actions) {
        let integration = action.integration;

        // 1. If workflow doesn't override, check template default
        if (!integration && action.template && action.template.integration) {
          integration = action.template.integration;
        }

        // 2. If still no integration, try auto-detect by type
        if (!integration) {
          integration = await Integration.findOne({
            tenantId,
            type: action.template.type,
            active: true,
          }).lean();
        }

        // 3. If still no integration, create a virtual "system default" integration
        // This allows using global system credentials (e.g., system SMTP)
        if (!integration) {
          logger.info(
            { tenantId, templateType: action.template.type },
            'No custom integration found, using system default'
          );
          integration = {
            _id: 'system-default',
            type: action.template.type,
            tenantId: null,
            credentials: null, // Will trigger system default in service layer
            active: true,
          };
        }

        await executeIntegration(integration, action.template, mergedData);
      }
    }

    await markDelivered(logId);
  } catch (err) {
    logger.error({ logId, err }, 'Notification delivery failed');
    await markFailed(logId);
    throw err;
  }
};

const executeIntegration = async (integration, template, data) => {
  switch (integration.type) {
    case 'email':
      return emailService.sendEmail(integration, template, data);
    case 'webhook':
      return webhookService.sendWebhook(integration, template, data);
    case 'telegram':
      return telegramService.sendTelegram(integration, template, data);
    case 'sms':
      return smsService.sendSms(integration, template, data);
    default:
      logger.warn({ integrationType: integration.type }, 'Unsupported integration type');
  }
};

const markDelivered = async (logId) => {
  if (!logId) return;
  await Notification.findByIdAndUpdate(logId, {
    status: 'DELIVERED',
    deliveredAt: new Date(),
  });
};

const markFailed = async (logId) => {
  if (!logId) return;
  await Notification.findByIdAndUpdate(logId, {
    status: 'FAILED',
    deliveredAt: new Date(),
  });
};

const evaluateRules = (data, rules) => {
  if (!rules?.length) return true;

  return rules.every((rule) => {
    const actualValue = rule.field.split('.').reduce((o, i) => (o ? o[i] : undefined), data);
    const targetValue = rule.value;

    switch (rule.operator) {
      case 'equals':
        return String(actualValue) === String(targetValue);
      case 'not_equals':
        return String(actualValue) !== String(targetValue);
      case 'greater_than':
        return Number(actualValue) > Number(targetValue);
      case 'less_than':
        return Number(actualValue) < Number(targetValue);
      case 'contains':
        return String(actualValue).includes(String(targetValue));
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      default:
        return false;
    }
  });
};

export const startWorker = () => {
  logger.info('Starting Notification Worker');

  const worker = new Worker('notifications', processJob, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job permanently failed');
    if (job?.data?.logId) {
      await markFailed(job.data.logId);
    }
  });

  const queueEvents = new QueueEvents('notifications', { connection });
  queueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Job completed');
  });
};
