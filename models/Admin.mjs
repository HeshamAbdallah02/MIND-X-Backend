//backend/models/Admin.mjs
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);