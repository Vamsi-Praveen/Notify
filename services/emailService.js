import handlebars from 'handlebars';
import { getSmtpConfig } from '../config/email.js';
import { getTransporter } from '../utils/emailTransporter.js';
import logger from '../utils/logger.js';

export const sendEmail = async (integration, template, data) => {
  logger.info({ integrationId: integration._id, templateId: template._id }, 'Sending email');

  try {
    const credentials = await getSmtpConfig(integration.credentials);
    const transporter = getTransporter(credentials);

    const toEmail = data.email || data.to || data.user?.email;
    if (!toEmail) {
      throw new Error('Recipient email not found');
    }

    const subject = handlebars.compile(template.subject)(data);
    const body = handlebars.compile(template.body)(data);

    const info = await transporter.sendMail({
      from: `"${credentials.fromName || 'Notification Service'}" <${
        credentials.fromEmail || credentials.user
      }>`,
      to: toEmail,
      subject,
      html: body,
      attachments: data.attachments || [],
    });

    logger.info({ messageId: info.messageId }, 'Email sent successfully');

    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error({ err }, 'Email sending failed');
    throw err;
  }
};
