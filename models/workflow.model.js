import mongoose from 'mongoose';

const WorkflowSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  name: { type: String, required: true },
  triggerEvent: { type: String, required: true },
  actions: [
    {
      template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
      integration: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration' },
    },
  ],
  rules: [
    {
      field: String,
      operator: String,
      value: String,
    },
  ],
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  active: { type: Boolean, default: true },
});

export default mongoose.model('Workflow', WorkflowSchema);
