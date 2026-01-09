import Twilio from 'twilio';
import logger from '../utils/logger.js';
import SystemConfig from '../models/systemConfig.model.js';

let twilioClient = null;
let fromNumber = null;

export const getTwilioClient = async () => {
  if (twilioClient && fromNumber) {
    return { client: twilioClient, fromNumber };
  }

  try {
    const config = await SystemConfig.findOne().lean();

    if (!config || !config.sms || !config.sms.twilio) {
      throw new Error('Twilio configuration not found in SystemConfig');
    }

    const { accountSid, authToken, fromNumber: senderNumber } = config.sms.twilio;

    if (!accountSid || !authToken || !senderNumber) {
      throw new Error('Incomplete Twilio credentials in SystemConfig');
    }

    twilioClient = new Twilio(accountSid, authToken);
    fromNumber = senderNumber;

    logger.info('Twilio client initialized successfully from database config');

    return { client: twilioClient, fromNumber };
  } catch (error) {
    logger.error('Failed to initialize Twilio client', error);
    throw error;
  }
};
