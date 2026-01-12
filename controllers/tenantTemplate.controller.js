import Integration from '../models/integration.model.js';
import Tenant from '../models/tenant.model.js';
import Template from '../models/template.model.js';
import { delCacheByPattern } from '../utils/cache.js';
import logger from '../utils/logger.js';

export const getNewTemplateForm = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const integrations = await Integration.find({ tenantId }).lean();

    const tenant = await Tenant.findOne({ _id: tenantId }).lean();

    res.render('client/clientLayout', {
      title: 'Create Template',
      body: '../client/templateForm',
      path: '/tenant/templates',
      tenant: tenant || req.session.tenant, // Fallback to session if fetch fails, though it shouldn't
      template: {},
      integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading new template form');
    res.status(500).send('Error loading form');
  }
};

export const getEditTemplateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.session.tenant._id;

    const template = await Template.findOne({ _id: id, tenantId }).lean();
    if (!template) {
      return res.status(404).send('Template not found');
    }

    const integrations = await Integration.find({ tenantId }).lean();

    const currentTenant = await Tenant.findOne({ _id: tenantId }).lean();

    res.render('client/clientLayout', {
      title: 'Edit Template',
      body: '../client/templateForm',
      path: '/tenant/templates',
      tenant: currentTenant || req.session.tenant,
      template,
      integrations,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading edit template form');
    res.status(500).send('Error loading form');
  }
};

export const createTemplate = async (req, res) => {
  try {
    const tenantId = req.session.tenant._id;
    const { name, type, subject, body, integration, fields, isPublished } = req.body;

    logger.info({ tenantId, name, type }, 'Creating new template');

    const template = new Template({
      tenantId,
      name,
      type,
      subject,
      body,
      integration: integration || null,
      fields,
      isPublished: !!isPublished,
    });

    await template.save();

    // Invalidate caches
    await delCacheByPattern(`templates:${tenantId}:*`);

    logger.info({ tenantId, templateId: template._id }, 'Template created successfully');
    return res.status(201).json(template);
  } catch (error) {
    logger.error({ err: error }, 'Error creating template');
    return res.status(500).json({ message: 'Error creating template' });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.session.tenant._id;
    const { name, type, subject, body, integration, fields, isPublished } = req.body;

    logger.info({ tenantId, templateId: id }, 'Updating template');

    const template = await Template.findOneAndUpdate(
      { _id: id, tenantId },
      {
        name,
        type,
        subject,
        body,
        integration: integration || null,
        fields,
        isPublished: !!isPublished,
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Invalidate caches
    await delCacheByPattern(`templates:${tenantId}:*`);
    await delCacheByPattern(`workflows:${tenantId}:*`);
    await delCacheByPattern(`workflows:global:*`); // Just in case, though tenant templates likely affect tenant workflows

    logger.info({ tenantId, templateId: id }, 'Template updated successfully');
    return res.status(200).json(template);
  } catch (error) {
    logger.error({ err: error, templateId: req.params.id }, 'Error updating template');
    return res.status(500).json({ message: 'Error updating template' });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.session.tenant._id;

    logger.info({ tenantId, templateId: id }, 'Deleting template');

    const template = await Template.findOneAndDelete({ _id: id, tenantId });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Invalidate caches
    await delCacheByPattern(`templates:${tenantId}:*`);
    await delCacheByPattern(`workflows:${tenantId}:*`);

    logger.info({ tenantId, templateId: id }, 'Template deleted successfully');
    return res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error({ err: error, templateId: req.params.id }, 'Error deleting template');
    return res.status(500).json({ message: 'Error deleting template' });
  }
};
