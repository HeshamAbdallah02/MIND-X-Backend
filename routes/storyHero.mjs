//backend/routes/storyHero.mjs
import { Router } from 'express';
import StoryHero from '../models/StoryHero.mjs';
import authMiddleware from '../middleware/auth.mjs';
import mongoose from 'mongoose';

const router = Router();

// Get story hero content (public)
router.get('/', async (_req, res) => {
  try {
    // Get the active story hero
    let storyHero = await StoryHero.findOne({ isActive: true });
    
    // If no active story hero exists, create a default one
    if (!storyHero) {
      storyHero = new StoryHero({
        headline: 'Our Story',
        hookLine: 'From Day One to Today: Our Journey',
        images: [],
        autoScrollSpeed: 5000,
        showIndicators: false,
        isActive: true
      });
      await storyHero.save();
    }

    // Sort images by order
    if (storyHero.images && storyHero.images.length > 0) {
      storyHero.images.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    res.json(storyHero);
  } catch (error) {
    console.error('Error fetching story hero:', error);
    res.status(500).json({ error: 'Failed to fetch story hero content' });
  }
});

// Protected admin routes
// Update story hero content
router.put('/', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updateData = req.body;
    
    // Find existing active story hero or create new one
    let storyHero = await StoryHero.findOne({ isActive: true }).session(session);
    
    if (!storyHero) {
      // Create new story hero
      storyHero = new StoryHero({
        ...updateData,
        isActive: true
      });
    } else {
      // Update existing story hero
      Object.assign(storyHero, updateData);
    }

    // Sort images by order if they exist
    if (storyHero.images && storyHero.images.length > 0) {
      storyHero.images.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    const savedStoryHero = await storyHero.save({ session });
    await session.commitTransaction();
    
    res.json(savedStoryHero);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating story hero:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Add image to story hero
router.post('/images', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { url, alt } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Find or create story hero
    let storyHero = await StoryHero.findOne({ isActive: true }).session(session);
    
    if (!storyHero) {
      storyHero = new StoryHero({
        headline: 'Our Story',
        hookLine: 'From Day One to Today: Our Journey',
        images: [],
        isActive: true
      });
    }

    // Calculate next order
    const maxOrder = storyHero.images.length > 0 
      ? Math.max(...storyHero.images.map(img => img.order || 0))
      : -1;

    // Add new image
    const newImage = {
      _id: new mongoose.Types.ObjectId(),
      url,
      alt: alt || 'Story hero background',
      order: maxOrder + 1
    };

    storyHero.images.push(newImage);
    
    const savedStoryHero = await storyHero.save({ session });
    await session.commitTransaction();
    
    res.status(201).json(newImage);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding image to story hero:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Remove image from story hero
router.delete('/images/:imageId', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { imageId } = req.params;
    
    const storyHero = await StoryHero.findOne({ isActive: true }).session(session);
    
    if (!storyHero) {
      return res.status(404).json({ error: 'Story hero not found' });
    }

    // Find and remove the image
    const imageIndex = storyHero.images.findIndex(
      img => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }

    storyHero.images.splice(imageIndex, 1);
    
    // Reorder remaining images
    storyHero.images.forEach((img, index) => {
      img.order = index;
    });

    await storyHero.save({ session });
    await session.commitTransaction();
    
    res.json({ message: 'Image removed successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error removing image from story hero:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Reorder images
router.patch('/images/reorder', authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { imageIds } = req.body; // Array of image IDs in new order
    
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'imageIds must be an array' });
    }

    const storyHero = await StoryHero.findOne({ isActive: true }).session(session);
    
    if (!storyHero) {
      return res.status(404).json({ error: 'Story hero not found' });
    }

    // Reorder images based on provided order
    const reorderedImages = [];
    
    imageIds.forEach((imageId, index) => {
      const image = storyHero.images.find(img => img._id.toString() === imageId);
      if (image) {
        image.order = index;
        reorderedImages.push(image);
      }
    });

    storyHero.images = reorderedImages;
    
    await storyHero.save({ session });
    await session.commitTransaction();
    
    res.json({ message: 'Images reordered successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error reordering images:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Delete story hero (admin only)
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const storyHero = await StoryHero.findOneAndDelete({ isActive: true });
    
    if (!storyHero) {
      return res.status(404).json({ error: 'Story hero not found' });
    }
    
    res.json({ message: 'Story hero deleted successfully' });
  } catch (error) {
    console.error('Error deleting story hero:', error);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

export default router;
