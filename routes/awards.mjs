// backend/routes/awards.mjs
import express from 'express';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Award from '../models/Award.mjs';
import AwardsSettings from '../models/AwardsSettings.mjs';
import authMiddleware from '../middleware/auth.mjs';

const router = express.Router();

// GET all awards (public)
router.get('/', asyncHandler(async (req, res) => {
  const awards = await Award.find({ isVisible: true })
    .sort({ year: -1, order: 1 });
  res.json(awards);
}));

// GET all awards including hidden ones (protected - for dashboard)
router.get('/all', authMiddleware, asyncHandler(async (req, res) => {
  const awards = await Award.find()
    .sort({ year: -1, order: 1 });
  res.json(awards);
}));

// GET single award (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const award = await Award.findById(req.params.id);
  if (!award) {
    return res.status(404).json({ message: 'Award not found' });
  }
  res.json(award);
}));

// POST create new award (protected)
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  // Set order to be last by default
  const maxOrder = await Award.findOne().sort({ order: -1 }).select('order');
  const order = maxOrder ? maxOrder.order + 1 : 0;
  
  const award = await Award.create({
    ...req.body,
    order
  });
  res.status(201).json(award);
}));

// PUT update award (protected)
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const award = await Award.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  if (!award) {
    return res.status(404).json({ message: 'Award not found' });
  }
  
  res.json(award);
}));

// DELETE award (protected)
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const award = await Award.findByIdAndDelete(req.params.id);
  
  if (!award) {
    return res.status(404).json({ message: 'Award not found' });
  }
  
  res.json({ message: 'Award deleted successfully' });
}));

// PUT reorder awards (protected)
router.put('/reorder/batch', authMiddleware, asyncHandler(async (req, res) => {
  const { awards } = req.body;
  
  if (!Array.isArray(awards)) {
    return res.status(400).json({ message: 'Awards must be an array' });
  }
  
  // Update order for each award
  const updatePromises = awards.map((award, index) => 
    Award.findByIdAndUpdate(award._id, { order: index })
  );
  
  await Promise.all(updatePromises);
  
  const updatedAwards = await Award.find({ isVisible: true })
    .sort({ year: -1, order: 1 });
  
  res.json(updatedAwards);
}));

// GET awards settings (public)
router.get('/settings/config', asyncHandler(async (req, res) => {
  const settings = await AwardsSettings.findOrCreateDefault();
  res.json(settings);
}));

// PUT update awards settings (protected)
router.put('/settings/config', authMiddleware, asyncHandler(async (req, res) => {
  let settings = await AwardsSettings.findOne();
  
  if (!settings) {
    settings = await AwardsSettings.create(req.body);
  } else {
    settings = await AwardsSettings.findByIdAndUpdate(settings._id, req.body, {
      new: true,
      runValidators: true
    });
  }
  
  res.json(settings);
}));

// GET awards by type (public)
router.get('/type/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const validTypes = ['gold', 'silver', 'bronze', 'special', 'achievement'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid award type' });
  }
  
  const awards = await Award.find({ type, isVisible: true })
    .sort({ year: -1, order: 1 });
  
  res.json(awards);
}));

// GET awards by year (public)
router.get('/year/:year', asyncHandler(async (req, res) => {
  const { year } = req.params;
  
  const awards = await Award.find({ year, isVisible: true })
    .sort({ order: 1 });
  
  res.json(awards);
}));

export default router;
