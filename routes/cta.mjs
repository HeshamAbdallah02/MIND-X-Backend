// backend/routes/cta.mjs
import express from 'express';
import CTA from '../models/CTA.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// GET active CTA (public)
router.get('/active', asyncHandler(async (req, res) => {
  const cta = await CTA.findOne({ isActive: true }).sort({ createdAt: -1 });
  
  if (!cta) {
    return res.status(404).json({ message: 'No active CTA found' });
  }
  
  res.json(cta);
}));

// GET the CTA (admin) - returns the single CTA
router.get('/admin', authMiddleware, asyncHandler(async (req, res) => {
  let cta = await CTA.findOne().sort({ createdAt: -1 });
  
  // If no CTA exists, create a default one
  if (!cta) {
    cta = new CTA({
      title: 'Join MIND-X Today',
      description: 'Embark on an incredible journey of innovation, collaboration, and growth. Be part of a community that shapes the future through technology and creativity.',
      buttonText: 'Start Your Journey',
      buttonUrl: 'https://example.com/join',
      backgroundColor: '#3B82F6',
      isActive: false
    });
    await cta.save();
  }
  
  res.json(cta);
}));

// PUT update CTA (admin)
router.put('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const { title, description, buttonText, buttonUrl, backgroundColor, isActive } = req.body;
  
  let cta = await CTA.findOne().sort({ createdAt: -1 });
  
  if (!cta) {
    // Create new CTA if none exists
    cta = new CTA({
      title,
      description,
      buttonText,
      buttonUrl,
      backgroundColor,
      isActive
    });
  } else {
    // Update existing CTA
    cta.title = title;
    cta.description = description;
    cta.buttonText = buttonText;
    cta.buttonUrl = buttonUrl;
    cta.backgroundColor = backgroundColor;
    cta.isActive = isActive;
  }
  
  await cta.save();
  res.json(cta);
}));

// POST toggle active status (admin)
router.post('/admin/toggle', authMiddleware, asyncHandler(async (req, res) => {
  let cta = await CTA.findOne().sort({ createdAt: -1 });
  
  if (!cta) {
    return res.status(404).json({ message: 'No CTA found' });
  }
  
  cta.isActive = !cta.isActive;
  await cta.save();
  
  res.json(cta);
}));

export default router;
