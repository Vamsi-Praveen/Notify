import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const tenantSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    allowedChannels: { type: [String], default: ['in-app'] },
    allowedOrigins: { type: [String], default: [] },
    allowedIps: { type: [String], default: [] },
    maxPriority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    rateLimitPoints: { type: Number, default: 100 }, // Requests
    rateLimitDuration: { type: Number, default: 900 }, // Seconds (15m)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tenantSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

tenantSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
