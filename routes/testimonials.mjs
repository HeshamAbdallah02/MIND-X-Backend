// backend/routes/testimonials.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import Testimonial from '../models/Testimonial.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Joi from 'joi';

const router = express.Router();

const testimonialValidation = Joi.object({
  name: Joi.string().required(),
  position: Joi.string().required(),
  feedback: Joi.string().required(),
  image: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }),
  profileUrl: Joi.string().uri().allow(''),
  order: Joi.number(),
  active: Joi.boolean()
});

// Get all testimonials (public)
router.get('/', asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find()
    .sort({ order: 1, createdAt: -1 });
  res.json(testimonials);
}));

// Get active testimonials (public)
router.get('/active', asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find({ active: true })
    .sort({ order: 1 });
  res.json(testimonials);
}));

// Create testimonial (protected)
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = testimonialValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const testimonial = await Testimonial.create(req.body);
  res.status(201).json(testimonial);
}));

router.patch('/:id/active', authMiddleware, asyncHandler(async (req, res) => {
  const { active } = req.body;
  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { active },
    { new: true }
  );

  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  res.json(testimonial);
}));

// Update testimonial (protected)
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = testimonialValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  res.json(testimonial);
}));

// Delete testimonial (protected)
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
  
  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  res.json({ message: 'Testimonial deleted successfully' });
}));

// Update order (protected)
router.patch('/:id/order', authMiddleware, asyncHandler(async (req, res) => {
  const { order } = req.body;
  
  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { order },
    { new: true }
  );

  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  res.json(testimonial);
}));

export default router;