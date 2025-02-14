import { Router } from 'express';
import Blog from '../models/Blog.mjs';
import authMiddleware from '../middleware/auth.mjs';

const router = Router();

// Get all blogs
router.get('/', async (_req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Create new blog (protected route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const blog = new Blog({
      ...req.body,
      createdBy: req.adminId
    });
    const newBlog = await blog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update blog (protected route)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete blog (protected route)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

