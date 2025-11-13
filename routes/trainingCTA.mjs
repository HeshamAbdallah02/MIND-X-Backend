// backend/routes/trainingCTA.mjs
import express from 'express';
import TrainingCTA from '../models/TrainingCTA.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// GET active CTA (public)
router.get('/public', asyncHandler(async (req, res) => {
  const cta = await TrainingCTA.findOne({ isActive: true })
    .select('-createdBy -updatedBy -__v')
    .sort({ createdAt: -1 });
  
  if (!cta) {
    return res.status(404).json({ message: 'No active training CTA found' });
  }
  
  res.json(cta);
}));

// ==================== ADMIN ROUTES ====================

// GET CTA (admin)
router.get('/admin', authMiddleware, asyncHandler(async (req, res) => {
  let cta = await TrainingCTA.findOne();
  
  if (!cta) {
    // Create default CTA if none exists
    cta = await TrainingCTA.create({
      title: 'Volunteer with us as a trainer',
      description: 'Share your knowledge and expertise with our community. Join our team of trainers and make a difference.',
      buttonText: 'Apply Now',
      formLink: '',
      createdBy: req.adminId
    });
  }
  
  res.json(cta);
}));

// UPDATE CTA (admin)
router.put('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const { title, description, buttonText, formLink, backgroundColor, textColor, isActive } = req.body;
  
  let cta = await TrainingCTA.findOne();
  
  if (!cta) {
    // Create if doesn't exist
    cta = await TrainingCTA.create({
      title,
      description,
      buttonText,
      formLink,
      backgroundColor,
      textColor,
      isActive,
      createdBy: req.adminId
    });
  } else {
    // Update existing
    cta.title = title;
    cta.description = description;
    cta.buttonText = buttonText;
    cta.formLink = formLink;
    cta.backgroundColor = backgroundColor || cta.backgroundColor;
    cta.textColor = textColor || cta.textColor;
    cta.isActive = isActive !== undefined ? isActive : cta.isActive;
    cta.updatedBy = req.adminId;
    
    await cta.save();
  }
  
  res.json(cta);
}));

// TOGGLE active status (admin)
router.patch('/admin/toggle', authMiddleware, asyncHandler(async (req, res) => {
  const cta = await TrainingCTA.findOne();
  
  if (!cta) {
    return res.status(404).json({ message: 'Training CTA not found' });
  }
  
  cta.isActive = !cta.isActive;
  cta.updatedBy = req.adminId;
  await cta.save();
  
  res.json(cta);
}));

export default router;
