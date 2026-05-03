const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const safeImageFileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, and GIF image uploads are allowed."));
  }

  const originalName = String(file.originalname || "").toLowerCase();

  if (/\.(exe|bat|cmd|sh|ps1|js|jsx|ts|tsx|html|htm|svg|php|py|jar|zip|rar|7z)$/i.test(originalName)) {
    return cb(new Error("This file type is not allowed."));
  }

  return cb(null, true);
};

const imageUploadOptions = {
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: safeImageFileFilter,
};

module.exports = {
  imageUploadOptions,
  MAX_IMAGE_SIZE_BYTES,
};