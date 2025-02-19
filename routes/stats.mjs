// backend/routes/stats.mjs
import express from 'express';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Stat from '../models/Stats.mjs';
import authMiddleware from '../middleware/auth.mjs';

const router = express.Router();

// GET all stats (public)
router.get('/', asyncHandler(async (req, res) => {
  const stats = await Stat.find().sort({ order: 1 });
  res.json(stats);
}));

// POST create new stat (protected)
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const count = await Stat.countDocuments();
  if (count >= 7) {
    return res.status(400).json({ message: 'Maximum of 7 statistics allowed' });
  }
  const stat = await Stat.create(req.body);
  res.status(201).json(stat);
}));

// PUT update stat (protected)
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const stat = await Stat.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!stat) return res.status(404).json({ message: 'Stat not found' });
  res.json(stat);
}));

// DELETE stat (protected)
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const stat = await Stat.findByIdAndDelete(req.params.id);
  if (!stat) return res.status(404).json({ message: 'Stat not found' });
  res.json({ message: 'Stat removed' });
}));

export default router;