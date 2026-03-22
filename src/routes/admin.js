const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, superAdminOnly } = require('../middleware/auth');
const c = require('../controllers/adminController');

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});

// Public
router.post('/gate',   strictLimit, c.gate);
router.post('/login',  strictLimit, c.login);
router.post('/logout', c.logout);

// Protected
router.use(protect);
router.get('/stats', c.getStats);
router.get('/applications',              c.getApplications);
router.get('/applications/:id',          c.getApplication);
router.patch('/applications/:id/status', c.updateApplicationStatus);
router.get('/certificates',              c.getCertificates);
router.post('/certificates',             c.createCertificate);
router.patch('/certificates/:id',        c.updateCertificate);
router.delete('/certificates/:id',       superAdminOnly, c.deleteCertificate);

module.exports = router;
