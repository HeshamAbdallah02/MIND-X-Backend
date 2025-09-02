// backend/models/TimelinePhase.mjs
import mongoose from 'mongoose';

const timelinePhaseSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true
  },
  headline: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  imageAlt: {
    type: String,
    default: ''
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  textColor: {
    type: String,
    default: '#1e293b'
  },
  accentColor: {
    type: String,
    default: '#FBB859'
  },
  position: {
    type: String,
    enum: ['left', 'right', 'auto'],
    default: 'auto'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimelineSection',
    required: true
  },
  expandable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add indexes for performance
timelinePhaseSchema.index({ sectionId: 1, order: 1 });
timelinePhaseSchema.index({ isActive: 1 });
timelinePhaseSchema.index({ year: 1 });

const TimelinePhase = mongoose.model('TimelinePhase', timelinePhaseSchema);

export default TimelinePhase;