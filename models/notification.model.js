import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    eventName: { type: String, required: true },
    data: { type: Object },
    user: { type: Object },

    status: {
      type: String,
      enum: ['PENDING', 'QUEUED', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    jobId: { type: String },
    error: { type: String },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ event: 1 });

export default mongoose.model('Notification', notificationSchema);
