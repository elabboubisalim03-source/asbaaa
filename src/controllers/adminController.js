const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const Admin       = require('../models/Admin');
const Application = require('../models/Application');
const Certificate = require('../models/Certificate');
const { sendEmail, templates } = require('../config/email');

// ── POST /api/admin/gate ─────────────────────────────────────
// Checks access key server-side. Raw key never sent to browser.
exports.gate = (req, res) => {
  const { key } = req.body;

  if (!key || key !== process.env.ADMIN_GATE_KEY) {
    console.warn(`[GATE] Failed attempt from IP: ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Invalid access key.' });
  }

  // Generate HMAC token — browser stores this, never the raw key
  const secret    = process.env.ADMIN_GATE_KEY + process.env.JWT_SECRET;
  const bucket    = Math.floor(Date.now() / 120000);
  const gateToken = crypto.createHmac('sha256', secret).update(String(bucket)).digest('hex');

  console.log(`[GATE] Access granted from IP: ${req.ip}`);
  res.json({ success: true, gateToken });
};

// ── POST /api/admin/login ────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    // Timing-safe: always run bcrypt even if admin not found
    const dummy   = '$2a$12$dummyhashfortimingsafetynnnnnnnnnnnnnnnnnnnnnnnnnnn';
    const isMatch = admin ? await admin.comparePassword(password) : await bcrypt.compare(password, dummy);

    if (!admin || !isMatch || !admin.isActive) {
      console.warn(`[AUTH] Failed login: ${email} IP:${req.ip}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
      issuer:    'asba-academy',
      audience:  'asba-admin',
    });

    // httpOnly cookie — JS cannot read this
    res.cookie('asba_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[AUTH] Login OK: ${email} IP:${req.ip}`);
    res.json({ success: true, token, admin });

  } catch (e) {
    console.error('[AUTH] Error:', e.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/admin/logout ───────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('asba_token');
  res.json({ success: true });
};

// ── GET /api/admin/stats ─────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [total, pending, reviewing, approved, rejected, totalC, activeC] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'reviewing' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'active' }),
    ]);
    const recent = await Application.find().sort({ createdAt: -1 }).limit(5)
      .select('type status email country createdAt');
    res.json({ success: true,
      stats: { applications: { total, pending, reviewing, approved, rejected }, certificates: { total: totalC, active: activeC } },
      recentApplications: recent });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── GET /api/admin/applications ──────────────────────────────
exports.getApplications = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (search) filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { organizationName: { $regex: search, $options: 'i' } },
      { country: { $regex: search, $options: 'i' } },
    ];
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Application.countDocuments(filter);
    const data  = await Application.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── GET /api/admin/applications/:id ─────────────────────────
exports.getApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: app });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── PATCH /api/admin/applications/:id/status ─────────────────
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['pending', 'reviewing', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const app = await Application.findByIdAndUpdate(req.params.id,
      { status, adminNotes: adminNotes || '', reviewedBy: req.admin._id, reviewedAt: new Date() },
      { new: true });
    if (!app) return res.status(404).json({ success: false, message: 'Not found.' });
    if (['approved', 'rejected'].includes(status)) {
      const name      = app.ownerName || app.name || 'Applicant';
      const typeLabel = { institution: 'Institution Accreditation', instructor: 'Instructor Accreditation', diploma: 'International Diploma' }[app.type];
      sendEmail({ to: app.email, ...templates.applicationStatusUpdate(name, typeLabel, status, adminNotes) });
    }
    res.json({ success: true, data: app });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── GET /api/admin/certificates ──────────────────────────────
exports.getCertificates = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { certificateId: { $regex: search, $options: 'i' } },
      { holderName: { $regex: search, $options: 'i' } },
      { holderEmail: { $regex: search, $options: 'i' } },
      { certificationName: { $regex: search, $options: 'i' } },
    ];
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Certificate.countDocuments(filter);
    const data  = await Certificate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── POST /api/admin/certificates ─────────────────────────────
exports.createCertificate = async (req, res) => {
  try {
    const { certificateId, holderName, holderEmail, country, certificationName, certificationCode, issueDate, expiryDate, applicationRef } = req.body;
    if (!certificateId || !holderName || !certificationName || !issueDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (await Certificate.findOne({ certificateId: certificateId.toUpperCase() })) {
      return res.status(409).json({ success: false, message: 'Certificate ID already exists.' });
    }
    const cert = await Certificate.create({
      certificateId: certificateId.toUpperCase(), holderName, holderEmail, country,
      certificationName, certificationCode,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      applicationRef: applicationRef || null,
      issuedBy: req.admin._id,
    });
    res.status(201).json({ success: true, data: cert });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── PATCH /api/admin/certificates/:id ────────────────────────
exports.updateCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cert) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: cert });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── DELETE /api/admin/certificates/:id ───────────────────────
exports.deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndDelete(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
};
