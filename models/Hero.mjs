//backend/models/Hero.js
import mongoose from 'mongoose';

const heroContentSchema = new mongoose.Schema({
  mediaType: {
    type: String,
    enum: ['image', 'gif', 'video'],
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  displayDuration: {
    type: Number,
    default: 5000 // 5 seconds for images and GIFs
  },
  heading: {
    text: { 
      type: String, 
      required: true 
    },
    color: { 
      type: String, 
      default: '#ffffff' 
    },
    size: { 
      type: String,
      validate: {
        validator: function(v) {
          return /^text-\[\d+px\]$/.test(v);
        },
        message: props => `${props.value} is not a valid text size format!`
      },
      default: 'text-[64px]'
    }
  },
  subheading: {
    text: String,
    color: { 
      type: String, 
      default: '#ffffff' 
    },
    size: { 
      type: String,
      validate: {
        validator: function(v) {
          return /^text-\[\d+px\]$/.test(v);
        },
        message: props => `${props.value} is not a valid text size format!`
      },
      default: 'text-[32px]'
    }
  },
  description: {
    text: String,
    color: { 
      type: String, 
      default: '#ffffff' 
    },
    size: { 
      type: String,
      validate: {
        validator: function(v) {
          return /^text-\[\d+px\]$/.test(v);
        },
        message: props => `${props.value} is not a valid text size format!`
      },
      default: 'text-[16px]'
    }
  },
  button: {
    text: String,
    backgroundColor: { 
      type: String, 
      default: '#FBB859' 
    },
    textColor: { 
      type: String, 
      default: '#ffffff' 
    },
    action: {
      type: { 
        type: String, 
        enum: ['url', 'scroll'], 
        default: 'url' 
      },
      target: String
    }
  },
  order: {
    type: Number,
    required: true
  }
}, { timestamps: true });

heroContentSchema.index({ order: 1, createdAt: 1 }, { unique: true });

export default mongoose.model('HeroContent', heroContentSchema);