// backend/routes/seasons.mjs
import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import Season from '../models/Season.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, originalname, folder = 'seasons') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: folder,
        public_id: `${folder}_${Date.now()}_${originalname.split('.')[0]}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readable = Readable.from(buffer);
    readable.pipe(stream);
  });
};

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error);
    }
  }
};

// ==================== PUBLIC ROUTES ====================

// GET all active seasons (public)
router.get('/', asyncHandler(async (req, res) => {
  const seasons = await Season.find({ isActive: true })
    .sort({ order: 1 });
  
  res.json(seasons);
}));

// GET single season by academic year (public)
router.get('/year/:academicYear', asyncHandler(async (req, res) => {
  const season = await Season.findOne({ 
    academicYear: req.params.academicYear,
    isActive: true 
  });
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  res.json(season);
}));

// GET single season by ID (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const season = await Season.findOne({ 
    _id: req.params.id,
    isActive: true 
  });
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  res.json(season);
}));

// ==================== ADMIN ROUTES ====================

// GET all seasons including inactive (admin)
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const seasons = await Season.find()
    .sort({ order: 1 });
  
  res.json(seasons);
}));

// POST create new season (admin)
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  console.log('Creating season with data:', JSON.stringify(req.body, null, 2));
  
  // Get next order number
  const order = await Season.getNextOrder();
  
  // Set board member orders if any board members are provided
  if (req.body.boardMembers && req.body.boardMembers.length > 0) {
    req.body.boardMembers.forEach((member, index) => {
      member.displayOrder = index;
    });
  }
  
  // Set highlight orders if any highlights are provided
  if (req.body.highlights && req.body.highlights.length > 0) {
    req.body.highlights.forEach((highlight, index) => {
      highlight.displayOrder = index;
    });
  }
  
  try {
    const season = await Season.create({
      ...req.body,
      order
    });
    
    console.log('Season created successfully:', season._id);
    res.status(201).json(season);
  } catch (error) {
    console.error('Error creating season:', error);
    console.error('Validation errors:', error.errors);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    throw error;
  }
}));

// PUT update season (admin)
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  res.json(season);
}));

// DELETE season (admin)
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  // Delete cover image from Cloudinary
  if (season.coverImage?.public_id) {
    await deleteFromCloudinary(season.coverImage.public_id);
  }
  
  // Delete all board member avatars from Cloudinary
  for (const member of season.boardMembers) {
    if (member.avatar?.public_id) {
      await deleteFromCloudinary(member.avatar.public_id);
    }
  }
  
  await Season.findByIdAndDelete(req.params.id);
  
  res.json({ message: 'Season deleted successfully' });
}));

// PUT reorder seasons (admin)
router.put('/admin/reorder/batch', authMiddleware, asyncHandler(async (req, res) => {
  const { seasons } = req.body;
  
  if (!Array.isArray(seasons)) {
    return res.status(400).json({ message: 'Seasons must be an array' });
  }
  
  // Update order for each season
  const updatePromises = seasons.map((season, index) => 
    Season.findByIdAndUpdate(season.id, { order: index })
  );
  
  await Promise.all(updatePromises);
  
  const updatedSeasons = await Season.find().sort({ order: 1 });
  res.json(updatedSeasons);
}));

// ==================== IMAGE UPLOAD ROUTES ====================

// POST upload cover image (admin)
router.post('/admin/:id/cover-image', 
  authMiddleware, 
  upload.single('image'), 
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Season not found' });
    }

    try {
      // Delete old image if exists
      if (season.coverImage?.public_id) {
        await deleteFromCloudinary(season.coverImage.public_id);
      }

      // Upload new image
      const result = await uploadToCloudinary(
        req.file.buffer, 
        req.file.originalname,
        'seasons/covers'
      );

      // Update season with new image
      season.coverImage = {
        url: result.secure_url,
        public_id: result.public_id
      };

      await season.save();

      res.json({
        message: 'Cover image uploaded successfully',
        coverImage: season.coverImage
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ 
        message: 'Failed to upload image',
        error: error.message 
      });
    }
  })
);

// DELETE cover image (admin)
router.delete('/admin/:id/cover-image', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  if (season.coverImage?.public_id) {
    await deleteFromCloudinary(season.coverImage.public_id);
  }
  
  season.coverImage = { url: null, public_id: null };
  await season.save();
  
  res.json({ message: 'Cover image deleted successfully' });
}));

// ==================== BOARD MEMBER ROUTES ====================

// POST add board member (admin)
router.post('/admin/:id/board-members', authMiddleware, asyncHandler(async (req, res) => {
  console.log('Adding board member - Request body:', JSON.stringify(req.body, null, 2));
  
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  // Process member data
  const memberData = { ...req.body };
  
  // If this member is being set as leader, ensure position is "Team Leader"
  if (memberData.isLeader) {
    memberData.position = 'Team Leader';
    
    // Remove leader status from all existing members
    season.boardMembers.forEach(member => {
      member.isLeader = false;
    });
  }
  
  // Set display order for the new member
  memberData.displayOrder = season.boardMembers.length;
  
  season.boardMembers.push(memberData);
  await season.save();
  
  // Return the newly created member
  const newMember = season.boardMembers[season.boardMembers.length - 1];
  res.status(201).json(newMember);
}));

// PUT update board member (admin)
router.put('/admin/:id/board-members/:memberId', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const member = season.boardMembers.id(req.params.memberId);
  if (!member) {
    return res.status(404).json({ message: 'Board member not found' });
  }
  
  // Process update data
  const updateData = { ...req.body };
  
  // If this member is being set as leader, ensure position is "Team Leader"
  if (updateData.isLeader) {
    updateData.position = 'Team Leader';
    
    // Remove leader status from all other members
    season.boardMembers.forEach(m => {
      if (m._id.toString() !== req.params.memberId) {
        m.isLeader = false;
      }
    });
  }
  
  // Update member data
  Object.assign(member, updateData);
  await season.save();
  
  res.json(member);
}));

// DELETE board member (admin)
router.delete('/admin/:id/board-members/:memberId', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const member = season.boardMembers.id(req.params.memberId);
  if (!member) {
    return res.status(404).json({ message: 'Board member not found' });
  }
  
  // Delete avatar from Cloudinary if exists
  if (member.avatar && member.avatar.public_id) {
    await deleteFromCloudinary(member.avatar.public_id);
  }
  
  member.remove();
  await season.save();
  
  res.json({ message: 'Board member deleted successfully' });
}));

// POST upload board member avatar (admin)
router.post('/admin/:id/board-members/:memberId/avatar', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const member = season.boardMembers.id(req.params.memberId);
  if (!member) {
    return res.status(404).json({ message: 'Board member not found' });
  }
  
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }
  
  try {
    // Delete old avatar if exists
    if (member.avatar && member.avatar.public_id) {
      await deleteFromCloudinary(member.avatar.public_id);
    }
    
    // Upload new avatar
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'board-members');
    
    member.avatar = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    await season.save();
    
    res.json({ 
      message: 'Avatar uploaded successfully',
      url: result.secure_url 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
}));

// ==================== HIGHLIGHTS ROUTES ====================

// POST add highlight (admin)
router.post('/admin/:id/highlights', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  // Set display order for the new highlight
  const nextOrder = season.highlights.length;
  const highlightData = {
    ...req.body,
    displayOrder: nextOrder
  };
  
  season.highlights.push(highlightData);
  await season.save();
  
  // Return the newly created highlight
  const newHighlight = season.highlights[season.highlights.length - 1];
  res.status(201).json(newHighlight);
}));

// PUT update highlight (admin)
router.put('/admin/:id/highlights/:highlightId', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const highlight = season.highlights.id(req.params.highlightId);
  if (!highlight) {
    return res.status(404).json({ message: 'Highlight not found' });
  }
  
  // Update highlight data
  Object.assign(highlight, req.body);
  await season.save();
  
  res.json(highlight);
}));

// DELETE highlight (admin)
router.delete('/admin/:id/highlights/:highlightId', authMiddleware, asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const highlight = season.highlights.id(req.params.highlightId);
  if (!highlight) {
    return res.status(404).json({ message: 'Highlight not found' });
  }
  
  // Delete image from Cloudinary if exists
  if (highlight.image && highlight.image.public_id) {
    await deleteFromCloudinary(highlight.image.public_id);
  }
  
  highlight.remove();
  await season.save();
  
  res.json({ message: 'Highlight deleted successfully' });
}));

// POST upload highlight image (admin)
router.post('/admin/:id/highlights/:highlightId/image', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);
  
  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }
  
  const highlight = season.highlights.id(req.params.highlightId);
  if (!highlight) {
    return res.status(404).json({ message: 'Highlight not found' });
  }
  
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }
  
  try {
    // Delete old image if exists
    if (highlight.image && highlight.image.public_id) {
      await deleteFromCloudinary(highlight.image.public_id);
    }
    
    // Upload new image
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'highlights');
    
    highlight.image = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    await season.save();
    
    res.json({ 
      message: 'Image uploaded successfully',
      url: result.secure_url 
    });
  } catch (error) {
    console.error('Error uploading highlight image:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
}));

export default router;
