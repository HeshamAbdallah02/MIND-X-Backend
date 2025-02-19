// backend/models/Testimonial.mjs
import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, required: true },
  feedback: { type: String, required: true },
  image: {
    url: { type: String, required: true },
    alt: { type: String, default: '' }
  },
  profileUrl: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Testimonial', testimonialSchema);