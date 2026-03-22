const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.asba_token) {
      token = req.cookies.asba_token;
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'asba-academy', audience: 'asba-admin',
    });
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) return res.status(401).json({ success: false, message: 'Admin not found.' });
    req.admin = admin;
    next();
  } catch (e) {
    res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

exports.superAdminOnly = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin only.' });
  }
  next();
};
