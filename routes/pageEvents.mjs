// backend/routes/pageEvents.mjs
// Routes for Events Page (Featured & Past Events)
import express from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import PageEvent from '../models/PageEvent.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/page-events/featured
 * Get the next upcoming event (featured event)
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  const featuredEvent = await PageEvent.findOne({
    active: true,
    eventDate: { $gte: now }
  })
  .sort({ eventDate: 1 }) // Ascending - get the nearest upcoming event
  .lean();
  
  if (!featuredEvent) {
    return res.json(null); // No upcoming events
  }
  
  res.json(featuredEvent);
}));

/**
 * GET /api/page-events/past
 * Get past events with search, category filtering, and pagination
 */
router.get('/past', asyncHandler(async (req, res) => {
  const {
    search = '',
    categories = '',
    page = 1,
    limit = 12
  } = req.query;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // Build query
  const query = {
    active: true,
    eventDate: { $lt: now }
  };
  
  // Add search filter
  if (search) {
    query.$or = [
      { 'title.text': { $regex: search, $options: 'i' } },
      { 'description.text': { $regex: search, $options: 'i' } },
      { 'location.venue': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  // Add category filter
  if (categories) {
    const categoryArray = categories.split(',').map(cat => cat.trim()).filter(Boolean);
    if (categoryArray.length > 0) {
      query.category = { $in: categoryArray };
    }
  }
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Execute query
  const [events, total] = await Promise.all([
    PageEvent.find(query)
      .sort({ eventDate: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PageEvent.countDocuments(query)
  ]);
  
  res.json({
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: skip + events.length < total
    }
  });
}));

/**
 * GET /api/page-events/categories
 * Get all unique event categories
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await PageEvent.distinct('category', {
    active: true,
    category: { $exists: true, $ne: null, $ne: '' }
  });
  
  res.json(categories.filter(cat => cat)); // Filter out any empty values
}));

/**
 * GET /api/page-events/:id
 * Get single event by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  const event = await PageEvent.findById(req.params.id);
  
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  
  res.json(event);
}));

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/page-events/admin/all
 * Get all events including drafts (protected)
 */
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const events = await PageEvent.find().lean();
  
  // Sort: active events by order, inactive by updatedAt
  const sortedEvents = events.sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    
    if (a.active && b.active) {
      return a.order - b.order;
    }
    
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  res.json(sortedEvents);
}));

// Validation schema
const pageEventValidation = Joi.object({
  title: Joi.object({
    text: Joi.string().required(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  }).required(),
  description: Joi.object({
    text: Joi.string().required(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  }).required(),
  date: Joi.object({
    text: Joi.string().required(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  }).required(),
  eventDate: Joi.date().required(),
  eventTime: Joi.object({
    start: Joi.string().allow(''),
    end: Joi.string().allow('')
  }),
  location: Joi.object({
    venue: Joi.string().allow(''),
    address: Joi.string().allow('')
  }),
  registrationLink: Joi.string().uri().allow(''),
  attendeeCount: Joi.number().min(0),
  maxAttendees: Joi.number().min(0).allow(null),
  category: Joi.string().allow(''),
  tags: Joi.array().items(Joi.string()),
  price: Joi.object({
    regular: Joi.number().min(0),
    student: Joi.number().min(0),
    currency: Joi.string()
  }),
  earlyBirdPrice: Joi.object({
    amount: Joi.number().min(0),
    deadline: Joi.date()
  }),
  highlights: Joi.array().items(Joi.string()),
  coverImage: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }).required(),
  contentAreaColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  url: Joi.string().uri().allow(''),
  order: Joi.number(),
  active: Joi.boolean()
}).options({ stripUnknown: true });

/**
 * POST /api/page-events
 * Create new event (protected)
 */
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = pageEventValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }

  // Get max order from active events
  const lastEvent = await PageEvent.findOne({ active: true }).sort('-order');
  const order = lastEvent ? lastEvent.order + 1 : 0;

  const event = new PageEvent({
    ...req.body,
    order,
    active: req.body.active !== undefined ? req.body.active : true
  });

  await event.save();
  res.status(201).json(event);
}));

/**
 * PUT /api/page-events/:id
 * Update event (protected)
 */
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = pageEventValidation.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }

  const event = await PageEvent.findByIdAndUpdate(
    req.params.id,
    { ...req.body, order: undefined }, // Prevent order changes via PUT
    { new: true, runValidators: true }
  );

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  res.json(event);
}));

/**
 * PATCH /api/page-events/:id/toggle-active
 * Toggle event active status (protected)
 */
router.patch('/:id/toggle-active', authMiddleware, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const event = await PageEvent.findById(req.params.id).session(session);
      if (!event) throw new Error('Event not found');

      const currentStatus = event.active;
      const oldOrder = event.order;

      event.active = !currentStatus;

      if (currentStatus) {
        // Deactivating: Set order to -1 and shift others up
        event.order = -1;
        await event.save({ session });
        
        await PageEvent.updateMany(
          { active: true, order: { $gt: oldOrder } },
          { $inc: { order: -1 } },
          { session }
        );
      } else {
        // Activating: Place at the end of active events
        const lastActiveEvent = await PageEvent.findOne({ active: true })
          .sort('-order')
          .session(session);

        event.order = (lastActiveEvent?.order ?? -1) + 1;
        await event.save({ session });
      }
    });

    // Fetch fresh data correctly sorted
    const activeEvents = await PageEvent.find({ active: true }).sort('order');
    const inactiveEvents = await PageEvent.find({ active: false }).sort('-updatedAt');
    res.json([...activeEvents, ...inactiveEvents]);

  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
}));

/**
 * PATCH /api/page-events/:id/order
 * Update event order (protected)
 */
router.patch('/:id/order', authMiddleware, asyncHandler(async (req, res) => {
  const { order } = req.body;
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const event = await PageEvent.findById(req.params.id).session(session);
      if (!event) throw new Error('Event not found');

      const oldOrder = event.order;
      event.order = order;
      await event.save({ session });

      // Adjust other orders
      if (order < oldOrder) {
        await PageEvent.updateMany(
          { 
            order: { $gte: order, $lt: oldOrder },
            _id: { $ne: event._id }
          },
          { $inc: { order: 1 } },
          { session }
        );
      } else {
        await PageEvent.updateMany(
          { 
            order: { $gt: oldOrder, $lte: order },
            _id: { $ne: event._id }
          },
          { $inc: { order: -1 } },
          { session }
        );
      }
    });

    const updatedEvents = await PageEvent.find().sort('order');
    res.json(updatedEvents);
  } catch (error) {
    console.error('Order update error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
}));

/**
 * DELETE /api/page-events/:id
 * Delete event (protected)
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const event = await PageEvent.findByIdAndDelete(req.params.id);
  
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  // Reorder remaining events
  await PageEvent.updateMany(
    { order: { $gt: event.order } },
    { $inc: { order: -1 } }
  );

  res.json({ message: 'Event deleted successfully' });
}));

export default router;
