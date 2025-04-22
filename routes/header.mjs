import { Router } from 'express';
import Header from '../models/Header.mjs';
import authMiddleware from '../middleware/auth.mjs';

const router = Router();

// Get header configuration
router.get('/', async (_req, res) => {
  try {
    let header = await Header.findOne();
    // If no header config exists, create default
    if (!header) {
      header = await Header.create({
        logo: {
          imageUrl: '',
          altText: 'MIND-X Logo'
        },
        colors: {
          background: '#81C99C',
          text: {
            default: '#606161',
            hover: '#FBB859'
          }
        }
      });
    }
    
    res.json(header);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching header configuration' });
  }
});

// Update header configuration
router.put('/', authMiddleware, async (req, res) => {
  try {
    let header = await Header.findOne();
    
    if (!header) {
      header = new Header();
    }
    
    // Update fields
    if (req.body.logo) header.logo = req.body.logo;
    if (req.body.colors) header.colors = req.body.colors;

    await header.save();
    res.json(header);
  } catch (error) {
    res.status(500).json({ error: 'Error updating header configuration' });
  }
});

// Update logo
router.put('/logo', authMiddleware, async (req, res) => {
  try {
    const { imageUrl, publicId } = req.body.logo;
    
    let header = await Header.findOne();
    if (!header) header = new Header();
    
    header.logo = { 
      imageUrl,
      publicId,
      altText: header.logo?.altText || 'MIND-X Logo'
    };
    
    await header.save();
    res.json(header);
  } catch (error) {
    console.error('Logo update error:', error);
    res.status(500).json({ 
      error: 'Error updating logo',
      details: error.message 
    });
  }
});

// Update colors
router.put('/colors', authMiddleware, async (req, res) => {
  try {
    let header = await Header.findOne();
    
    if (!header) {
      header = new Header();
    }
    
    header.colors = req.body.colors;
    await header.save();
    res.json(header);
  } catch (error) {
    res.status(500).json({ error: 'Error updating colors' });
  }
});

export default router;