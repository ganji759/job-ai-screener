import multer from 'multer';

// Memory storage - files stored in buffer, not disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.pdf'];
    const ext = file.originalname.toLowerCase().match(/\.[a-z]+$/)?.[0];
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF files are allowed'));
    }
  },
});
