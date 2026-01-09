import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  triggerEvent: { type: String },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
  status: { type: String },
  metadata: { type: Object },
  response: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Log', LogSchema);
