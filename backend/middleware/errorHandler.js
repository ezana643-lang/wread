'use strict';

function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === 'development';

  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Dogrulama hatasi.',
      errors: err.errors,
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Gorsel en fazla 5 MB olabilir.',
    });
  }

  if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'Bu kayit zaten mevcut.',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Sunucu hatasi. Lutfen daha sonra tekrar deneyin.';

  console.error('[ERROR]', {
    method: req.method,
    path: req.originalUrl,
    status,
    message,
    stack: isDev ? err.stack : undefined,
  });

  return res.status(status).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };

