import mongoose from 'mongoose';

const PushConfigSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
      unique: true,
    },

    provider: {
      type: String,
      enum: ['firebase'],
      default: 'firebase',
      required: true,
    },

    projectId: {
      type: String,
      required: true,
    },
    serviceAccount: {
      type: String,
      required: true,
    },
    
    platforms: {
      android: {
        type: Boolean,
        default: true,
      },
      ios: {
        type: Boolean,
        default: false,
      },
      web: {
        type: Boolean,
        default: false,
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

PushConfigSchema.index({ tenantId: 1, enabled: 1 });

export default mongoose.model('PushConfig', PushConfigSchema);
