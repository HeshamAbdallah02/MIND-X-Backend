// backend/routes/brandSettings.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import Settings from '../models/BrandSettings.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Joi from 'joi';

const router = express.Router();

// matches #RGB, #RRGGBB or rgba(r,g,b,a)
const colorPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$|^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i;

const settingsValidation = Joi.object({
  logo: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }).optional(),

  missionText:  Joi.string().optional(),
  visionText:   Joi.string().optional(),
  missionBgColor:   Joi.string().pattern(colorPattern).optional(),
  visionBgColor:    Joi.string().pattern(colorPattern).optional(),
  missionTextColor: Joi.string().pattern(colorPattern).optional(),
  visionTextColor:  Joi.string().pattern(colorPattern).optional(),

  sponsorsColors: Joi.object({
    sectionBackground: Joi.string().pattern(colorPattern),
    titleColor:        Joi.string().pattern(colorPattern),
    sponsorsSpeed:     Joi.number().integer().min(50).max(300),
    partnersSpeed:     Joi.number().integer().min(50).max(300)
  }).optional(),

  statsColors: Joi.object({
    sectionBackground:  Joi.string().pattern(colorPattern).optional(),
    titleColor:         Joi.string().pattern(colorPattern).optional(),
    iconColor:          Joi.string().pattern(colorPattern).optional(),
    numberColor:        Joi.string().pattern(colorPattern).optional(),
    textPrimary:        Joi.string().pattern(colorPattern).optional(),
    feedbackTextColor:  Joi.string().pattern(colorPattern).optional()
  }).optional(),

  testimonialsColors: Joi.object({
    sectionBackground:   Joi.string().pattern(colorPattern).optional(),
    titleColor:          Joi.string().pattern(colorPattern).optional(),
    circleBorderColor:   Joi.string().pattern(colorPattern).optional(),
    quoteIconColor:      Joi.string().pattern(colorPattern).optional(),
    quoteIconBackground: Joi.string().pattern(colorPattern).optional(),
    nameColor:           Joi.string().pattern(colorPattern).optional(),
    positionColor:       Joi.string().pattern(colorPattern).optional(),
    feedbackBackground:  Joi.string().pattern(colorPattern).optional(),
    feedbackBorderColor: Joi.string().pattern(colorPattern).optional(),
    feedbackTextColor:   Joi.string().pattern(colorPattern).optional()
  }).optional(),

  footerLogo: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('').optional()
  }).optional(),

  footerSlogan: Joi.string().max(150).optional(),

  footerColors: Joi.object({
    background:     Joi.string().pattern(colorPattern).optional(),
    titleColor:     Joi.string().pattern(colorPattern).optional(),
    textColor:      Joi.string().pattern(colorPattern).optional(),
    linkColor:      Joi.string().pattern(colorPattern).optional(),
    inputBgColor:   Joi.string().pattern(colorPattern).optional(),
    inputTextColor: Joi.string().pattern(colorPattern).optional(),
    buttonBgColor:  Joi.string().pattern(colorPattern).optional(),
    buttonTextColor:Joi.string().pattern(colorPattern).optional()
  }).optional()
})
.unknown(true)    // allow `_id`, `__v`, timestamps, any other extra keys
.min(1);          // require at least one field in the payload

// GET current settings
router.get('/', asyncHandler(async (_req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      logo: { url: '/default-logo.png', alt: 'MIND‑X Logo' },
      missionText:  "To inspire and empower…",
      visionText:   "To be the catalyst…",
      missionBgColor:   '#FBB859',
      visionBgColor:    '#81C99C',
      missionTextColor: '#606161',
      visionTextColor:  '#606161',
      sponsorsColors: {
        sectionBackground: '#ffffff',
        titleColor:        '#606161',
        sponsorsSpeed:     100,
        partnersSpeed:     100
      },
      footerLogo: { url: '/default-logo.png', alt: 'MIND‑X Logo' },
      footerSlogan: 'Empowering students through innovation.',
      footerColors: {}
    });
  }
  res.json(settings);
}));

// PUT update settings
router.put('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('Received update request:', req.body);

  // 1️⃣ Validate only the incoming payload
  const { error } = settingsValidation.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map(d => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }));
    return res.status(400).json({ message: 'Validation failed', details });
  }

  // 2️⃣ Update exactly what was sent (no stripping or re-writing of other fields)
  const updated = await Settings.findOneAndUpdate(
    {},               // match the single document
    { $set: req.body },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  res.json(updated);
}));

// Change PUT to PATCH for partial updates
router.patch('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('Received update request:', req.body);

  // Validate only the incoming payload
  const { error } = settingsValidation.validate(req.body, { 
    abortEarly: false,
    allowUnknown: true
  });

  if (error) {
    const details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
      type: d.type
    }));
    console.error('Validation error:', details);
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: details
    });
  }

  try {
    const updated = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      {
        new: true,
        runValidators: true,
        context: 'query',
        setDefaultsOnInsert: true,
        upsert: true
      }
    );

    console.log('Successful update:', updated);
    res.json(updated);
  } catch (dbError) {
    console.error('Database error:', dbError);
    res.status(500).json({
      message: 'Database update failed',
      error: dbError.message
    });
  }
}));

export default router;
