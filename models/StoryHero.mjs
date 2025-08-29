//backend/models/StoryHero.mjs
import mongoose from 'mongoose';

const storyHeroSchema = new mongoose.Schema({
  headline: {
    type: String,
    required: true,
    default: 'Our Story'
  },
  hookLine: {
    type: String,
    required: true,
    default: 'From Day One to Today: Our Journey'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Story hero background'
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  autoScrollSpeed: {
    type: Number,
    default: 5000, // 5 seconds
    min: 1000,     // Minimum 1 second
    max: 30000     // Maximum 30 seconds
  },
  showIndicators: {
    type: Boolean,
    default: false
  },
  colors: {
    headlineColor: {
      type: String,
      default: '#ffffff'
    },
    headlineSize: {
      type: String,
      default: 'text-5xl md:text-6xl'
    },
    hookLineColor: {
      type: String,
      default: '#f0f0f0'
    },
    hookLineSize: {
      type: String,
      default: 'text-lg md:text-xl'
    },
    overlayColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.4)'
    },
    overlayOpacity: {
      type: Number,
      default: 0.4,
      min: 0,
      max: 1
    },
    arrowBackground: {
      type: String,
      default: 'rgba(255, 255, 255, 0.2)'
    },
    arrowColor: {
      type: String,
      default: '#ffffff'
    },
    textShadow: {
      type: String,
      default: '2px 2px 4px rgba(0,0,0,0.3)'
    },
    fallbackBackground: {
      type: String,
      default: '#f5f5f5'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  collection: 'storyhero' // Explicit collection name
});

// Sort images by order before returning
storyHeroSchema.pre(/^find/, function() {
  if (this.getQuery()._id || this.getQuery().id) {
    // For single document queries, sort the images array
    this.populate({
      path: 'images',
      options: { sort: { order: 1 } }
    });
  }
});

// Ensure only one active story hero exists
storyHeroSchema.pre('save', async function() {
  if (this.isActive && this.isNew) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
  }
});

export default mongoose.model('StoryHero', storyHeroSchema);
