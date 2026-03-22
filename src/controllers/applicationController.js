const validator   = require('validator');
const Application = require('../models/Application');
const { sendEmail, templates } = require('../config/email');

// ── Helpers ──────────────────────────────────────────────────

const sanitize = (str) => (str ? String(str).trim() : '');

const validateEmail = (email) => validator.isEmail(email || '');

const validatePhone = (phone) => validator.isMobilePhone(phone || '', 'any', { strictMode: false });

// ── POST /api/apply/institution ──────────────────────────────

exports.applyInstitution = async (req, res) => {
  try {
    const {
      organizationName, ownerName, country, field,
      website, facebook, email, phone, whatsapp,
    } = req.body;

    // Validation
    const errors = [];
    if (!sanitize(organizationName)) errors.push('Organization name is required.');
    if (!sanitize(ownerName))        errors.push('Owner/manager name is required.');
    if (!sanitize(country))          errors.push('Country is required.');
    if (!sanitize(field))            errors.push('Field/profession is required.');
    if (!validateEmail(email))       errors.push('Valid email is required.');
    if (!validatePhone(phone))       errors.push('Valid phone number is required.');
    if (!validatePhone(whatsapp))    errors.push('Valid WhatsApp number is required.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Save to database
    const application = await Application.create({
      type: 'institution',
      organizationName: sanitize(organizationName),
      ownerName:        sanitize(ownerName),
      country:          sanitize(country),
      field:            sanitize(field),
      website:          sanitize(website),
      facebook:         sanitize(facebook),
      email:            sanitize(email).toLowerCase(),
      phone:            sanitize(phone),
      whatsapp:         sanitize(whatsapp),
    });

    // Send confirmation email (non-blocking)
    const tmpl = templates.applicationReceived(sanitize(ownerName), 'Institution Accreditation');
    sendEmail({ to: sanitize(email), ...tmpl });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. We will contact you within 3–5 business days.',
      id: application._id,
    });

  } catch (error) {
    console.error('applyInstitution error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ── POST /api/apply/instructor ───────────────────────────────

exports.applyInstructor = async (req, res) => {
  try {
    const { name, country, email, phone, whatsapp, job } = req.body;

    const errors = [];
    if (!sanitize(name))          errors.push('Name is required.');
    if (!sanitize(country))       errors.push('Country is required.');
    if (!sanitize(job))           errors.push('Job is required.');
    if (!validateEmail(email))    errors.push('Valid email is required.');
    if (!validatePhone(phone))    errors.push('Valid phone number is required.');
    if (!validatePhone(whatsapp)) errors.push('Valid WhatsApp number is required.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const application = await Application.create({
      type:     'instructor',
      name:     sanitize(name),
      country:  sanitize(country),
      job:      sanitize(job),
      email:    sanitize(email).toLowerCase(),
      phone:    sanitize(phone),
      whatsapp: sanitize(whatsapp),
    });

    const tmpl = templates.applicationReceived(sanitize(name), 'Instructor Accreditation');
    sendEmail({ to: sanitize(email), ...tmpl });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. We will contact you within 3–5 business days.',
      id: application._id,
    });

  } catch (error) {
    console.error('applyInstructor error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ── POST /api/apply/diploma ──────────────────────────────────

exports.applyDiploma = async (req, res) => {
  try {
    const { name, country, email, phone, whatsapp, job } = req.body;

    const errors = [];
    if (!sanitize(name))          errors.push('Name is required.');
    if (!sanitize(country))       errors.push('Country is required.');
    if (!sanitize(job))           errors.push('Job is required.');
    if (!validateEmail(email))    errors.push('Valid email is required.');
    if (!validatePhone(phone))    errors.push('Valid phone number is required.');
    if (!validatePhone(whatsapp)) errors.push('Valid WhatsApp number is required.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const application = await Application.create({
      type:     'diploma',
      name:     sanitize(name),
      country:  sanitize(country),
      job:      sanitize(job),
      email:    sanitize(email).toLowerCase(),
      phone:    sanitize(phone),
      whatsapp: sanitize(whatsapp),
    });

    const tmpl = templates.applicationReceived(sanitize(name), 'International Diploma');
    sendEmail({ to: sanitize(email), ...tmpl });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. We will contact you within 3–5 business days.',
      id: application._id,
    });

  } catch (error) {
    console.error('applyDiploma error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
