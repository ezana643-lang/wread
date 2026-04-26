'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const postRoutes    = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: "${origin}" kaynağına izin verilmiyor.`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth',                   authRoutes);
app.use('/api/posts',                  postRoutes);
app.use('/api/posts/:postId/comments', commentRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'çevrimiçi', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Kaynak bulunamadı.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 WRead API çalışıyor → http://localhost:${PORT}/api`);
  console.log(`   Ortam: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;