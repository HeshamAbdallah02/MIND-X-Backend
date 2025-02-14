// backend/models/BrandSettings.js
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  logo: {
    url: { type: String, required: true },
    alt: { type: String, default: 'MIND-X Logo' }
  },
  missionText: { type: String, required: true },
  visionText: { type: String, required: true },
  missionBgColor: { type: String, default: '#FBB859' },
  visionBgColor: { type: String, default: '#81C99C' },
  missionTextColor: { type: String, default: '#606161' },
  visionTextColor: { type: String, default: '#606161' }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);