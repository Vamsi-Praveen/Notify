import Tenant from '../models/tenant.model.js';

export const adminAuth = async (req, res, next) => {
  if (req.session && req.session.admin) {
    req.user = req.session.admin;
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized: Admin authentication required' });
};
