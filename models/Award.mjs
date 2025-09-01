// backend/models/Award.mjs
import mongoose from 'mongoose';

const awardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  year: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4
  },
  iconType: {
    type: String,
    required: true,
    enum: ['trophy', 'medal', 'star', 'heart', 'certificate', 'crown'],
    default: 'trophy'
  },
  type: {
    type: String,
    required: true,
    enum: ['gold', 'silver', 'bronze', 'special', 'achievement'],
    default: 'achievement'
  },
  state: {
    type: String,
    trim: true,
    maxlength: 100
  },
  stateColor: {
    type: String,
    trim: true,
    default: '#3B82F6'
  },
  organization: {
    type: String,
    trim: true,
    maxlength: 200
  },
  order: {
    type: Number,
    default: 0
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
awardSchema.index({ year: -1, order: 1 });
awardSchema.index({ type: 1 });
awardSchema.index({ isVisible: 1 });

// Virtual for formatted year display
awardSchema.virtual('formattedYear').get(function() {
  return this.year;
});

// Virtual for display priority (gold > silver > bronze > special > achievement)
awardSchema.virtual('priority').get(function() {
  const priorities = {
    'gold': 5,
    'silver': 4,
    'bronze': 3,
    'special': 2,
    'achievement': 1
  };
  return priorities[this.type] || 1;
});

const Award = mongoose.model('Award', awardSchema);

export default Award;
