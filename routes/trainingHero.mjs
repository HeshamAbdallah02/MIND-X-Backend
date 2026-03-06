// backend/routes/trainingHero.mjs
import express from 'express';
import TrainingHero from '../models/TrainingHero.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { upload, uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// GET active training hero (public)
router.get('/public', asyncHandler(async (req, res) => {
  const hero = await TrainingHero.findOne({ isActive: true })
    .select('-__v -createdBy -updatedBy');

  if (!hero) {
    return res.status(404).json({ message: 'Training hero not found' });
  }

  res.json(hero);
}));

// ==================== ADMIN ROUTES ====================

// GET training hero (admin)
router.get('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const hero = await TrainingHero.findOne({ createdBy: req.adminId })
    .select('-__v');

  res.json(hero);
}));

// CREATE or UPDATE training hero (admin)
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  let hero = await TrainingHero.findOne({ createdBy: req.adminId });

  if (hero) {
    // Update existing
    Object.assign(hero, req.body);
    hero.updatedBy = req.adminId;
    await hero.save();
  } else {
    // Create new
    hero = new TrainingHero({
      ...req.body,
      createdBy: req.adminId
    });
    await hero.save();
  }

  res.json(hero);
}));

// UPDATE training hero (admin)
router.put('/admin', authMiddleware, asyncHandler(async (req, res) => {
  let hero = await TrainingHero.findOne({ createdBy: req.adminId });

  if (!hero) {
    // Create if doesn't exist
    hero = new TrainingHero({
      ...req.body,
      createdBy: req.adminId
    });
  } else {
    // Update existing
    Object.assign(hero, req.body);
    hero.updatedBy = req.adminId;
  }

  await hero.save();
  res.json(hero);
}));

// UPLOAD background image (admin)
router.post('/admin/background-image',
  authMiddleware,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    let hero = await TrainingHero.findOne({ createdBy: req.adminId });

    if (!hero) {
      return res.status(404).json({
        message: 'Training hero not found. Please create it first.'
      });
    }

    // Delete old image if exists
    if (hero.backgroundImage?.public_id) {
      await deleteFromCloudinary(hero.backgroundImage.public_id);
    }

    // Upload new image
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'training-hero'
    );

    hero.backgroundImage = {
      url: result.secure_url,
      public_id: result.public_id
    };

    hero.updatedBy = req.adminId;
    await hero.save();

    res.json(hero);
  })
);

// TOGGLE active status (admin)
router.patch('/admin/toggle-active', authMiddleware, asyncHandler(async (req, res) => {
  const hero = await TrainingHero.findOne({ createdBy: req.adminId });

  if (!hero) {
    return res.status(404).json({ message: 'Training hero not found' });
  }

  hero.isActive = !hero.isActive;
  hero.updatedBy = req.adminId;
  await hero.save();

  res.json(hero);
}));

// DELETE training hero (admin)
router.delete('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const hero = await TrainingHero.findOne({ createdBy: req.adminId });

  if (!hero) {
    return res.status(404).json({ message: 'Training hero not found' });
  }

  // Delete background image from Cloudinary
  if (hero.backgroundImage?.public_id) {
    await deleteFromCloudinary(hero.backgroundImage.public_id);
  }

  await TrainingHero.findByIdAndDelete(hero._id);

  res.json({ message: 'Training hero deleted successfully' });
}));

export default router;
