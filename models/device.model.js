import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    user: {
      email: { type: String },
      username: { type: String },
      userId: { type: String },
    },

    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      required: true,
      index: true,
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    appId: {
      type: String,
      required: true,
      index: true,
    },

    deviceInfo: {
      deviceId: String,
      model: String,
      osVersion: String,
      appVersion: String,
      language: String,
      timezone: String,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active',
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DeviceSchema.index({ tenantId: 1, userId: 1 });
DeviceSchema.index({ tenantId: 1, appId: 1, platform: 1 });
DeviceSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model('Device', DeviceSchema);
