import mongoose from 'mongoose';

const PushAppSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    appId: {
      type: String, // e.g., com.example.app
      required: true,
    },
    firebaseConfig: {
      projectId: { type: String, required: true },
      clientEmail: { type: String, required: true },
      privateKey: { type: String, required: true, select: false }, // Hide by default
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'both'],
      default: 'both', // Metadata mostly
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure appId is unique per tenant
PushAppSchema.index({ tenantId: 1, appId: 1 }, { unique: true });

export default mongoose.model('PushApp', PushAppSchema);
