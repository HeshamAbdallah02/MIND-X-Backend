// backend/models/PageEvent.mjs
// Model for Events Page (Featured & Past Events)
import mongoose from 'mongoose';

const pageEventSchema = new mongoose.Schema({
  // Basic Info
  title: {
    text: { type: String, required: true },
    color: { type: String, default: '#606161' }
  },
  description: {
    text: { type: String, required: true },
    color: { type: String, default: '#606161' }
  },
  
  // Date & Time
  date: {
    text: { type: String, required: true }, // Display format: "December 15-17, 2025"
    color: { type: String, default: '#FBB859' }
  },
  eventDate: {
    type: Date,
    required: true,
    index: true // For efficient querying of past/upcoming events
  },
  eventTime: {
    start: { type: String, default: '' }, // e.g., "9:00 AM"
    end: { type: String, default: '' }     // e.g., "5:00 PM"
  },
  
  // Location
  location: {
    venue: { type: String, default: '' },      // e.g., "University Conference Center"
    address: { type: String, default: '' }     // e.g., "Main Campus, Building A"
  },
  
  // Registration & Attendance
  registrationLink: {
    type: String,
    default: '',
    match: [/^(https?:\/\/)?([\da-z\.-]+\.)+[a-z]{2,}(:\d{1,5})?(\/.*)?$/i, 'Please use a valid URL']
  },
  attendeeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxAttendees: {
    type: Number,
    default: null,
    min: 0
  },
  
  // Categorization
  category: {
    type: String,
    default: '',
    index: true // For filtering
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Pricing
  price: {
    regular: { type: Number, min: 0 },
    student: { type: Number, min: 0 },
    currency: { type: String, default: '$' }
  },
  earlyBirdPrice: {
    amount: { type: Number, min: 0 },
    deadline: { type: Date }
  },
  
  // Event Details
  highlights: [{
    type: String,
    trim: true
  }],
  
  // Speakers
  speakers: [{
    name: { type: String, required: true },
    position: { type: String, default: '' },
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  }],
  speakersHeadline: {
    type: String,
    default: ''
  },
  
  // Schedule
  schedule: [{
    time: { type: String, required: true }, // e.g., "9:00 AM"
    title: { type: String, required: true },
    duration: { type: String, default: '' }, // e.g., "30 min", "60 min"
    type: { type: String, default: 'session' }, // 'keynote', 'session', 'break', 'networking', etc.
    description: { type: String, default: '' },
    location: { type: String, default: '' }, // e.g., "Main Auditorium"
    speaker: { type: String, default: '' } // e.g., "by Dr. Elena Vasquez"
  }],
  scheduleHeadline: {
    type: String,
    default: ''
  },
  
  // Media
  coverImage: {
    url: { type: String, required: true },
    alt: { type: String, default: '' }
  },
  heroImage: {
    url: { type: String, default: '' },
    alt: { type: String, default: '' }
  },
  
  // Additional
  contentAreaColor: {
    type: String,
    default: '#81C99C'
  },
  url: {
    type: String,
    default: '',
    match: [/^(https?:\/\/)?([\da-z\.-]+\.)+[a-z]{2,}(:\d{1,5})?(\/.*)?$/i, 'Please use a valid URL']
  },
  
  // Admin
  order: {
    type: Number,
    default: 0,
    index: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  }
}, { 
  timestamps: true,
  collection: 'pageEvents' // Use separate collection
});

// Indexes for efficient queries
pageEventSchema.index({ eventDate: 1, active: 1 }); // For featured event query
pageEventSchema.index({ eventDate: -1, active: 1 }); // For past events query
pageEventSchema.index({ category: 1, active: 1 });   // For category filtering
pageEventSchema.index({ order: 1, active: 1 });      // For admin sorting

// Virtual for checking if event is past
pageEventSchema.virtual('isPast').get(function() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return this.eventDate < now;
});

// Virtual for checking if event is upcoming
pageEventSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return this.eventDate >= now;
});

export default mongoose.model('PageEvent', pageEventSchema);
