import mongoose from 'mongoose';

const IntegrationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['email', 'slack', 'telegram', 'sms', 'push', 'webhook', 'teams'],
      required: true,
    },
    credentials: {
      type: Object,
      required: false,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

IntegrationSchema.index({ tenantId: 1, type: 1 });

export default mongoose.model('Integration', IntegrationSchema);
