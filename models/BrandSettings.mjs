// backend/models/BrandSettings.js
import mongoose from 'mongoose';

const statsColorsSchema = new mongoose.Schema({
  sectionBackground: { type: String, default: '#606161' },
  titleColor: { type: String, default: '#FFFFFF' },
  iconColor: { type: String, default: '#81C99C' },
  numberColor: { type: String, default: '#FBB859' },
  textPrimary: { type: String, default: '#FFFFFF' }
}, { _id: false });

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
  visionTextColor: { type: String, default: '#606161' },
  statsColors: { type: statsColorsSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);