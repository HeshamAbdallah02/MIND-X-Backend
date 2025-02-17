// backend/models/Stats.mjs
import mongoose from 'mongoose';

const statSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    min: 0
  },
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  icon: String, // Store icon library reference (e.g. 'FaUsers')
  order: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model('Stat', statSchema);