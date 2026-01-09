import mongoose from 'mongoose';

const InAppMessageSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: String, required: true },
  title: String,
  body: String,
  read: { type: Boolean, default: false },
  data: Object,
  createdAt: { type: Date, default: Date.now },
});

InAppMessageSchema.index({ tenantId: 1, userId: 1 });

export default mongoose.model('InAppMessage', InAppMessageSchema);
