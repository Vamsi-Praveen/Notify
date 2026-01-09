import PushApp from '../../models/pushApp.model.js';

export const renderPushApps = async (req, res) => {
  try {
    const apps = await PushApp.find({ tenantId: req.session.tenant._id }).sort({ createdAt: -1 });
    res.render('client/clientLayout', {
      title: 'Mobile Apps',
      body: '../client/pushApps/index',
      path: '/tenant/push-apps',
      tenant: req.session.tenant,
      apps,
    });
  } catch (error) {
    res.status(500).send('Error loading apps');
  }
};

export const renderPushAppForm = async (req, res) => {
  try {
    const { id } = req.params;
    let app = null;
    if (id) {
      app = await PushApp.findOne({ _id: id, tenantId: req.session.tenant._id });
      if (!app) return res.redirect('/tenant/push-apps');
    }
    res.render('client/clientLayout', {
      title: id ? 'Edit App' : 'New App',
      body: '../client/pushApps/form',
      path: '/tenant/push-apps',
      tenant: req.session.tenant,
      app: app || {},
    });
  } catch (error) {
    res.status(500).send('Error loading form');
  }
};
