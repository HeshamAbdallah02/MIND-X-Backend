import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import authMiddleware from '../middleware/auth.mjs';

const router = express.Router();

// 1. Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/svg+xml'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    }
    cb(null, true);
  }
}).single('file');

// 2. Enhanced Error Handling Middleware
const handleMulterUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('Multer Error:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      const status = err.code === 'INVALID_FILE_TYPE' ? 400 : 500;
      return res.status(status).json({
        error: err.code === 'LIMIT_FILE_SIZE' ? 
          'File too large (max 10MB)' : 
          'File upload failed',
        code: err.code || 'UPLOAD_ERROR'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file received',
        code: 'MISSING_FILE'
      });
    }
    
    next();
  });
};

// 3. Upload Endpoint with Cloudinary Debugging
router.post('/', authMiddleware, handleMulterUpload, async (req, res) => {
  try {
    console.log('Upload Request Received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      headers: req.headers
    });

    // Create read stream from buffer
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    // Cloudinary upload with explicit timeout
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mind-x',
          resource_type: 'auto',
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          timeout: 60000
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Error:', {
              message: error.message,
              http_code: error.http_code,
              error
            });
            reject({
              code: 'CLOUDINARY_ERROR',
              message: error.message
            });
          } else {
            console.log('Cloudinary Upload Success:', {
              public_id: result.public_id,
              bytes: result.bytes,
              url: result.secure_url
            });
            resolve(result);
          }
        }
      );

      // Pipe the data with error handling
      bufferStream.on('error', (err) => {
        console.error('Stream Error:', err);
        reject({
          code: 'STREAM_ERROR',
          message: 'File stream error'
        });
      });

      bufferStream.pipe(uploadStream);
    });

    // Successful response
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format
    });

  } catch (error) {
    console.error('Final Upload Error:', {
      error,
      receivedFile: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size
      } : null
    });
    
    res.status(500).json({
      error: error.message || 'Upload failed',
      code: error.code || 'UPLOAD_FAILURE',
      details: {
        cloudinary: error.http_code,
        error_type: error.error
      }
    });
  }
});

export default router;