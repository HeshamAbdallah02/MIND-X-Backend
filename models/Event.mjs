// backend/models/Event.mjs
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    text: { type: String, required: true },
    color: { type: String, default: '#606161' }
  },
  description: {
    text: { type: String, required: true },
    color: { type: String, default: '#606161' }
  },
  date: {
    text: { type: String, required: true },
    color: { type: String, default: '#FBB859' }
  },
  coverImage: {
    url: { type: String, required: true },
    alt: { type: String, default: '' }
  },
  contentAreaColor: {
    type: String,
    default: '#81C99C'
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  url: {
    type: String,
    default: '',
    match: [/^(https?:\/\/)?([\da-z\.-]+\.)+[a-z]{2,}(:\d{1,5})?(\/.*)?$/i, 'Please use a valid URL']
  }
}, { timestamps: true });

eventSchema.index({ order: 1 });

export default mongoose.model('Event', eventSchema);