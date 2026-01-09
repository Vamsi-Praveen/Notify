import Admin from '../models/admin.model.js';
import Tenant from '../models/tenant.model.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const adminId = req.session.admin.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    const admin = await Admin.findById(adminId).select('+passwordHash');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    admin.passwordHash = newPassword; // Pre-save hook will hash it
    await admin.save();

    logger.info({ adminId }, 'Admin password changed successfully');
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Error changing admin password');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const changeTenantPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const tenantId = req.session.tenant._id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    const tenant = await Tenant.findById(tenantId).select('+passwordHash');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const isMatch = await tenant.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    tenant.passwordHash = newPassword;
    await tenant.save();

    logger.info({ tenantId }, 'Tenant password changed successfully');
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Error changing tenant password');
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
