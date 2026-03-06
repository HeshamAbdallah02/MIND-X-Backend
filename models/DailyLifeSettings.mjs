// backend/models/DailyLifeSettings.mjs
import mongoose from 'mongoose';

const highlightSchema = new mongoose.Schema({
    icon: { type: String, required: true },       // emoji or icon name
    title: { type: String, required: true },
    description: { type: String, required: true },
    displayOrder: { type: Number, default: 0 }
});

const honorEntrySchema = new mongoose.Schema({
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    section: { type: String, required: true },     // team section name
    badge: { type: String, required: true },       // e.g. "Most Innovative"
    reason: { type: String, default: '' },
    month: { type: Number, required: true },       // 1-12
    year: { type: Number, required: true }
});

const timelineEntrySchema = new mongoose.Schema({
    time: { type: String, required: true },        // e.g. "9:00 AM"
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: {
        url: String,
        public_id: String
    },
    displayOrder: { type: Number, default: 0 }
});

const dailyLifeSettingsSchema = new mongoose.Schema({
    honorBoard: [honorEntrySchema],
    highlights: [highlightSchema],
    timeline: [timelineEntrySchema],
    isActive: { type: Boolean, default: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true,
    collection: 'dailylifesettings'
});

export default mongoose.model('DailyLifeSettings', dailyLifeSettingsSchema);
