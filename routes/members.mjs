// backend/routes/members.mjs
// Thin route wrapper — business logic lives in controllers/membersController.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { upload } from '../utils/cloudinary.mjs';
import * as ctrl from '../controllers/membersController.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get('/public', asyncHandler(ctrl.getActiveMembers));
router.get('/constants', asyncHandler(ctrl.getConstants));
router.get('/public/:slug', asyncHandler(ctrl.getMemberBySlug));

// ==================== ADMIN ROUTES ====================
router.get('/admin/all', authMiddleware, asyncHandler(ctrl.getAllAdminMembers));
router.get('/admin/stats/overview', authMiddleware, asyncHandler(ctrl.getStatsOverview));
router.get('/admin/:id', authMiddleware, asyncHandler(ctrl.getAdminMember));
router.post('/admin', authMiddleware, asyncHandler(ctrl.createMember));
router.put('/admin/:id', authMiddleware, asyncHandler(ctrl.updateMember));
router.delete('/admin/:id', authMiddleware, asyncHandler(ctrl.deleteMember));

// ==================== ADMIN TOGGLES & ORDER ====================
router.patch('/admin/:id/toggle-status', authMiddleware, asyncHandler(ctrl.toggleStatus));
router.patch('/admin/:id/order', authMiddleware, asyncHandler(ctrl.updateOrder));

// ==================== AVATAR ====================
router.post('/admin/:id/avatar', authMiddleware, upload.single('avatar'), asyncHandler(ctrl.uploadAvatar));
router.delete('/admin/:id/avatar', authMiddleware, asyncHandler(ctrl.deleteAvatar));

// ==================== BLOGS ====================
router.put('/admin/:id/blogs', authMiddleware, asyncHandler(ctrl.updateMemberBlogs));

export default router;
