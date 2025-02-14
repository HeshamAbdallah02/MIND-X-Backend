// models/TempUpload.js
import mongoose from 'mongoose';

const tempUploadSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Documents will be automatically deleted after 1 hour
  }
});

export default mongoose.model('TempUpload', tempUploadSchema);