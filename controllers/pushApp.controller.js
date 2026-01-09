import PushApp from '../models/pushApp.model.js';
import Tenant from '../models/tenant.model.js';

// Get all apps for the logged-in tenant
export const getApps = async (req, res) => {
  try {
    const apps = await PushApp.find({ tenantId: req.session.tenant._id }).sort({ createdAt: -1 });
    // Use a lightweight projection if needed, but for now full object is fine (privateKey is hidden)
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching apps', error: error.message });
  }
};

// Create a new app
export const createApp = async (req, res) => {
  try {
    const { name, appId, platform, serviceAccountJson } = req.body;

    if (!name || !appId || !serviceAccountJson) {
      return res
        .status(400)
        .json({ message: 'Name, App ID, and Service Account JSON are required' });
    }

    // Basic JSON validation
    let firebaseConfig;
    try {
      const parsed = JSON.parse(serviceAccountJson);
      firebaseConfig = {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };

      if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
        throw new Error('Invalid Service Account JSON: Missing core fields');
      }
    } catch (e) {
      return res
        .status(400)
        .json({ message: 'Invalid Service Account JSON format', error: e.message });
    }

    // Check for duplicate App ID for this tenant
    const existing = await PushApp.findOne({ tenantId: req.session.tenant._id, appId });
    if (existing) {
      return res.status(409).json({ message: `App ID "${appId}" already exists` });
    }

    const newApp = await PushApp.create({
      tenantId: req.session.tenant._id,
      name,
      appId,
      platform: platform || 'both',
      firebaseConfig,
    });

    res.status(201).json({ message: 'Push App configured successfully', app: newApp });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating app', error: error.message });
  }
};

// Update an app
export const updateApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, platform, serviceAccountJson } = req.body;

    const app = await PushApp.findOne({ _id: id, tenantId: req.session.tenant._id });
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    if (name) app.name = name;
    if (platform) app.platform = platform;
    if (typeof isActive !== 'undefined') app.isActive = isActive;

    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        app.firebaseConfig = {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      } catch (e) {
        return res.status(400).json({ message: 'Invalid Service Account JSON' });
      }
    }

    await app.save();
    res.json({ message: 'App updated', app });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

// Delete an app
export const deleteApp = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await PushApp.deleteOne({ _id: id, tenantId: req.session.tenant._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'App not found' });
    }

    res.json({ message: 'App removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};
