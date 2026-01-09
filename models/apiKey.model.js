import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ApiKeySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  keyPrefix: { type: String, required: true }, // Store first few chars for identification
  keyHash: { type: String, required: true, unique: true }, // Store hashed key

  scopes: [
    {
      type: String,
    },
  ],
  allowedIps: { type: [String], default: [] },

  lastUsedAt: { type: Date },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

ApiKeySchema.index({ keyHash: 1 });

export default mongoose.model('ApiKey', ApiKeySchema);
