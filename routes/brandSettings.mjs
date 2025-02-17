// backend/routes/brandSettings.js
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import Settings from '../models/BrandSettings.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Joi from 'joi';

const router = express.Router();

const settingsValidation = Joi.object({
  logo: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }).required(),
  missionText: Joi.string().required(),
  visionText: Joi.string().required(),
  missionBgColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  visionBgColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  missionTextColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  visionTextColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
}).unknown(true);

// Get settings
router.get('/', asyncHandler(async (_, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({
      logo: {
        url: '/default-logo.png',
        alt: 'MIND-X Logo'
      },
      missionText: "To inspire and empower individuals through innovative development solutions, fostering growth and positive change in communities worldwide.",
      visionText: "To be the catalyst for transformative change, creating a world where inspiration and development go hand in hand, nurturing the unlimited potential of the human spirit.",
      missionBgColor: '#FBB859',
      visionBgColor: '#81C99C',
      missionTextColor: '#606161',
      visionTextColor: '#606161'
    });
  }
  
  res.json(settings);
}));

// Update settings (protected)
router.put('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('Received update request:', req.body); // Debug log
  
  const { error } = settingsValidation.validate(req.body);
  if (error) {
    console.log('Validation error:', error); // Debug log
    return res.status(400).json({
      message: 'Validation failed',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
      }))
    });
  }

  const settings = await Settings.findOneAndUpdate(
    {},
    req.body,
    { new: true, upsert: true, runValidators: true }
  );

  console.log('Updated settings:', settings); // Debug log
  res.json(settings);
}));

export default router;