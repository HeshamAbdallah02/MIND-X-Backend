//backend/routes/hero.js
import { Router } from 'express';
import HeroContent from '../models/Hero.mjs';
import authMiddleware from '../middleware/auth.mjs';
import validateHero, { validateOrder } from '../middleware/validateHero.mjs';
import mongoose from 'mongoose';

const router = Router();

// Get all hero contents (public)
router.get('/', async (_req, res) => {
  try {
    const contents = await HeroContent.find().sort('order');
    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hero content' });
  }
});

// Protected admin routes
router.post('/', authMiddleware, validateHero, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the highest order number
    const highestOrder = await HeroContent.findOne({})
      .sort({ order: -1 })
      .select('order')
      .session(session);

    // Set the new order number
    const newOrder = (highestOrder?.order ?? -1) + 1;

    // Create new content with the calculated order
    const content = new HeroContent({
      ...req.body,
      order: newOrder
    });

    const newContent = await content.save({ session });
    await session.commitTransaction();
    res.status(201).json(newContent);

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating hero content:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

router.patch('/:id/order', authMiddleware, validateOrder, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { order: newOrder } = req.body;
    
    // Get all contents sorted by order
    const allContents = await HeroContent.find({}).sort('order');
    
    // Find the content being moved and its current index
    const contentIndex = allContents.findIndex(content => content._id.toString() === id);
    if (contentIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Content not found' });
    }

    // Temporarily move all items to negative orders to avoid conflicts
    await HeroContent.updateMany(
      {},
      { $inc: { order: -10000 } },
      { session }
    );

    // Calculate new orders for all items
    const reorderedContents = [...allContents];
    const [movedContent] = reorderedContents.splice(contentIndex, 1);
    reorderedContents.splice(newOrder, 0, movedContent);

    // Update all items with their new orders
    await Promise.all(reorderedContents.map((content, index) => 
      HeroContent.findByIdAndUpdate(
        content._id,
        { order: index },
        { session }
      )
    ));

    await session.commitTransaction();
    res.json({ success: true });
  } catch (error) {
    await session.abortTransaction();
    console.error('Reorder error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

router.put('/:id', authMiddleware, validateHero, async (req, res) => {
  try {
    const content = await HeroContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json(content);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const content = await HeroContent.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json({ message: 'Hero content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

export default router;