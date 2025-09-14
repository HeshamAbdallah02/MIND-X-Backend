// backend/models/CTA.mjs
import mongoose from 'mongoose';

const ctaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  buttonText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  buttonUrl: {
    type: String,
    required: true,
    trim: true
  },
  backgroundColor: {
    type: String,
    required: true,
    default: '#F9A826'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const CTA = mongoose.model('CTA', ctaSchema);

export default CTA;
