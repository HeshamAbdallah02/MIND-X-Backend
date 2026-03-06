// backend/routes/blogs.mjs
// Thin route wrapper — business logic lives in controllers/blogsController.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { upload } from '../utils/cloudinary.mjs';
import * as ctrl from '../controllers/blogsController.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get('/public', asyncHandler(ctrl.getPublishedBlogs));
router.get('/public/featured/all', asyncHandler(ctrl.getFeaturedBlogs));
router.get('/public/popular/week', asyncHandler(ctrl.getPopularBlogs));
router.get('/public/authors/month', asyncHandler(ctrl.getAuthorsOfMonth));
router.get('/public/categories/all', asyncHandler(ctrl.getCategories));
router.get('/public/tags/all', asyncHandler(ctrl.getTags));
router.get('/public/:slug', asyncHandler(ctrl.getBlogBySlug));
router.get('/public/:slug/related', asyncHandler(ctrl.getRelatedBlogs));

// ==================== ADMIN ROUTES ====================
router.get('/admin/all', authMiddleware, asyncHandler(ctrl.getAllAdminBlogs));
router.get('/admin/:id', authMiddleware, asyncHandler(ctrl.getAdminBlog));
router.post('/admin', authMiddleware, asyncHandler(ctrl.createBlog));
router.put('/admin/:id', authMiddleware, asyncHandler(ctrl.updateBlog));
router.delete('/admin/:id', authMiddleware, asyncHandler(ctrl.deleteBlog));

// ==================== ADMIN TOGGLES ====================
router.patch('/admin/:id/featured', authMiddleware, asyncHandler(ctrl.toggleFeatured));
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(ctrl.togglePublish));

// ==================== IMAGE UPLOADS ====================
router.post('/admin/:id/cover-image', authMiddleware, upload.single('coverImage'), asyncHandler(ctrl.uploadCoverImage));
router.post('/admin/:id/author-avatar', authMiddleware, upload.single('avatar'), asyncHandler(ctrl.uploadAuthorAvatar));

export default router;
