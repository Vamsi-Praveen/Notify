import handlebars from 'handlebars';
import Template from '../models/template.model.js';
import { delCache, delCacheByPattern, getCache, setCache } from '../utils/cache.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 3600;

export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      type,
      subject,
      body,
      meta,
      fields,
      isPublished,
      tenantId: bodyTenantId,
    } = req.body;

    // Explicit tenant selection for admin, or fallback if middleware used in tenant context
    const tenantId = bodyTenantId || (req.tenant ? req.tenant._id : null);

    logger.info({ tenantId, name, type }, 'Creating new template');

    const template = new Template({
      tenantId,
      name,
      type,
      subject,
      body,
      meta,
      fields,
      isPublished: isPublished || false,
    });

    await template.save();

    // Invalidate template list caches
    const tenantIdKey = tenantId || 'admin';
    await delCacheByPattern(`templates:${tenantIdKey}:*`);

    logger.info({ tenantId, templateId: template._id }, 'Template created successfully');

    return res.status(201).json(template);
  } catch (error) {
    logger.error({ err: error }, 'Error creating template');
    return res.status(500).json({ message: 'Error creating template' });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10), 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10), 1), 50);

    // If req.tenant exists, it's a tenant request. Otherwise, it might be an admin request.
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    const cacheKey = `templates:${tenantId || 'admin'}:page:${pageNum}:limit:${limitNum}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      logger.info({ tenantId, page: pageNum, limit: limitNum }, 'Returning templates from cache');
      return res.status(200).json(cachedData);
    }

    logger.info({ tenantId, page: pageNum, limit: limitNum }, 'Fetching templates');

    let query = {};
    if (req.tenant) {
      // Tenant view: own templates + published
      query = { $or: [{ tenantId: req.tenant._id }, { isPublished: true }] };
    } else if (isAdmin) {
      // Admin view: all templates
      query = {};
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const templates = await Template.find(query)
      .lean()
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Template.countDocuments(query);

    const response = {
      templates,
      currentPage: Number(pageNum),
      totalPages: Math.ceil(total / limitNum),
      totalTemplates: total,
    };

    await setCache(cacheKey, response, 300);

    logger.info({ tenantId, count: templates.length, total }, 'Templates fetched successfully');

    return res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching templates');
    return res.status(500).json({ message: 'Error fetching templates' });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    const cacheKey = `templates:${tenantId || 'admin'}:${id}`;
    const cachedTemplate = await getCache(cacheKey);

    if (cachedTemplate) {
      logger.info({ tenantId, templateId: id }, 'Returning template from cache');
      return res.status(200).json(cachedTemplate);
    }

    logger.info({ tenantId, templateId: id }, 'Fetching template by ID from DB');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const template = await Template.findOne(query);

    if (!template) {
      logger.warn({ tenantId, templateId: id }, 'Template not found');
      return res.status(404).json({ message: 'Template not found' });
    }

    await setCache(cacheKey, template, CACHE_TTL);

    return res.status(200).json(template);
  } catch (error) {
    logger.error({ err: error, templateId: req.params.id }, 'Error fetching template');
    return res.status(500).json({ message: 'Error fetching template' });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.session && req.session.admin;
    const {
      name,
      type,
      subject,
      body,
      meta,
      fields,
      isPublished,
      tenantId: bodyTenantId,
    } = req.body;

    const tenantId = bodyTenantId || (req.tenant ? req.tenant._id : null);

    logger.info({ tenantId, templateId: id }, 'Updating template');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const template = await Template.findOneAndUpdate(
      query,
      { name, type, subject, body, meta, fields, isPublished, tenantId },
      { new: true }
    );

    if (!template) {
      logger.warn({ tenantId, templateId: id }, 'Template not found for update');
      return res.status(404).json({ message: 'Template not found' });
    }

    // Invalidate caches
    const tenantIdKey = tenantId || 'admin';
    await delCacheByPattern(`templates:${tenantIdKey}:*`);
    // Workflow caches also need invalidation as they populate templates
    const workflowTenantIdKey = tenantId || 'global';
    await delCacheByPattern(`workflows:${workflowTenantIdKey}:*`);

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
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    logger.info({ tenantId, templateId: id }, 'Deleting template');

    const query = isAdmin ? { _id: id } : { _id: id, tenantId };
    const template = await Template.findOneAndDelete(query);

    if (!template) {
      logger.warn({ tenantId, templateId: id }, 'Template not found for deletion');
      return res.status(404).json({ message: 'Template not found' });
    }

    // Invalidate caches
    const tenantIdKey = tenantId || 'admin';
    await delCacheByPattern(`templates:${tenantIdKey}:*`);
    const workflowTenantIdKey = tenantId || 'global';
    await delCacheByPattern(`workflows:${workflowTenantIdKey}:*`);

    logger.info({ tenantId, templateId: id }, 'Template deleted successfully');

    return res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error({ err: error, templateId: req.params.id }, 'Error deleting template');
    return res.status(500).json({ message: 'Error deleting template' });
  }
};

export const renderTemplatePreview = async (req, res) => {
  try {
    const { templateId, data } = req.body;
    const tenantId = req.tenant ? req.tenant._id : null;
    const isAdmin = req.session && req.session.admin;

    logger.info({ tenantId, templateId }, 'Rendering template preview');

    let template;
    const cacheKey = `templates:${tenantId || 'admin'}:${templateId}`;
    const cachedTemplate = await getCache(cacheKey);

    if (cachedTemplate) {
      template = cachedTemplate;
    } else {
      const query = isAdmin ? { _id: templateId } : { _id: templateId, tenantId };
      template = await Template.findOne(query);
      if (template) {
        await setCache(cacheKey, template, CACHE_TTL);
      }
    }

    if (!template) {
      logger.warn({ tenantId, templateId }, 'Template not found for preview');
      return res.status(404).json({ message: 'Template not found' });
    }

    const compiledSubject = handlebars.compile(template.subject || '')(data);
    const compiledBody = handlebars.compile(template.body)(data);

    logger.info({ tenantId, templateId }, 'Template preview rendered successfully');

    return res.status(200).json({
      subject: compiledSubject,
      body: compiledBody,
    });
  } catch (error) {
    logger.error(
      { err: error, templateId: req.body.templateId },
      'Error rendering template preview'
    );
    return res.status(500).json({ message: 'Error rendering template preview' });
  }
};
