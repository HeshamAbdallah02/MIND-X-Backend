// backend/models/TimelineSection.mjs
import mongoose from 'mongoose';

const timelineSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Our Journey'
  },
  subtitle: {
    type: String,
    default: ''
  },
  backgroundColor: {
    type: String,
    default: '#f8fafc'
  },
  lineColor: {
    type: String,
    default: '#e2e8f0'
  },
  nodeColor: {
    type: String,
    default: '#FBB859'
  },
  textColor: {
    type: String,
    default: '#1e293b'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for performance
timelineSectionSchema.index({ order: 1 });
timelineSectionSchema.index({ isActive: 1 });

const TimelineSection = mongoose.model('TimelineSection', timelineSectionSchema);

export default TimelineSection;