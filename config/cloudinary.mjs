import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Validate critical configuration
const validateConfig = () => {
  const required = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_UPLOAD_PRESET'
  ];

  const missing = required.filter(field => !process.env[field]);
  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary config: ${missing.join(', ')}`);
  }
};

try {
  validateConfig();
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Cloudinary Configuration Error:', error.message);
  process.exit(1);
}

export default cloudinary;