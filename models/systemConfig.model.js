import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  smtp: {
    host: String,
    port: Number,
    userName: String,
    password: String,
    fromEmail: String,
    displayName: String,
    enableSSL: Boolean,
  },
  teams: {
    tenantId: String,
    clientSecret: String,
    clientId: String,
    scope: String,
    grantType: String,
    tokenUrl: String,
    isActive: Boolean,
  },
  slack: {
    slackAppName: String,
    slackWebhookURL: String,
    slackChannelName: String,
    slackBotToken: String,
    slackBotName: String,
    slackBaseAddress: String,
    isActive: Boolean,
  },
  telegram: {
    botName: String,
    botToken: String,
    webhookUrl: String,
    secretToken: String,
    isActive: Boolean,
  },
  sms: {
    twilio: {
      accountSid: String,
      authToken: String,
      fromNumber: String,
    },
  },
  pushNotification: {
    firebase: {
      apiKey: String,
      authDomain: String,
      projectId: String,
      storageBucket: String,
      messagingSenderId: String,
      appId: String,
    },
  },
});

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
export default SystemConfig;
