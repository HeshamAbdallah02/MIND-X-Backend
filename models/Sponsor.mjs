// backend/models/Sponsor.mjs
import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['sponsor', 'partner'],
    required: true 
  },
  logo: {
    url: { 
      type: String, 
      required: true 
    },
    alt: { 
      type: String, 
      default: '' 
    }
  },
  website: { 
    type: String,
    required: true,
    match: [
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      'Please enter a valid URL'
    ]
  },
  order: { 
    type: Number, 
    default: 0 
  },
  active: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Index for better query performance
sponsorSchema.index({ type: 1, active: 1, order: 1 });

export default mongoose.model('Sponsor', sponsorSchema);