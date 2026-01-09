import handlebars from 'handlebars';
import { getTwilioClient } from '../config/twilio.js';
import logger from '../utils/logger.js';

export const sendSms = async (integration, template, data) => {
  console.log(data);
  try {
    const { client, fromNumber } = await getTwilioClient();

    const to = data.mobile || data.to || data.user?.mobile;
    if (!to) {
      throw new Error('Recipient mobile number not found');
    }

    // Compile body with handlebars
    const body = handlebars.compile(template.body)(data);

    const message = await client.messages.create({
      body: body,
      from: fromNumber,
      to: to,
    });

    logger.info(`SMS sent successfully to ${to}. SID: ${message.sid}`);
    return message;
  } catch (error) {
    logger.error(`Error sending SMS: ${error.message}`, error);
    throw error;
  }
};
