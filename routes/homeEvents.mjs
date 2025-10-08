// backend/routes/homeEvents.mjs
// Routes for Home Page "Upcoming Events" Section
import express from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import HomeEvent from '../models/HomeEvent.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import sanitizeEvent from '../middleware/sanitizeEvents.mjs';

const router = express.Router();

// Get all events including drafts (protected)
router.get('/admin', authMiddleware, asyncHandler(async (req, res) => {
  // First, get all events sorted by order
  const events = await HomeEvent.find().lean();
  
  // Then sort them in memory
  const sortedEvents = events.sort((a, b) => {
    // Active events first
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    
    // Among active events, sort by order
    if (a.active && b.active) {
      return a.order - b.order;
    }
    
    // Among inactive events, sort by updatedAt
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  res.json(sortedEvents);
}));

// Get all events (public)
router.get('/', asyncHandler(async (req, res) => {
  const events = await HomeEvent.find({ active: true }).sort('order');
  res.json(events);
}));

// Get single HomeEvent (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const HomeEvent = await HomeEvent.findById(req.params.id);
  if (!HomeEvent) {
    return res.status(404).json({ message: 'HomeEvent not found' });
  }
  res.json(HomeEvent);
}));

const eventValidation = Joi.object({
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
  coverImage: Joi.object({
    url: Joi.string().uri().required(),
    alt: Joi.string().allow('')
  }).required(),
  contentAreaColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  url: Joi.string().uri().allow(''),
  order: Joi.number(),
  active: Joi.boolean(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
  createdAt: Joi.forbidden(),
  updatedAt: Joi.forbidden()
}).options({ stripUnknown: true }); // Allow unknown fields but strip them

// Add validate function
const validate = (data, schema) => {
  const { error } = schema.validate(data, { abortEarly: false });
  return { error };
};

// Create HomeEvent (protected)
router.post('/', authMiddleware, sanitizeEvent, asyncHandler(async (req, res) => {
  const { error } = validate(req.body, eventValidation);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // Get max order from active events only
  const lastEvent = await HomeEvent.findOne({ active: true }).sort('-order');
  const order = lastEvent ? lastEvent.order + 1 : 0;

  const HomeEvent = new HomeEvent({
    ...req.body,
    order,
    active: req.body.active !== undefined ? req.body.active : true
  });

  await HomeEvent.save();
  res.status(201).json(HomeEvent);
}));

// Update HomeEvent (protected)
router.put('/:id', authMiddleware, sanitizeEvent, asyncHandler(async (req, res) => {
  const { error } = validate(req.body, eventValidation);
  if (error) return res.status(400).json({
    message: 'Validation failed',
    details: error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, '')
    }))
  });

  const HomeEvent = await HomeEvent.findByIdAndUpdate(
    req.params.id,
    { ...req.body, order: undefined }, // Prevent order changes via PUT
    { new: true, runValidators: true }
  );

  if (!HomeEvent) {
    return res.status(404).json({ message: 'HomeEvent not found' });
  }

  res.json(HomeEvent);
}));

// Toggle HomeEvent active status (protected)
router.patch('/:id/toggle-active', authMiddleware, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const HomeEvent = await HomeEvent.findById(req.params.id).session(session);
      if (!HomeEvent) throw new Error('HomeEvent not found');

      const currentStatus = HomeEvent.active;
      const oldOrder = HomeEvent.order;

      HomeEvent.active = !currentStatus;

      if (currentStatus) {
        // Deactivating: Set order to -1 and shift others up
        HomeEvent.order = -1;
        await HomeEvent.save({ session });
        
        await HomeEvent.updateMany(
          { active: true, order: { $gt: oldOrder } },
          { $inc: { order: -1 } },
          { session }
        );
      } else {
        // Activating: Place at the end of active events
        const lastActiveEvent = await HomeEvent.findOne({ active: true })
          .sort('-order') // Corrected sort direction
          .session(session);

        HomeEvent.order = (lastActiveEvent?.order ?? -1) + 1;
        await HomeEvent.save({ session });
      }
    });

    // Fetch fresh data correctly sorted
    const activeEvents = await HomeEvent.find({ active: true }).sort('order');
    const inactiveEvents = await HomeEvent.find({ active: false }).sort('-updatedAt');
    res.json([...activeEvents, ...inactiveEvents]);

  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
}));

router.patch('/:id/order', 
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { order } = req.body;
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        const HomeEvent = await HomeEvent.findById(req.params.id).session(session);
        if (!HomeEvent) throw new Error('HomeEvent not found');

        const oldOrder = HomeEvent.order;
        HomeEvent.order = order;
        await HomeEvent.save({ session });

        // Adjust other orders
        if (order < oldOrder) {
          await HomeEvent.updateMany(
            { 
              order: { $gte: order, $lt: oldOrder },
              _id: { $ne: HomeEvent._id }
            },
            { $inc: { order: 1 } },
            { session }
          );
        } else {
          await HomeEvent.updateMany(
            { 
              order: { $gt: oldOrder, $lte: order },
              _id: { $ne: HomeEvent._id }
            },
            { $inc: { order: -1 } },
            { session }
          );
        }
      });

      const updatedEvents = await HomeEvent.find().sort('order');
      res.json(updatedEvents);
    } catch (error) {
      console.error('Order update error:', error);
      res.status(400).json({ message: error.message });
    } finally {
      session.endSession();
    }
  })
);

// Delete HomeEvent (protected)
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const HomeEvent = await HomeEvent.findByIdAndDelete(req.params.id);
  
  if (!HomeEvent) {
    return res.status(404).json({ message: 'HomeEvent not found' });
  }

  // Reorder remaining events
  await HomeEvent.updateMany(
    { order: { $gt: HomeEvent.order } },
    { $inc: { order: -1 } }
  );

  res.json({ message: 'HomeEvent deleted successfully' });
}));

export default router;
