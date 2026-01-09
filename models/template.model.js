import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
  },
  integration: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration' },

  subject: { type: String },
  body: { type: String, required: true },
  fields: { type: [String], default: [] },
  isPublished: { type: Boolean, default: false },
  meta: { type: Object },

  createdAt: { type: Date, default: Date.now },
});
TemplateSchema.index({ tenantId: 1, type: 1, name: 1, isPublished: 1 });

export default mongoose.model('Template', TemplateSchema);
