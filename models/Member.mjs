// backend/models/Member.mjs
import mongoose from 'mongoose';

// Position hierarchy enum
const POSITIONS = [
    'High Board Leader',
    'High Board Member',
    'Team Leader',
    'Vice Leader',
    'Head of Section',
    'Vice Head of Section',
    'Member'
];

// Team sections enum
const SECTIONS = [
    'Marketing',
    'HR',
    'PR',
    'Graphic Design',
    'Training & Coordination',
    'Event Management',
    'Photography',
    'Video Editing'
];

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Member name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true
    },
    bio: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        enum: POSITIONS
    },
    // Section the member belongs to (required for certain positions)
    section: {
        type: String,
        enum: SECTIONS
    },
    // For High Board Members - the section they mentor
    mentorSection: {
        type: String,
        enum: SECTIONS
    },
    avatar: {
        url: String,
        publicId: String
    },
    status: {
        type: String,
        enum: ['active', 'alumni', 'inactive'],
        default: 'active'
    },
    // Reference to blogs written by this member
    blogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'
    }],
    // Social links (optional, for future use)
    socialLinks: {
        linkedin: String,
        twitter: String,
        github: String,
        portfolio: String
    },
    // Display order for sorting
    displayOrder: {
        type: Number,
        default: 0
    },
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
    collection: 'members'
});

// Indexes
memberSchema.index({ status: 1, position: 1 });
memberSchema.index({ section: 1, status: 1 });
memberSchema.index({ displayOrder: 1 });

// Generate slug from name
memberSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

        // Add timestamp to ensure uniqueness
        this.slug += `-${Date.now()}`;
    }

    // Validate section requirement based on position
    const positionsRequiringSection = ['Head of Section', 'Vice Head of Section', 'Member'];
    if (positionsRequiringSection.includes(this.position) && !this.section) {
        return next(new Error(`Section is required for position: ${this.position}`));
    }

    // Validate mentor section for High Board Member
    if (this.position === 'High Board Member' && !this.mentorSection) {
        return next(new Error('Mentor section is required for High Board Member'));
    }

    next();
});

// Virtual for position display with section
memberSchema.virtual('fullPosition').get(function () {
    if (this.position === 'High Board Member' && this.mentorSection) {
        return `${this.position} - ${this.mentorSection} Mentor`;
    }
    if (['Head of Section', 'Vice Head of Section', 'Member'].includes(this.position) && this.section) {
        return `${this.position} - ${this.section}`;
    }
    return this.position;
});

// Ensure virtuals are included in JSON
memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

// Export constants for use in routes/frontend
export const MEMBER_POSITIONS = POSITIONS;
export const TEAM_SECTIONS = SECTIONS;

export default mongoose.model('Member', memberSchema);
