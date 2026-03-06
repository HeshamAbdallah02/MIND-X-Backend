// backend/models/DailyLifePost.mjs
import mongoose from 'mongoose';

const POST_CATEGORIES = [
    'Workspace',
    'Team Activities',
    'Events',
    'Behind the Scenes',
    'Fun Moments',
    'Learning'
];

const postImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    alt: { type: String, default: '' }
});

const dailyLifePostSchema = new mongoose.Schema({
    author: {
        name: { type: String, required: true },
        role: { type: String, default: '' },
        avatar: {
            url: String,
            public_id: String
        }
    },
    images: {
        type: [postImageSchema],
        validate: [arr => arr.length >= 1 && arr.length <= 10, 'Posts must have 1-10 images']
    },
    caption: { type: String, default: '' },
    category: {
        type: String,
        required: true,
        enum: POST_CATEGORIES
    },
    likes: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true,
    collection: 'dailylifeposts'
});

dailyLifePostSchema.index({ isPublished: 1, createdAt: -1 });
dailyLifePostSchema.index({ category: 1, isPublished: 1 });

export { POST_CATEGORIES };
export default mongoose.model('DailyLifePost', dailyLifePostSchema);
