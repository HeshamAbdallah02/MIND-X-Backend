// scripts/cleanupTempUploads.js
import cloudinary from '../config/cloudinary.mjs';
import TempUpload from '../models/TempUpload.mjs';

const cleanupTempUploads = async () => {
  try {
    // Find expired temp uploads
    const expiredUploads = await TempUpload.find({
      createdAt: { $lt: new Date(Date.now() - 3600000) } // older than 1 hour
    });

    // Delete each expired upload from Cloudinary
    for (const upload of expiredUploads) {
      try {
        await cloudinary.uploader.destroy(upload.publicId);
        await upload.remove();
        console.log(`Cleaned up temporary upload: ${upload.publicId}`);
      } catch (error) {
        console.error(`Error cleaning up upload ${upload.publicId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanup process:', error);
  }
};

export default cleanupTempUploads;