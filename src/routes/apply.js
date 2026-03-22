const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { applyInstitution, applyInstructor, applyDiploma } = require('../controllers/applicationController');

// Rate limit: max 5 form submissions per IP per hour
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many submissions from this IP. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/institution', formLimiter, applyInstitution);
router.post('/instructor',  formLimiter, applyInstructor);
router.post('/diploma',     formLimiter, applyDiploma);

module.exports = router;
