'use strict';

const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) return cb(null, true);

    const err = new Error('Yalnizca jpeg, png, webp veya gif gorsel yuklenebilir.');
    err.status = 415;
    return cb(err);
  },
});

function assertCloudinaryConfig() {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .filter(key => !process.env[key]);

  if (missing.length) {
    const err = new Error(`Cloudinary ayarlari eksik: ${missing.join(', ')}`);
    err.status = 500;
    throw err;
  }
}

async function uploadToCloudinary(buffer) {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'wread',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    ).end(buffer);
  });
}

module.exports = { upload, uploadToCloudinary };

