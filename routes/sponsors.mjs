// backend/routes/sponsors.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import Sponsor from '../models/Sponsor.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Joi from 'joi';

const router = express.Router();

const sponsorValidation = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('sponsor', 'partner').required(),
  logo: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }),
  website: Joi.string().uri().required(),
  order: Joi.number(),
  active: Joi.boolean()
});

// Get all active sponsors and partners (public)
router.get('/active', asyncHandler(async (req, res) => {
  const items = await Sponsor.find({ active: true })
    .sort({ type: 1, order: 1 })
    .lean();

  res.json({
    sponsors: items.filter(item => item.type === 'sponsor'),
    partners: items.filter(item => item.type === 'partner')
  });
}));

// Protected routes below
router.use(authMiddleware);

// Get all sponsors and partners (including inactive)
router.get('/', asyncHandler(async (req, res) => {
  const items = await Sponsor.find().sort({ type: 1, order: 1 });
  res.json(items);
}));

// Create new sponsor/partner
router.post('/', asyncHandler(async (req, res) => {
  const { error } = sponsorValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const sponsor = await Sponsor.create(req.body);
  res.status(201).json(sponsor);
}));

// Update sponsor/partner
router.put('/:id', asyncHandler(async (req, res) => {
  const { error } = sponsorValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const sponsor = await Sponsor.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!sponsor) {
    return res.status(404).json({ message: 'Sponsor not found' });
  }

  res.json(sponsor);
}));

// Delete sponsor/partner
router.delete('/:id', asyncHandler(async (req, res) => {
  const sponsor = await Sponsor.findByIdAndDelete(req.params.id);
  
  if (!sponsor) {
    return res.status(404).json({ message: 'Sponsor not found' });
  }

  res.json({ message: 'Sponsor deleted successfully' });
}));

// Update order
router.patch('/:id/order', asyncHandler(async (req, res) => {
  const { order } = req.body;
  
  const sponsor = await Sponsor.findByIdAndUpdate(
    req.params.id,
    { order },
    { new: true }
  );

  if (!sponsor) {
    return res.status(404).json({ message: 'Sponsor not found' });
  }

  res.json(sponsor);
}));

// Toggle active status
router.patch('/:id/active', asyncHandler(async (req, res) => {
  const sponsor = await Sponsor.findById(req.params.id);
  
  if (!sponsor) {
    return res.status(404).json({ message: 'Sponsor not found' });
  }

  sponsor.active = !sponsor.active;
  await sponsor.save();

  res.json(sponsor);
}));


export default router;