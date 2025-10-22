// backend/models/Form.mjs
// Model for dynamic form builder
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'email', 'number', 'tel', 'url', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'datetime', 'file'],
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String,
    trim: true
  }], // For select, radio, checkbox
  validation: {
    min: { type: Number },
    max: { type: Number },
    minLength: { type: Number },
    maxLength: { type: Number },
    pattern: { type: String },
    accept: { type: String } // For file uploads (e.g., "image/*,.pdf")
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  
  // Questions/Fields
  questions: [questionSchema],
  
  // Settings
  settings: {
    isPublished: {
      type: Boolean,
      default: false
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: false
    },
    requireLogin: {
      type: Boolean,
      default: false
    },
    showProgressBar: {
      type: Boolean,
      default: true
    },
    submitButtonText: {
      type: String,
      default: 'Submit'
    },
    confirmationMessage: {
      type: String,
      default: 'Thank you! Your response has been submitted.'
    },
    deadline: {
      type: Date,
      default: null
    },
    maxSubmissions: {
      type: Number,
      default: null,
      min: 0
    },
    collectEmail: {
      type: Boolean,
      default: true
    }
  },
  
  // Styling
  theme: {
    primaryColor: {
      type: String,
      default: '#FBB859'
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    }
  },
  
  // Analytics
  submissionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Meta
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  collection: 'forms'
});

// Indexes
formSchema.index({ createdBy: 1, createdAt: -1 });
formSchema.index({ 'settings.isPublished': 1, createdAt: -1 });

// Generate unique slug before saving
formSchema.pre('save', async function(next) {
  if (this.isNew && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Form').findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Virtual for form URL
formSchema.virtual('url').get(function() {
  return `/forms/${this.slug}`;
});

// Virtual for full public URL
formSchema.virtual('publicUrl').get(function() {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/forms/${this.slug}`;
});

export default mongoose.model('Form', formSchema);
