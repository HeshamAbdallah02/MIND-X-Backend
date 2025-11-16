import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  author: {
    name: { type: String, required: true },
    role: { type: String },
    avatar: { 
      url: String,
      publicId: String
    },
    bio: String
  },
  coverImage: {
    url: { type: String },
    publicId: String,
    alt: String
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Innovation',
      'Leadership',
      'Team Culture',
      'Events',
      'Research',
      'Success Stories',
      'Tutorials',
      'Announcements',
      'Other'
    ],
    default: 'Other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  readTime: {
    type: Number // in minutes
  },
  views: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { 
  timestamps: true,
  collection: 'blogs'
});

// Indexes (slug is auto-indexed due to unique: true)
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ featured: 1, status: 1 });
blogSchema.index({ tags: 1 });

// Generate slug from title
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Add timestamp to ensure uniqueness
    this.slug += `-${Date.now()}`;
  }
  
  // Calculate read time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

export default mongoose.model('Blog', blogSchema);