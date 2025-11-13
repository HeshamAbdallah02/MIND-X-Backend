// backend/models/TrainingHero.mjs
import mongoose from 'mongoose';

const trainingHeroSchema = new mongoose.Schema({
  // Hero Content
  heading: {
    text: {
      type: String,
      required: true,
      default: 'Expand Your Skills'
    },
    color: {
      type: String,
      default: '#FFFFFF'
    }
  },
  subheading: {
    text: {
      type: String,
      default: 'Discover our specialized training programs designed to enhance your personal and professional growth'
    },
    color: {
      type: String,
      default: '#FFFFFF'
    }
  },
  
  // Background Media
  backgroundImage: {
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String
    }
  },
  
  // Overlay Settings
  overlay: {
    enabled: {
      type: Boolean,
      default: true
    },
    color: {
      type: String,
      default: '#000000'
    },
    opacity: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    }
  },
  
  // Call to Action
  cta: {
    enabled: {
      type: Boolean,
      default: true
    },
    text: {
      type: String,
      default: 'View Trainings'
    },
    icon: {
      type: String,
      default: 'ChevronDown'
    }
  },
  
  // Layout Settings
  layout: {
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center'
    },
    verticalAlign: {
      type: String,
      enum: ['top', 'center', 'bottom'],
      default: 'center'
    },
    height: {
      type: String,
      default: '600px'
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin
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
  timestamps: true,
  collection: 'training_hero'
});

// Index
trainingHeroSchema.index({ isActive: 1 });

// Pre-remove hook to clean up Cloudinary image
trainingHeroSchema.pre('remove', async function(next) {
  if (this.backgroundImage?.public_id) {
    try {
      const cloudinary = (await import('../config/cloudinary.mjs')).default;
      await cloudinary.uploader.destroy(this.backgroundImage.public_id);
    } catch (error) {
      console.warn('Failed to delete background image:', error);
    }
  }
  next();
});

export default mongoose.model('TrainingHero', trainingHeroSchema);
