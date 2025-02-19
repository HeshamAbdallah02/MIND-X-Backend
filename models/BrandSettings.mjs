// backend/models/BrandSettings.js
import mongoose from 'mongoose';

const statsColorsSchema = new mongoose.Schema({
  sectionBackground: { type: String, default: '#606161' },
  titleColor: { type: String, default: '#FFFFFF' },
  iconColor: { type: String, default: '#81C99C' },
  numberColor: { type: String, default: '#FBB859' },
  textPrimary: { type: String, default: '#FFFFFF' },
  feedbackTextColor: { type: String, default: '#606161' }
}, { _id: false });

const testimonialsColorsSchema = new mongoose.Schema({
  sectionBackground: { type: String, default: '#FFFFFF' },
  titleColor: { type: String, default: '#FBB859' },
  circleBorderColor: { type: String, default: '#FBB859' },
  quoteIconColor: { type: String, default: '#FFFFFF' },
  quoteIconBackground: { type: String, default: '#FBB859' },
  nameColor: { type: String, default: '#81C99C' },
  positionColor: { type: String, default: '#606161' },
  feedbackBackground: { type: String, default: '#FFFFFF' },
  feedbackBorderColor: { type: String, default: '#FBB859' }
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
  statsColors: { type: statsColorsSchema, default: () => ({}) },
  testimonialsColors: { type: testimonialsColorsSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);