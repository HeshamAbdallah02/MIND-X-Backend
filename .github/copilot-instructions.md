# Backend Copilot Instructions

## Critical Rules for MIND-X Backend

### 🔴 ALWAYS DO THIS

1. **Use `.mjs` extension** for ALL backend files
2. **Use `req.adminId` or `req.admin`** - NEVER `req.user` or `req.user._id`
3. **Wrap async routes** with `asyncHandler` middleware
4. **Verify ownership** on update/delete operations
5. **Use ES6 imports** - `import` / `export default`

---

## Authentication Middleware Usage

The `authMiddleware` sets these properties on the request object:
- `req.admin` - Full admin object (without passwordHash)
- `req.adminId` - Admin's MongoDB ObjectId

### ✅ Correct Usage
```javascript
router.get('/admin/items', authMiddleware, asyncHandler(async (req, res) => {
  // Use req.adminId for queries
  const items = await Item.find({ createdBy: req.adminId });
  
  // Or use req.admin for admin details
  const adminName = req.admin.name;
  
  res.json(items);
}));
```

### ❌ Wrong Usage
```javascript
router.get('/admin/items', authMiddleware, asyncHandler(async (req, res) => {
  // WRONG! req.user doesn't exist
  const items = await Item.find({ createdBy: req.user._id });
  res.json(items);
}));
```

---

## Route Pattern Template

Use this template for all new routes:

```javascript
// backend/routes/resource.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Resource from '../models/Resource.mjs';
import Joi from 'joi';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/resource/:slug
 * Get published resource by slug (public)
 */
router.get('/:slug', asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ 
    slug: req.params.slug,
    published: true 
  }).lean();
  
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  
  res.json(resource);
}));

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/resource/admin/all
 * Get all resources for authenticated admin
 */
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const resources = await Resource.find({ createdBy: req.adminId })
    .sort({ createdAt: -1 })
    .lean();
  
  res.json(resources);
}));

/**
 * GET /api/resource/admin/:id
 * Get single resource by ID (admin only)
 */
router.get('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({
    _id: req.params.id,
    createdBy: req.adminId // Verify ownership
  });
  
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  
  res.json(resource);
}));

/**
 * POST /api/resource/admin
 * Create new resource
 */
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  // Joi validation (optional)
  const schema = Joi.object({
    title: Joi.string().required().trim().min(1).max(200),
    description: Joi.string().allow('').max(1000),
    // ... other fields
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  
  const resource = new Resource({
    ...req.body,
    createdBy: req.adminId // CRITICAL: Set creator
  });
  
  await resource.save();
  res.status(201).json(resource);
}));

/**
 * PUT /api/resource/admin/:id
 * Update resource
 */
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const resource = await Resource.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.adminId }, // Verify ownership
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  
  res.json(resource);
}));

/**
 * PATCH /api/resource/admin/:id/publish
 * Toggle publish status
 */
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({
    _id: req.params.id,
    createdBy: req.adminId // Verify ownership
  });
  
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  
  resource.published = !resource.published;
  await resource.save();
  
  res.json(resource);
}));

/**
 * DELETE /api/resource/admin/:id
 * Delete resource
 */
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const resource = await Resource.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.adminId // Verify ownership
  });
  
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  
  res.json({ message: 'Resource deleted successfully' });
}));

export default router;
```

---

## Model Pattern Template

```javascript
// backend/models/Resource.mjs
import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  // Basic fields
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200
  },
  
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
  },
  
  // Status
  published: {
    type: Boolean,
    default: false
  },
  
  // Creator reference (ALWAYS include this!)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Unique slug for public URLs
  slug: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'resources' // Explicit collection name
});

// Indexes (AVOID duplicating unique fields!)
resourceSchema.index({ createdBy: 1, createdAt: -1 });
resourceSchema.index({ published: 1, createdAt: -1 });
// DON'T add: resourceSchema.index({ slug: 1 }); - unique: true already indexes it!

// Pre-save hook to generate slug
resourceSchema.pre('save', async function(next) {
  if (this.isNew && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure uniqueness
    while (await mongoose.model('Resource').findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Virtual for public URL
resourceSchema.virtual('url').get(function() {
  return `/resources/${this.slug}`;
});

// Virtual for full public URL
resourceSchema.virtual('publicUrl').get(function() {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/resources/${this.slug}`;
});

// Configure virtuals to be included in JSON
resourceSchema.set('toJSON', { virtuals: true });
resourceSchema.set('toObject', { virtuals: true });

export default mongoose.model('Resource', resourceSchema);
```

---

## Common MongoDB Queries

### Find with ownership
```javascript
const items = await Model.find({ createdBy: req.adminId });
```

### Find one with ownership
```javascript
const item = await Model.findOne({ 
  _id: id, 
  createdBy: req.adminId 
});
```

### Update with ownership verification
```javascript
const item = await Model.findOneAndUpdate(
  { _id: id, createdBy: req.adminId },
  updateData,
  { new: true, runValidators: true }
);
```

### Delete with ownership verification
```javascript
const item = await Model.findOneAndDelete({ 
  _id: id, 
  createdBy: req.adminId 
});
```

### Populate references
```javascript
const items = await Model.find({ createdBy: req.adminId })
  .populate('relatedField', 'name email')
  .lean();
```

---

## Validation with Joi

```javascript
import Joi from 'joi';

const resourceValidation = Joi.object({
  title: Joi.string().required().trim().min(1).max(200),
  description: Joi.string().allow('').max(1000),
  published: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()),
  settings: Joi.object({
    featured: Joi.boolean(),
    priority: Joi.number().min(0)
  }),
  deadline: Joi.date().iso().allow(null)
});

// In route:
const { error } = resourceValidation.validate(req.body);
if (error) {
  return res.status(400).json({ 
    message: 'Validation failed',
    details: error.details.map(d => d.message)
  });
}
```

---

## Error Handling Best Practices

### HTTP Status Codes
- **200**: Success (GET, PUT, PATCH)
- **201**: Created (POST)
- **400**: Bad request / Validation error
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (valid token but no permission)
- **404**: Not found
- **500**: Internal server error

### Error Response Format
```javascript
res.status(400).json({ 
  message: 'User-friendly error message',
  details: ['Detailed error 1', 'Detailed error 2'] // Optional
});
```

---

## Index Registration in index.mjs

When creating new routes, register them in `backend/index.mjs`:

```javascript
// Import the route
import resourceRoutes from './routes/resource.mjs';

// Register it
app.use('/api/resource', resourceRoutes);
```

Order matters! Register routes from most specific to least specific.

---

## Environment Variables Access

```javascript
// Always provide fallbacks
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
```

---

## Cloudinary Integration

For file uploads:

```javascript
import { v2 as cloudinary } from 'cloudinary';

// Upload
const result = await cloudinary.uploader.upload(file.path, {
  folder: 'mind-x/resource',
  resource_type: 'auto'
});

const imageUrl = result.secure_url;

// Delete
await cloudinary.uploader.destroy(publicId);
```

---

## Common Mistakes to Avoid

### ❌ Using req.user instead of req.adminId
```javascript
// WRONG
const items = await Model.find({ createdBy: req.user._id });

// CORRECT
const items = await Model.find({ createdBy: req.adminId });
```

### ❌ Forgetting asyncHandler
```javascript
// WRONG - errors won't be caught
router.get('/route', authMiddleware, async (req, res) => {
  const items = await Model.find();
  res.json(items);
});

// CORRECT
router.get('/route', authMiddleware, asyncHandler(async (req, res) => {
  const items = await Model.find();
  res.json(items);
}));
```

### ❌ Not verifying ownership
```javascript
// WRONG - any admin can delete any resource!
const item = await Model.findByIdAndDelete(id);

// CORRECT - only creator can delete
const item = await Model.findOneAndDelete({ 
  _id: id, 
  createdBy: req.adminId 
});
```

### ❌ Duplicate indexes
```javascript
// WRONG
slug: { type: String, unique: true }
schema.index({ slug: 1 }); // Duplicate! unique already creates index

// CORRECT
slug: { type: String, unique: true }
// No separate index needed
```

### ❌ Using .js instead of .mjs
```javascript
// WRONG
import Model from './models/Model.js';

// CORRECT
import Model from './models/Model.mjs';
```

---

## Testing with Thunder Client / Postman

### Login to get token
```
POST http://localhost:5000/api/auth/login
Body: { "email": "admin@example.com", "password": "password" }
Response: { "token": "eyJhbGc..." }
```

### Use token in protected routes
```
GET http://localhost:5000/api/resource/admin/all
Headers: 
  Authorization: Bearer eyJhbGc...
```

---

## Quick Checklist for New Routes

- [ ] File uses `.mjs` extension
- [ ] Imports use ES6 syntax
- [ ] Public routes defined first
- [ ] Admin routes use `authMiddleware`
- [ ] All async handlers wrapped in `asyncHandler`
- [ ] Create route sets `createdBy: req.adminId`
- [ ] Update/Delete verify ownership with `createdBy: req.adminId`
- [ ] Proper HTTP status codes (201 for create, etc.)
- [ ] Error responses include message
- [ ] Route registered in `index.mjs`
- [ ] Model has indexes (without duplicates)
- [ ] Model has `createdBy` field

---

## Performance Tips

1. Use `.lean()` for read-only queries (faster, plain JS objects)
2. Add indexes for frequently queried fields
3. Use `.select()` to return only needed fields
4. Paginate large result sets
5. Cache frequently accessed data

---

**Remember**: When in doubt, follow the pattern used in existing routes like `pageEvents.mjs`, `forms.mjs`, or `auth.mjs`!
