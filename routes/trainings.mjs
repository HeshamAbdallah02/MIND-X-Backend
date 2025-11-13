// backend/routes/trainings.mjs
import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import Training from '../models/Training.mjs';
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
const uploadToCloudinary = (buffer, originalname, folder = 'trainings') => {
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

// GET all published trainings (public)
router.get('/public', asyncHandler(async (req, res) => {
  const { status, category, featured } = req.query;
  
  const query = { isPublished: true };
  
  if (status) {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (featured === 'true') {
    query.isFeatured = true;
  }
  
  const trainings = await Training.find(query)
    .sort({ startDate: -1, displayOrder: 1 })
    .select('-__v');
  
  res.json(trainings);
}));

// GET upcoming trainings (public)
router.get('/public/upcoming', asyncHandler(async (req, res) => {
  const now = new Date();
  
  const trainings = await Training.find({
    isPublished: true,
    status: 'upcoming',
    startDate: { $gte: now }
  })
    .sort({ startDate: 1, displayOrder: 1 })
    .select('-__v');
  
  res.json(trainings);
}));

// GET past trainings (public)
router.get('/public/past', asyncHandler(async (req, res) => {
  const trainings = await Training.find({
    isPublished: true,
    status: 'completed'
  })
    .sort({ startDate: -1 })
    .select('-__v');
  
  res.json(trainings);
}));

// GET featured training (public)
router.get('/public/featured', asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    isPublished: true,
    isFeatured: true,
    status: { $in: ['upcoming', 'ongoing'] }
  })
    .sort({ startDate: 1 })
    .select('-__v');
  
  res.json(training);
}));

// GET single training by slug (public)
router.get('/public/:slug', asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    slug: req.params.slug,
    isPublished: true
  }).select('-__v');
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  // Increment view count
  training.stats.views += 1;
  await training.save();
  
  res.json(training);
}));

// ==================== ADMIN ROUTES ====================

// GET all trainings (admin)
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const trainings = await Training.find({ createdBy: req.adminId })
    .sort({ startDate: -1, createdAt: -1 })
    .select('-__v');
  
  res.json(trainings);
}));

// GET single training by ID (admin)
router.get('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  }).select('-__v');
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  res.json(training);
}));

// CREATE new training (admin)
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const trainingData = {
    ...req.body,
    createdBy: req.adminId
  };
  
  const training = new Training(trainingData);
  await training.save();
  
  res.status(201).json(training);
}));

// UPDATE training (admin)
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const training = await Training.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.adminId },
    { ...req.body, updatedBy: req.adminId },
    { new: true, runValidators: true }
  ).select('-__v');
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  res.json(training);
}));

// DELETE training (admin)
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  // Clean up images before deleting
  if (training.coverImage?.public_id) {
    await deleteFromCloudinary(training.coverImage.public_id);
  }
  
  for (const image of training.galleryImages || []) {
    if (image.public_id) {
      await deleteFromCloudinary(image.public_id);
    }
  }
  
  for (const instructor of training.instructors || []) {
    if (instructor.avatar?.public_id) {
      await deleteFromCloudinary(instructor.avatar.public_id);
    }
  }
  
  await Training.findByIdAndDelete(req.params.id);
  
  res.json({ message: 'Training deleted successfully' });
}));

// TOGGLE publish status (admin)
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  training.isPublished = !training.isPublished;
  training.updatedBy = req.adminId;
  await training.save();
  
  res.json(training);
}));

// TOGGLE featured status (admin)
router.patch('/admin/:id/feature', authMiddleware, asyncHandler(async (req, res) => {
  const training = await Training.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  // If setting as featured, unfeatured others
  if (!training.isFeatured) {
    await Training.updateMany(
      { createdBy: req.adminId, isFeatured: true },
      { isFeatured: false }
    );
  }
  
  training.isFeatured = !training.isFeatured;
  training.updatedBy = req.adminId;
  await training.save();
  
  res.json(training);
}));

// UPDATE registration spots (admin)
router.patch('/admin/:id/registration', authMiddleware, asyncHandler(async (req, res) => {
  const { registered } = req.body;
  
  const training = await Training.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!training) {
    return res.status(404).json({ message: 'Training not found' });
  }
  
  if (registered !== undefined) {
    training.registration.spots.registered = registered;
    training.registration.spots.available = 
      (training.registration.spots.total || 0) - registered;
    training.stats.registrations = registered;
  }
  
  training.updatedBy = req.adminId;
  await training.save();
  
  res.json(training);
}));

// ==================== IMAGE UPLOAD ROUTES ====================

// UPLOAD cover image (admin)
router.post('/admin/:id/cover-image', 
  authMiddleware, 
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const training = await Training.findOne({
      _id: req.params.id,
      createdBy: req.adminId
    });
    
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }
    
    // Delete old cover image if exists
    if (training.coverImage?.public_id) {
      await deleteFromCloudinary(training.coverImage.public_id);
    }
    
    // Upload new image
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'trainings/covers'
    );
    
    training.coverImage = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    training.updatedBy = req.adminId;
    await training.save();
    
    res.json(training);
  })
);

// ADD gallery image (admin)
router.post('/admin/:id/gallery-image',
  authMiddleware,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const training = await Training.findOne({
      _id: req.params.id,
      createdBy: req.adminId
    });
    
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }
    
    // Upload new image
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'trainings/gallery'
    );
    
    training.galleryImages.push({
      url: result.secure_url,
      public_id: result.public_id,
      caption: req.body.caption || ''
    });
    
    training.updatedBy = req.adminId;
    await training.save();
    
    res.json(training);
  })
);

// DELETE gallery image (admin)
router.delete('/admin/:id/gallery-image/:imageId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const training = await Training.findOne({
      _id: req.params.id,
      createdBy: req.adminId
    });
    
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }
    
    const image = training.galleryImages.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Delete from Cloudinary
    if (image.public_id) {
      await deleteFromCloudinary(image.public_id);
    }
    
    // Remove from array
    training.galleryImages.pull(req.params.imageId);
    training.updatedBy = req.adminId;
    await training.save();
    
    res.json(training);
  })
);

// UPLOAD instructor avatar (admin)
router.post('/admin/:id/instructor/:instructorId/avatar',
  authMiddleware,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const training = await Training.findOne({
      _id: req.params.id,
      createdBy: req.adminId
    });
    
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }
    
    const instructor = training.instructors.id(req.params.instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    
    // Delete old avatar if exists
    if (instructor.avatar?.public_id) {
      await deleteFromCloudinary(instructor.avatar.public_id);
    }
    
    // Upload new image
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'trainings/instructors'
    );
    
    instructor.avatar = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    training.updatedBy = req.adminId;
    await training.save();
    
    res.json(training);
  })
);

// ==================== STATISTICS ROUTES ====================

// GET training statistics (admin)
router.get('/admin/stats/overview', authMiddleware, asyncHandler(async (req, res) => {
  const [totalTrainings, upcomingCount, pastCount, ongoingCount] = await Promise.all([
    Training.countDocuments({ createdBy: req.adminId }),
    Training.countDocuments({ createdBy: req.adminId, status: 'upcoming' }),
    Training.countDocuments({ createdBy: req.adminId, status: 'completed' }),
    Training.countDocuments({ createdBy: req.adminId, status: 'ongoing' })
  ]);
  
  const trainings = await Training.find({ createdBy: req.adminId });
  
  const totalRegistrations = trainings.reduce((sum, t) => sum + (t.stats?.registrations || 0), 0);
  const totalViews = trainings.reduce((sum, t) => sum + (t.stats?.views || 0), 0);
  
  res.json({
    totalTrainings,
    upcomingCount,
    pastCount,
    ongoingCount,
    totalRegistrations,
    totalViews
  });
}));

export default router;
