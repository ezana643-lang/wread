'use strict';

function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === 'development';

  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Doğrulama hatası.',
      errors:  err.errors,
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'Bu kayıt zaten mevcut.',
    });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';

  console.error('[HATA]', { status, message, stack: isDev ? err.stack : undefined });

  return res.status(status).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };