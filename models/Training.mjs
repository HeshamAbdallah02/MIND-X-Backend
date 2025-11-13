// backend/models/Training.mjs
import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },
  
  // Date & Time
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  displayDate: {
    type: String, // e.g., "December 15-17, 2025"
    required: true
  },
  duration: {
    type: String, // e.g., "3 Days", "2 Weeks"
    default: ''
  },
  schedule: {
    type: String, // e.g., "9:00 AM - 5:00 PM"
    default: ''
  },
  
  // Location
  location: {
    venue: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    onlineLink: { type: String, default: '' }
  },
  
  // Registration
  registration: {
    isOpen: { type: Boolean, default: true },
    deadline: { type: Date },
    formLink: { type: String, default: '' },
    externalLink: { type: String, default: '' },
    spots: {
      total: { type: Number, min: 0 },
      available: { type: Number, min: 0 },
      registered: { type: Number, default: 0, min: 0 }
    }
  },
  
  // Pricing
  pricing: {
    isFree: { type: Boolean, default: true },
    regular: { type: Number, min: 0, default: 0 },
    student: { type: Number, min: 0, default: 0 },
    earlyBird: {
      amount: { type: Number, min: 0 },
      deadline: { type: Date }
    },
    currency: { type: String, default: 'EGP' }
  },
  
  // Training Details
  topics: [{
    type: String,
    trim: true
  }],
  objectives: [{
    type: String,
    trim: true
  }],
  prerequisites: [{
    type: String,
    trim: true
  }],
  targetAudience: {
    type: String,
    trim: true
  },
  
  // Instructors
  instructors: [{
    name: { type: String, required: true },
    title: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: {
      url: { type: String },
      public_id: { type: String }
    },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' }
  }],
  
  // Media
  coverImage: {
    url: { type: String, required: true },
    public_id: { type: String }
  },
  galleryImages: [{
    url: { type: String },
    public_id: { type: String },
    caption: { type: String, default: '' }
  }],
  
  // Additional Info
  category: {
    type: String,
    default: 'General',
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'All Levels'
  },
  
  // Certificates & Materials
  certificate: {
    isProvided: { type: Boolean, default: false },
    type: { type: String, default: '' }, // e.g., "Certificate of Completion"
    requirements: { type: String, default: '' }
  },
  materials: {
    isProvided: { type: Boolean, default: false },
    description: { type: String, default: '' }
  },
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming',
    index: true
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Contact & Support
  contactInfo: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },
  
  // SEO & Social
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: [{ type: String }]
  },
  
  // Statistics
  stats: {
    views: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    completions: { type: Number, default: 0 }
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
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'trainings'
});

// Indexes
trainingSchema.index({ createdBy: 1, createdAt: -1 });
trainingSchema.index({ startDate: -1 });
trainingSchema.index({ status: 1, isPublished: 1 });
trainingSchema.index({ category: 1, status: 1 });

// Virtual for isPast
trainingSchema.virtual('isPast').get(function() {
  return this.endDate < new Date();
});

// Virtual for isUpcoming
trainingSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date();
});

// Virtual for daysUntil
trainingSchema.virtual('daysUntil').get(function() {
  if (this.startDate < new Date()) return 0;
  const diffTime = this.startDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Generate slug before saving
trainingSchema.pre('save', async function(next) {
  if (this.isModified('title') || !this.slug) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Training').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Auto-update status based on dates
  const now = new Date();
  if (this.endDate < now) {
    this.status = 'completed';
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = 'ongoing';
  } else if (this.startDate > now && this.status !== 'cancelled') {
    this.status = 'upcoming';
  }
  
  next();
});

// Pre-remove hook to clean up Cloudinary images
trainingSchema.pre('remove', async function(next) {
  const cloudinary = (await import('../config/cloudinary.mjs')).default;
  
  // Delete cover image
  if (this.coverImage?.public_id) {
    try {
      await cloudinary.uploader.destroy(this.coverImage.public_id);
    } catch (error) {
      console.warn('Failed to delete cover image:', error);
    }
  }
  
  // Delete gallery images
  for (const image of this.galleryImages) {
    if (image.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        console.warn('Failed to delete gallery image:', error);
      }
    }
  }
  
  // Delete instructor avatars
  for (const instructor of this.instructors) {
    if (instructor.avatar?.public_id) {
      try {
        await cloudinary.uploader.destroy(instructor.avatar.public_id);
      } catch (error) {
        console.warn('Failed to delete instructor avatar:', error);
      }
    }
  }
  
  next();
});

// Enable virtuals in JSON
trainingSchema.set('toJSON', { virtuals: true });
trainingSchema.set('toObject', { virtuals: true });

export default mongoose.model('Training', trainingSchema);
