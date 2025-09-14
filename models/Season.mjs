// backend/models/Season.mjs
import mongoose from 'mongoose';

// Board Member Schema (embedded)
const boardMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  position: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  isLeader: {
    type: Boolean,
    default: false
  },
  avatar: {
    url: {
      type: String,
      default: null
    },
    public_id: {
      type: String,
      default: null
    }
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  profileUrl: {
    type: String,
    trim: true,
    default: ''
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Highlight Schema (embedded)
const highlightSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  url: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  image: {
    url: {
      type: String,
      default: null
    },
    public_id: {
      type: String,
      default: null
    }
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Main Season Schema
const seasonSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)'
    }
  },
  theme: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: 1000
  },
  coverImage: {
    url: {
      type: String,
      default: null
    },
    public_id: {
      type: String,
      default: null
    }
  },
  badgeColor: {
    type: String,
    default: '#606161',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Badge color must be a valid hex color'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0,
    min: 0
  },
  boardMembers: {
    type: [boardMemberSchema],
    validate: {
      validator: function(members) {
        // Allow empty array (members can be added later)
        if (!members || members.length === 0) {
          return true;
        }
        
        // Maximum 10 board members
        if (members.length > 10) {
          return false;
        }
        
        // Only one leader allowed
        const leaders = members.filter(member => member.isLeader);
        return leaders.length <= 1;
      },
      message: 'Must have at most 10 board members with at most one leader'
    }
  },
  highlights: {
    type: [highlightSchema],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
seasonSchema.index({ order: 1 });
seasonSchema.index({ isActive: 1 });

// Virtual for getting the leader
seasonSchema.virtual('leader').get(function() {
  return this.boardMembers.find(member => member.isLeader) || this.boardMembers[0];
});

// Virtual for getting non-leader members
seasonSchema.virtual('teamMembers').get(function() {
  const leader = this.boardMembers.find(member => member.isLeader);
  return leader ? this.boardMembers.filter(member => !member.isLeader) : this.boardMembers.slice(1);
});

// Pre-save middleware to ensure only one leader
seasonSchema.pre('save', function(next) {
  if (this.boardMembers && this.boardMembers.length > 0) {
    const leaders = this.boardMembers.filter(member => member.isLeader);
    
    // If multiple leaders, keep only the first one
    if (leaders.length > 1) {
      this.boardMembers.forEach((member, index) => {
        if (member.isLeader && index > 0) {
          member.isLeader = false;
        }
      });
    }
    
    // Sort board members by order
    this.boardMembers.sort((a, b) => a.order - b.order);
  }
  
  // Sort highlights by order
  if (this.highlights && this.highlights.length > 0) {
    this.highlights.sort((a, b) => a.order - b.order);
  }
  
  next();
});

// Static method to get next order number
seasonSchema.statics.getNextOrder = async function() {
  const lastSeason = await this.findOne().sort({ order: -1 }).select('order');
  return lastSeason ? lastSeason.order + 1 : 0;
};

// Static method to get next board member order
seasonSchema.statics.getNextBoardMemberOrder = function(boardMembers) {
  if (!boardMembers || boardMembers.length === 0) return 0;
  const maxOrder = Math.max(...boardMembers.map(member => member.order || 0));
  return maxOrder + 1;
};

// Static method to get next highlight order
seasonSchema.statics.getNextHighlightOrder = function(highlights) {
  if (!highlights || highlights.length === 0) return 0;
  const maxOrder = Math.max(...highlights.map(highlight => highlight.order || 0));
  return maxOrder + 1;
};

// Instance method to set new leader
seasonSchema.methods.setLeader = function(memberId) {
  // Remove leader status from all members
  this.boardMembers.forEach(member => {
    member.isLeader = false;
  });
  
  // Set new leader
  const newLeader = this.boardMembers.id(memberId);
  if (newLeader) {
    newLeader.isLeader = true;
    return true;
  }
  return false;
};

// Instance method to reorder board members
seasonSchema.methods.reorderBoardMembers = function(newOrder) {
  if (!Array.isArray(newOrder)) return false;
  
  newOrder.forEach((item, index) => {
    const member = this.boardMembers.id(item.id);
    if (member) {
      member.order = index;
    }
  });
  
  return true;
};

// Instance method to reorder highlights
seasonSchema.methods.reorderHighlights = function(newOrder) {
  if (!Array.isArray(newOrder)) return false;
  
  newOrder.forEach((item, index) => {
    const highlight = this.highlights.id(item.id);
    if (highlight) {
      highlight.order = index;
    }
  });
  
  return true;
};

const Season = mongoose.model('Season', seasonSchema);

export default Season;
