import logger from '../utils/logger.js';

export const sendWebhook = async (integration, template, data) => {
  logger.info({ integrationId: integration._id }, 'Sending webhook...');

  try {
    const { url, headers, method = 'POST' } = integration.credentials || {};

    if (!url) {
      throw new Error('Webhook URL not configured in credentials');
    }

    const payload = {
      event: data.eventName,
      timestamp: new Date().toISOString(),
      data: data,
    };

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    logger.info({ status: response.status }, 'Webhook sent successfully');
    return { success: true, status: response.status };
  } catch (error) {
    logger.error({ err: error }, 'Failed to send webhook');
    throw error;
  }
};
