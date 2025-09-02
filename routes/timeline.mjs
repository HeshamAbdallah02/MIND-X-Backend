// backend/routes/timeline.mjs
import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import TimelineSection from '../models/TimelineSection.mjs';
import TimelinePhase from '../models/TimelinePhase.mjs';
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
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'timeline-phases',
        public_id: `phase_${Date.now()}_${originalname.split('.')[0]}`
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

// ==================== PUBLIC ROUTES ====================

// Helper function to get or create default journey section
const getOrCreateDefaultJourneySection = async () => {
  let section = await TimelineSection.findOne({ title: 'Our Journey' });
  
  if (!section) {
    section = new TimelineSection({
      title: 'Our Journey',
      subtitle: 'The story of our growth and evolution',
      backgroundColor: '#f8fafc',
      lineColor: '#e2e8f0',
      nodeColor: '#81C99C',
      textColor: '#1e293b',
      isActive: true,
      order: 1
    });
    await section.save();
  }
  
  return section;
};

// GET /api/timeline - Fetch all timeline data (sections and phases)
router.get('/', asyncHandler(async (req, res) => {
  try {
    // Fetch active sections
    const sections = await TimelineSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    // Fetch active phases
    const phases = await TimelinePhase.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    // Transform data to match frontend expectations
    const transformedSections = sections.map(section => ({
      id: section._id.toString(),
      title: section.title,
      subtitle: section.subtitle,
      backgroundColor: section.backgroundColor,
      lineColor: section.lineColor,
      nodeColor: section.nodeColor,
      textColor: section.textColor,
      isActive: section.isActive,
      order: section.order
    }));

    const transformedPhases = phases.map(phase => ({
      id: phase._id.toString(),
      year: phase.year,
      headline: phase.headline,
      description: phase.description,
      imageUrl: phase.imageUrl,
      imageAlt: phase.imageAlt,
      backgroundColor: phase.backgroundColor,
      textColor: phase.textColor,
      accentColor: phase.accentColor,
      position: phase.position,
      isActive: phase.isActive,
      order: phase.order,
      sectionId: phase.sectionId.toString(),
      expandable: phase.expandable
    }));

    res.json({
      sections: transformedSections,
      phases: transformedPhases
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch timeline data',
      error: error.message 
    });
  }
}));

// GET /api/timeline/sections - Fetch timeline sections only
router.get('/sections', asyncHandler(async (req, res) => {
  try {
    const sections = await TimelineSection.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    const transformedSections = sections.map(section => ({
      id: section._id.toString(),
      title: section.title,
      subtitle: section.subtitle,
      backgroundColor: section.backgroundColor,
      lineColor: section.lineColor,
      nodeColor: section.nodeColor,
      textColor: section.textColor,
      isActive: section.isActive,
      order: section.order
    }));

    res.json(transformedSections);
  } catch (error) {
    console.error('Error fetching timeline sections:', error);
    res.status(500).json({ 
      message: 'Failed to fetch timeline sections',
      error: error.message 
    });
  }
}));

// GET /api/timeline/sections/:sectionId/phases - Fetch timeline phases for a specific section
router.get('/sections/:sectionId/phases', asyncHandler(async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const phases = await TimelinePhase.find({ 
      sectionId, 
      isActive: true 
    })
      .sort({ order: 1 })
      .lean();

    const transformedPhases = phases.map(phase => ({
      id: phase._id.toString(),
      year: phase.year,
      headline: phase.headline,
      description: phase.description,
      imageUrl: phase.imageUrl,
      imageAlt: phase.imageAlt,
      backgroundColor: phase.backgroundColor,
      textColor: phase.textColor,
      accentColor: phase.accentColor,
      position: phase.position,
      isActive: phase.isActive,
      order: phase.order,
      sectionId: phase.sectionId.toString(),
      expandable: phase.expandable
    }));

    res.json(transformedPhases);
  } catch (error) {
    console.error('Error fetching timeline phases:', error);
    res.status(500).json({ 
      message: 'Failed to fetch timeline phases',
      error: error.message 
    });
  }
}));

// GET /api/timeline/phases - Fetch all timeline phases (admin only)
router.get('/phases', authMiddleware, asyncHandler(async (req, res) => {
  try {
    // Ensure default section exists
    const defaultSection = await getOrCreateDefaultJourneySection();
    
    const phases = await TimelinePhase.find({ sectionId: defaultSection._id })
      .populate('sectionId', 'title')
      .sort({ year: -1, order: 1 })
      .lean();

    // Transform the phases to include id field for frontend compatibility
    const transformedPhases = phases.map(phase => ({
      id: phase._id.toString(),
      year: phase.year,
      headline: phase.headline,
      description: phase.description,
      imageUrl: phase.imageUrl,
      imageAlt: phase.imageAlt,
      image: phase.image,
      backgroundColor: phase.backgroundColor,
      textColor: phase.textColor,
      accentColor: phase.accentColor,
      position: phase.position,
      isActive: phase.isActive,
      order: phase.order,
      sectionId: phase.sectionId._id.toString(),
      expandable: phase.expandable
    }));

    res.status(200).json(transformedPhases);
  } catch (error) {
    console.error('Error fetching all timeline phases:', error);
    res.status(500).json({ 
      message: 'Failed to fetch timeline phases',
      error: error.message 
    });
  }
}));

// ==================== ADMIN ROUTES ====================

// POST /api/timeline/sections - Create new timeline section (admin only)
router.post('/sections', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const sectionData = {
      title: req.body.title || 'Our Journey',
      subtitle: req.body.subtitle || '',
      backgroundColor: req.body.backgroundColor || '#f8fafc',
      lineColor: req.body.lineColor || '#e2e8f0',
      nodeColor: req.body.nodeColor || '#FBB859',
      textColor: req.body.textColor || '#1e293b',
      isActive: req.body.isActive !== false,
      order: req.body.order || 0
    };

    const newSection = new TimelineSection(sectionData);
    const savedSection = await newSection.save();

    res.status(201).json({
      id: savedSection._id.toString(),
      title: savedSection.title,
      subtitle: savedSection.subtitle,
      backgroundColor: savedSection.backgroundColor,
      lineColor: savedSection.lineColor,
      nodeColor: savedSection.nodeColor,
      textColor: savedSection.textColor,
      isActive: savedSection.isActive,
      order: savedSection.order
    });
  } catch (error) {
    console.error('Error creating timeline section:', error);
    res.status(500).json({ 
      message: 'Failed to create timeline section',
      error: error.message 
    });
  }
}));

// PUT /api/timeline/sections/:sectionId - Update timeline section (admin only)
router.put('/sections/:sectionId', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const section = await TimelineSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Timeline section not found' });
    }

    // Update fields if provided
    if (req.body.title !== undefined) section.title = req.body.title;
    if (req.body.subtitle !== undefined) section.subtitle = req.body.subtitle;
    if (req.body.backgroundColor !== undefined) section.backgroundColor = req.body.backgroundColor;
    if (req.body.lineColor !== undefined) section.lineColor = req.body.lineColor;
    if (req.body.nodeColor !== undefined) section.nodeColor = req.body.nodeColor;
    if (req.body.textColor !== undefined) section.textColor = req.body.textColor;
    if (req.body.isActive !== undefined) section.isActive = req.body.isActive;
    if (req.body.order !== undefined) section.order = req.body.order;

    const updatedSection = await section.save();

    res.json({
      id: updatedSection._id.toString(),
      title: updatedSection.title,
      subtitle: updatedSection.subtitle,
      backgroundColor: updatedSection.backgroundColor,
      lineColor: updatedSection.lineColor,
      nodeColor: updatedSection.nodeColor,
      textColor: updatedSection.textColor,
      isActive: updatedSection.isActive,
      order: updatedSection.order
    });
  } catch (error) {
    console.error('Error updating timeline section:', error);
    res.status(500).json({ 
      message: 'Failed to update timeline section',
      error: error.message 
    });
  }
}));

// DELETE /api/timeline/sections/:sectionId - Delete timeline section (admin only)
router.delete('/sections/:sectionId', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    // Delete section
    const section = await TimelineSection.findByIdAndDelete(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Timeline section not found' });
    }

    // Delete all phases associated with this section
    await TimelinePhase.deleteMany({ sectionId });

    res.json({ 
      message: 'Timeline section and associated phases deleted successfully',
      deletedSection: section._id.toString()
    });
  } catch (error) {
    console.error('Error deleting timeline section:', error);
    res.status(500).json({ 
      message: 'Failed to delete timeline section',
      error: error.message 
    });
  }
}));

// POST /api/timeline/phases - Create new timeline phase (admin only)
router.post('/phases', authMiddleware, asyncHandler(async (req, res) => {
  try {
    // Ensure default section exists and use it if no sectionId provided
    const defaultSection = await getOrCreateDefaultJourneySection();
    
    const phaseData = {
      year: req.body.year,
      headline: req.body.headline,
      description: req.body.description,
      imageUrl: req.body.imageUrl || null,
      imageAlt: req.body.imageAlt || req.body.headline || '',
      backgroundColor: req.body.backgroundColor || '#ffffff',
      textColor: req.body.textColor || '#1e293b',
      accentColor: req.body.accentColor || '#81C99C',
      position: req.body.position || 'auto',
      isActive: req.body.isActive !== false,
      order: req.body.order || 0,
      sectionId: req.body.sectionId || defaultSection._id,
      expandable: req.body.expandable || false
    };

    // Validate required fields
    if (!phaseData.year || !phaseData.headline || !phaseData.description) {
      return res.status(400).json({ 
        message: 'Missing required fields: year, headline, and description are required' 
      });
    }

    // Set order if not provided
    if (!phaseData.order) {
      const lastPhase = await TimelinePhase.findOne({ sectionId: phaseData.sectionId })
        .sort({ order: -1 });
      phaseData.order = lastPhase ? lastPhase.order + 1 : 1;
    }

    const newPhase = new TimelinePhase(phaseData);
    const savedPhase = await newPhase.save();

    res.status(201).json({
      id: savedPhase._id.toString(),
      year: savedPhase.year,
      headline: savedPhase.headline,
      description: savedPhase.description,
      imageUrl: savedPhase.imageUrl,
      imageAlt: savedPhase.imageAlt,
      backgroundColor: savedPhase.backgroundColor,
      textColor: savedPhase.textColor,
      accentColor: savedPhase.accentColor,
      position: savedPhase.position,
      isActive: savedPhase.isActive,
      order: savedPhase.order,
      sectionId: savedPhase.sectionId.toString(),
      expandable: savedPhase.expandable
    });
  } catch (error) {
    console.error('Error creating timeline phase:', error);
    res.status(500).json({ 
      message: 'Failed to create timeline phase',
      error: error.message 
    });
  }
}));

// PUT /api/timeline/phases/:phaseId - Update timeline phase (admin only)
router.put('/phases/:phaseId', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { phaseId } = req.params;
    
    const phase = await TimelinePhase.findById(phaseId);
    if (!phase) {
      return res.status(404).json({ message: 'Timeline phase not found' });
    }

    // Update fields if provided
    if (req.body.year !== undefined) phase.year = req.body.year;
    if (req.body.headline !== undefined) phase.headline = req.body.headline;
    if (req.body.description !== undefined) phase.description = req.body.description;
    if (req.body.imageUrl !== undefined) phase.imageUrl = req.body.imageUrl;
    if (req.body.imageAlt !== undefined) phase.imageAlt = req.body.imageAlt;
    if (req.body.backgroundColor !== undefined) phase.backgroundColor = req.body.backgroundColor;
    if (req.body.textColor !== undefined) phase.textColor = req.body.textColor;
    if (req.body.accentColor !== undefined) phase.accentColor = req.body.accentColor;
    if (req.body.position !== undefined) phase.position = req.body.position;
    if (req.body.isActive !== undefined) phase.isActive = req.body.isActive;
    if (req.body.order !== undefined) phase.order = req.body.order;
    if (req.body.sectionId !== undefined) {
      // Verify new section exists
      const section = await TimelineSection.findById(req.body.sectionId);
      if (!section) {
        return res.status(404).json({ message: 'Timeline section not found' });
      }
      phase.sectionId = req.body.sectionId;
    }
    if (req.body.expandable !== undefined) phase.expandable = req.body.expandable;

    const updatedPhase = await phase.save();

    res.json({
      id: updatedPhase._id.toString(),
      year: updatedPhase.year,
      headline: updatedPhase.headline,
      description: updatedPhase.description,
      imageUrl: updatedPhase.imageUrl,
      imageAlt: updatedPhase.imageAlt,
      backgroundColor: updatedPhase.backgroundColor,
      textColor: updatedPhase.textColor,
      accentColor: updatedPhase.accentColor,
      position: updatedPhase.position,
      isActive: updatedPhase.isActive,
      order: updatedPhase.order,
      sectionId: updatedPhase.sectionId.toString(),
      expandable: updatedPhase.expandable
    });
  } catch (error) {
    console.error('Error updating timeline phase:', error);
    res.status(500).json({ 
      message: 'Failed to update timeline phase',
      error: error.message 
    });
  }
}));

// DELETE /api/timeline/phases/:phaseId - Delete timeline phase (admin only)
router.delete('/phases/:phaseId', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { phaseId } = req.params;
    
    const phase = await TimelinePhase.findByIdAndDelete(phaseId);
    if (!phase) {
      return res.status(404).json({ message: 'Timeline phase not found' });
    }

    res.json({ 
      message: 'Timeline phase deleted successfully',
      deletedPhase: phase._id.toString()
    });
  } catch (error) {
    console.error('Error deleting timeline phase:', error);
    res.status(500).json({ 
      message: 'Failed to delete timeline phase',
      error: error.message 
    });
  }
}));

// PUT /api/timeline/sections/:sectionId/reorder - Reorder timeline phases (admin only)
router.put('/sections/:sectionId/reorder', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { phaseIds } = req.body;

    if (!Array.isArray(phaseIds)) {
      return res.status(400).json({ message: 'phaseIds must be an array' });
    }

    // Verify section exists
    const section = await TimelineSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Timeline section not found' });
    }

    // Update order for each phase
    const updatePromises = phaseIds.map((phaseId, index) => 
      TimelinePhase.findByIdAndUpdate(
        phaseId,
        { order: index },
        { new: true }
      )
    );

    const updatedPhases = await Promise.all(updatePromises);

    // Transform and return updated phases
    const transformedPhases = updatedPhases
      .filter(phase => phase !== null)
      .map(phase => ({
        id: phase._id.toString(),
        year: phase.year,
        headline: phase.headline,
        description: phase.description,
        imageUrl: phase.imageUrl,
        imageAlt: phase.imageAlt,
        backgroundColor: phase.backgroundColor,
        textColor: phase.textColor,
        accentColor: phase.accentColor,
        position: phase.position,
        isActive: phase.isActive,
        order: phase.order,
        sectionId: phase.sectionId.toString(),
        expandable: phase.expandable
      }));

    res.json(transformedPhases);
  } catch (error) {
    console.error('Error reordering timeline phases:', error);
    res.status(500).json({ 
      message: 'Failed to reorder timeline phases',
      error: error.message 
    });
  }
}));

// PUT /api/timeline/sections/:sectionId/phases/reorder - Alias for reordering phases (admin only)
router.put('/sections/:sectionId/phases/reorder', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array' });
    }

    // Verify section exists
    const section = await TimelineSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Timeline section not found' });
    }

    // Update phase orders
    const updatePromises = orderedIds.map(({ id, order }) => 
      TimelinePhase.findByIdAndUpdate(
        id, 
        { order: order, section: sectionId },
        { new: true }
      )
    );

    const updatedPhases = await Promise.all(updatePromises);

    // Transform data for response
    const transformedPhases = updatedPhases.map(phase => ({
      id: phase._id.toString(),
      year: phase.year,
      headline: phase.headline,
      description: phase.description,
      imageUrl: phase.imageUrl,
      imageAlt: phase.imageAlt,
      backgroundColor: phase.backgroundColor,
      textColor: phase.textColor,
      accentColor: phase.accentColor,
      position: phase.position,
      isActive: phase.isActive,
      order: phase.order,
      section: phase.section.toString()
    }));

    res.json(transformedPhases);
  } catch (error) {
    console.error('Error reordering timeline phases:', error);
    res.status(500).json({ 
      message: 'Failed to reorder timeline phases',
      error: error.message 
    });
  }
}));

// POST /api/timeline/phases/:id/image - Upload image for timeline phase (admin only)
router.post('/phases/:id/image', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const phase = await TimelinePhase.findById(req.params.id);
  if (!phase) {
    return res.status(404).json({ message: 'Timeline phase not found' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    
    // Delete old image if exists
    if (phase.image && phase.image.public_id) {
      await cloudinary.uploader.destroy(phase.image.public_id);
    }
    
    // Update phase with new image
    phase.image = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    await phase.save();
    
    res.json({ 
      message: 'Image uploaded successfully',
      image: phase.image
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
}));

// DELETE /api/timeline/phases/:id/image - Remove image from timeline phase (admin only)
router.delete('/phases/:id/image', authMiddleware, asyncHandler(async (req, res) => {
  const phase = await TimelinePhase.findById(req.params.id);
  if (!phase) {
    return res.status(404).json({ message: 'Timeline phase not found' });
  }

  try {
    // Delete image from Cloudinary if exists
    if (phase.image && phase.image.public_id) {
      await cloudinary.uploader.destroy(phase.image.public_id);
    }
    
    // Remove image from phase
    phase.image = undefined;
    await phase.save();
    
    res.json({ message: 'Image removed successfully' });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ message: 'Failed to remove image' });
  }
}));

// POST upload image for timeline phase
router.post('/phases/:id/image', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const phase = await TimelinePhase.findById(req.params.id);
  if (!phase) {
    return res.status(404).json({ message: 'Timeline phase not found' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    
    // Delete old image if exists
    if (phase.image && phase.image.public_id) {
      await cloudinary.uploader.destroy(phase.image.public_id);
    }
    
    // Update phase with new image
    phase.image = {
      url: result.secure_url,
      public_id: result.public_id
    };
    
    await phase.save();
    
    res.json({ 
      message: 'Image uploaded successfully',
      image: phase.image
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
}));

// DELETE remove image from timeline phase
router.delete('/phases/:id/image', authMiddleware, asyncHandler(async (req, res) => {
  const phase = await TimelinePhase.findById(req.params.id);
  if (!phase) {
    return res.status(404).json({ message: 'Timeline phase not found' });
  }

  try {
    // Delete image from Cloudinary if exists
    if (phase.image && phase.image.public_id) {
      await cloudinary.uploader.destroy(phase.image.public_id);
    }
    
    // Remove image from phase
    phase.image = undefined;
    await phase.save();
    
    res.json({ message: 'Image removed successfully' });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ message: 'Failed to remove image' });
  }
}));

export default router;