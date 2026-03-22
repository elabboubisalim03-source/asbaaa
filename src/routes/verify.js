const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyCertificate } = require('../controllers/verificationController');

// Rate limit: max 30 lookups per IP per minute (prevent brute-force ID guessing)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many requests. Please wait a moment.' },
});

router.get('/', verifyLimiter, verifyCertificate);

module.exports = router;
