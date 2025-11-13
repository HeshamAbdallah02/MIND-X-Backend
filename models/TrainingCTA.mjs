// backend/models/TrainingCTA.mjs
import mongoose from 'mongoose';

const trainingCTASchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Volunteer with us as a trainer'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    default: 'Share your knowledge and expertise with our community. Join our team of trainers and make a difference.'
  },
  buttonText: {
    type: String,
    required: true,
    trim: true,
    default: 'Apply Now'
  },
  formLink: {
    type: String,
    trim: true,
    default: ''
  },
  backgroundColor: {
    type: String,
    default: '#FBB859' // MIND-X Orange
  },
  textColor: {
    type: String,
    default: '#FFFFFF'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

const TrainingCTA = mongoose.model('TrainingCTA', trainingCTASchema);

export default TrainingCTA;
