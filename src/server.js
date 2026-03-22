require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss-clean');
const cookieParser  = require('cookie-parser');
const crypto        = require('crypto');
const connectDB     = require('./config/db');
const Admin         = require('./models/Admin');

const app = express();

connectDB();

// Trust Railway proxy
app.set('trust proxy', 1);

// Force HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — only your Cloudflare domain
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:5500',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods:        ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gate-token'],
  credentials:    true,
}));

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// MongoDB injection protection
app.use(mongoSanitize());

// XSS protection
app.use(xss());

// Parameter pollution prevention
app.use((req, res, next) => {
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][req.query[key].length - 1];
    }
  }
  next();
});

// ── Gate token guard ─────────────────────────────────────────
// Admin routes (except /gate, /login, /logout) require a valid
// HMAC gate token. The raw key NEVER leaves the server.
app.use('/api/admin', (req, res, next) => {
  const open = ['/gate', '/login', '/logout'];
  if (open.includes(req.path)) return next();

  const token = req.headers['x-gate-token'];
  if (!token) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  // Validate HMAC token — allow 2-minute window
  const secret = process.env.ADMIN_GATE_KEY + process.env.JWT_SECRET;
  const now    = Math.floor(Date.now() / 120000); // 2-min buckets
  const valid  = [now, now - 1].some(t => {
    const expected = crypto.createHmac('sha256', secret).update(String(t)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  });

  if (!valid) {
    console.warn(`[GATE] Invalid token from IP: ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }
  next();
});

// Routes
app.use('/api/apply',  require('./routes/apply'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/admin',  require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

// Error handler — hides stack traces in production
app.use((err, req, res, next) => {
  const status  = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message;
  console.error(`[ERROR] ${new Date().toISOString()} ${status} ${err.message} IP:${req.ip}`);
  res.status(status).json({ success: false, message });
});

// Create default admin on first run
const createDefaultAdmin = async () => {
  try {
    if (await Admin.countDocuments() === 0) {
      await Admin.create({
        name:     'Super Admin',
        email:    process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role:     'superadmin',
      });
      console.log(`[SETUP] Admin created: ${process.env.ADMIN_EMAIL}`);
    }
  } catch (e) {
    console.error('[SETUP] Error:', e.message);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`[SERVER] ASBA running on port ${PORT} (${process.env.NODE_ENV})`);
  await createDefaultAdmin();
});
