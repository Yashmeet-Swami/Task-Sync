import multer from 'multer';

// Buffered in memory rather than written to local disk - the controller uploads the
// buffer straight to MinIO, so this process never depends on local filesystem state.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (JPEG, PNG, WEBP)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1 // Only one file
  }
});

export default upload;
