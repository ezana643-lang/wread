'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const WEAK_DEV_SECRET = 'wread_gizli_anahtar_buraya_yaz_123456';

function assertRuntimeConfig() {
  const secret = process.env.JWT_SECRET || '';
  const isWeakSecret = !secret || secret === WEAK_DEV_SECRET || secret.length < 32;

  if (process.env.NODE_ENV === 'production' && isWeakSecret) {
    throw new Error('Production ortaminda guclu bir JWT_SECRET tanimlanmalidir.');
  }

  if (process.env.NODE_ENV !== 'production' && isWeakSecret) {
    console.warn('[config] Gelistirme icin gecici JWT_SECRET kullaniliyor. Production icin degistirin.');
  }
}

assertRuntimeConfig();

app.disable('x-powered-by');
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} kaynagina izin verilmiyor.`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Cok fazla istek gonderildi. Lutfen daha sonra tekrar deneyin.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Cok fazla giris denemesi. 15 dakika sonra tekrar deneyin.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'online', timestamp: new Date().toISOString() });
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts/:postId/comments', commentRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Kaynak bulunamadi.' });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WRead API calisiyor: http://localhost:${PORT}/api`);
    console.log(`Ortam: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;

