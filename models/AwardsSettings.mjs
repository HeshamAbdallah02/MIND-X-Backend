// backend/models/AwardsSettings.mjs
import mongoose from 'mongoose';

const awardsSettingsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Awards & Achievements'
  },
  subtitle: {
    type: String,
    required: true,
    trim: true,
    default: 'Celebrating excellence, innovation, and impact through our journey.'
  },
  backgroundImage: {
    url: {
      type: String,
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    },
    opacity: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    },
    overlay: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure only one settings document exists
awardsSettingsSchema.statics.findOrCreateDefault = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const AwardsSettings = mongoose.model('AwardsSettings', awardsSettingsSchema);

export default AwardsSettings;
