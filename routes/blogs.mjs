import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import Blog from '../models/Blog.mjs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Store recent views to prevent multiple counts from same IP
const recentViews = new Map();

// Cleanup old entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, timestamp] of recentViews.entries()) {
    if (timestamp < oneHourAgo) {
      recentViews.delete(key);
    }
  }
}, 60 * 60 * 1000);

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all published blogs with filters
router.get('/public', asyncHandler(async (req, res) => {
  const { category, tag, featured, search, page = 1, limit = 9 } = req.query;
  
  const query = { status: 'published' };
  
  if (category) query.category = category;
  if (tag) query.tags = tag;
  if (featured === 'true') query.featured = true;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { 'author.name': { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [blogs, total] = await Promise.all([
    Blog.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-createdBy'),
    Blog.countDocuments(query)
  ]);
  
  res.json({
    blogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get single blog by slug (public)
router.get('/public/:slug', asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ 
    slug: req.params.slug, 
    status: 'published' 
  }).select('-createdBy');
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog post not found' });
  }
  
  // Increment views (only once per IP per hour)
  const clientIp = req.ip || req.connection.remoteAddress;
  const viewKey = `${blog._id}-${clientIp}`;
  const lastView = recentViews.get(viewKey);
  const now = Date.now();
  
  // Only increment if this IP hasn't viewed this post in the last hour
  if (!lastView || (now - lastView) > (60 * 60 * 1000)) {
    blog.views += 1;
    await blog.save();
    recentViews.set(viewKey, now);
  }
  
  res.json(blog);
}));

// Get featured blogs
router.get('/public/featured/all', asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ 
    status: 'published',
    featured: true 
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .select('-createdBy');
  
  res.json(blogs);
}));

// Get popular blogs (most viewed this week)
router.get('/public/popular/week', asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ 
    status: 'published',
    views: { $gt: 0 } // Only get posts with at least 1 view
  })
    .sort({ views: -1 })
    .limit(3)
    .select('-createdBy');
  
  res.json(blogs);
}));

// Get authors of the month (top 3 authors by total views this month)
router.get('/public/authors/month', asyncHandler(async (req, res) => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const authors = await Blog.aggregate([
    {
      $match: {
        status: 'published',
        publishedAt: { $gte: oneMonthAgo }
      }
    },
    {
      $group: {
        _id: '$author.name',
        totalViews: { $sum: '$views' },
        totalArticles: { $sum: 1 },
        author: { $first: '$author' },
        latestPost: { $max: '$publishedAt' }
      }
    },
    {
      $sort: { totalViews: -1 }
    },
    {
      $limit: 3
    },
    {
      $project: {
        name: '$author.name',
        role: '$author.role',
        avatar: '$author.avatar',
        bio: '$author.bio',
        totalViews: 1,
        totalArticles: 1,
        latestPost: 1
      }
    }
  ]);
  
  res.json(authors);
}));

// Get related blogs
router.get('/public/:slug/related', asyncHandler(async (req, res) => {
  const currentBlog = await Blog.findOne({ slug: req.params.slug });
  
  if (!currentBlog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  // Find blogs with same category or tags
  const relatedBlogs = await Blog.find({
    _id: { $ne: currentBlog._id },
    status: 'published',
    $or: [
      { category: currentBlog.category },
      { tags: { $in: currentBlog.tags } }
    ]
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .select('-createdBy');
  
  res.json(relatedBlogs);
}));

// Get all categories with counts
router.get('/public/categories/all', asyncHandler(async (req, res) => {
  const categories = await Blog.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  res.json(categories);
}));

// Get all tags with counts
router.get('/public/tags/all', asyncHandler(async (req, res) => {
  const tags = await Blog.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  
  res.json(tags);
}));

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

// Get all blogs for admin (including drafts)
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ createdBy: req.adminId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
  
  res.json(blogs);
}));

// Get single blog for admin
router.get('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  res.json(blog);
}));

// Create new blog
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const blog = new Blog({
    ...req.body,
    createdBy: req.adminId
  });
  
  await blog.save();
  res.status(201).json(blog);
}));

// Update blog
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const blog = await Blog.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.adminId },
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  res.json(blog);
}));

// Toggle featured status
router.patch('/admin/:id/featured', authMiddleware, asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  blog.featured = !blog.featured;
  await blog.save();
  
  res.json(blog);
}));

// Toggle publish status
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  blog.status = blog.status === 'draft' ? 'published' : 'draft';
  if (blog.status === 'published' && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }
  await blog.save();
  
  res.json(blog);
}));

// Delete blog
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  // Delete cover image from Cloudinary
  if (blog.coverImage?.publicId) {
    try {
      await cloudinary.uploader.destroy(blog.coverImage.publicId);
    } catch (error) {
      console.error('Failed to delete cover image:', error);
    }
  }
  
  // Delete author avatar from Cloudinary
  if (blog.author?.avatar?.publicId) {
    try {
      await cloudinary.uploader.destroy(blog.author.avatar.publicId);
    } catch (error) {
      console.error('Failed to delete author avatar:', error);
    }
  }
  
  await blog.deleteOne();
  res.json({ message: 'Blog deleted successfully' });
}));

// ============================================
// IMAGE UPLOAD ROUTES
// ============================================

// Upload cover image
router.post('/admin/:id/cover-image', authMiddleware, upload.single('coverImage'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  // Delete old image if exists
  if (blog.coverImage?.publicId) {
    try {
      await cloudinary.uploader.destroy(blog.coverImage.publicId);
    } catch (error) {
      console.error('Failed to delete old cover image:', error);
    }
  }
  
  // Upload new image
  const uploadPromise = new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mind-x/blogs/covers',
        transformation: [
          { width: 1200, height: 630, crop: 'fill', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });
  
  const result = await uploadPromise;
  
  blog.coverImage = {
    url: result.secure_url,
    publicId: result.public_id,
    alt: req.body.alt || blog.title
  };
  
  await blog.save();
  res.json(blog);
}));

// Upload author avatar
router.post('/admin/:id/author-avatar', authMiddleware, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const blog = await Blog.findOne({ 
    _id: req.params.id, 
    createdBy: req.adminId 
  });
  
  if (!blog) {
    return res.status(404).json({ message: 'Blog not found' });
  }
  
  // Delete old avatar if exists
  if (blog.author?.avatar?.publicId) {
    try {
      await cloudinary.uploader.destroy(blog.author.avatar.publicId);
    } catch (error) {
      console.error('Failed to delete old avatar:', error);
    }
  }
  
  // Upload new avatar
  const uploadPromise = new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mind-x/blogs/avatars',
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });
  
  const result = await uploadPromise;
  
  if (!blog.author) blog.author = {};
  blog.author.avatar = {
    url: result.secure_url,
    publicId: result.public_id
  };
  
  await blog.save();
  res.json(blog);
}));

export default router;
