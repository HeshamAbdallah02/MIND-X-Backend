// backend/models/BrandSettings.mjs
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
  feedbackBorderColor: { type: String, default: '#FBB859' },
  feedbackTextColor: { type: String, default: '#606161' }
}, { _id: false });

const sponsorsColorsSchema = new mongoose.Schema({
  sectionBackground: {
    type: String,
    default: '#ffffff',
    validate: {
      validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v) || v.startsWith('rgba'),
      message: 'Invalid color format'
    }
  },
  titleColor: {
    type: String,
    default: '#606161',
    validate: {
      validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
      message: 'Invalid hex color'
    }
  },
  sponsorsSpeed: {
    type: Number,
    default: 100,
    min: [50, 'Speed cannot be less than 50'],
    max: [300, 'Speed cannot exceed 300'],
    validate: {
      validator: Number.isInteger,
      message: 'Speed must be an integer'
    }
  },
  partnersSpeed: {
    type: Number,
    default: 100,
    min: [50, 'Speed cannot be less than 50'],
    max: [300, 'Speed cannot exceed 300'],
    validate: {
      validator: Number.isInteger,
      message: 'Speed must be an integer'
    }
  }
}, { _id: false });

const footerColorsSchema = new mongoose.Schema({
  background:     { type: String, default: '#4a4a4a' },
  titleColor:     { type: String, default: '#FBB859' },
  textColor:      { type: String, default: '#FFFFFF' },
  linkColor:      { type: String, default: '#FFFFFF' },
  inputBgColor:   { type: String, default: '#555555' },
  inputTextColor: { type: String, default: '#CCCCCC' },
  buttonBgColor:  { type: String, default: '#FBB859' },
  buttonTextColor:{ type: String, default: '#606161' }
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
  testimonialsColors: { type: testimonialsColorsSchema, default: () => ({}) },
  sponsorsColors: { type: sponsorsColorsSchema, default: () => ({}) },
  footerLogo: {
    url: { type: String, required: true },
    alt: { type: String, default: 'MIND‑X Logo' }
  },
  footerSlogan: { type: String, default: 'E x p a n d  Y o u r  M i n d' },
  footerColors: { type: footerColorsSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);