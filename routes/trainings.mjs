// backend/routes/trainings.mjs
// Thin route wrapper — business logic lives in controllers/trainingsController.mjs
import express from 'express';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { upload } from '../utils/cloudinary.mjs';
import * as ctrl from '../controllers/trainingsController.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get('/public', asyncHandler(ctrl.getPublishedTrainings));
router.get('/public/upcoming', asyncHandler(ctrl.getUpcomingTrainings));
router.get('/public/past', asyncHandler(ctrl.getPastTrainings));
router.get('/public/featured', asyncHandler(ctrl.getFeaturedTraining));
router.get('/public/:slug', asyncHandler(ctrl.getTrainingBySlug));

// ==================== ADMIN ROUTES ====================
router.get('/admin/all', authMiddleware, asyncHandler(ctrl.getAllAdminTrainings));
router.get('/admin/stats/overview', authMiddleware, asyncHandler(ctrl.getStatsOverview));
router.get('/admin/:id', authMiddleware, asyncHandler(ctrl.getAdminTraining));
router.post('/admin', authMiddleware, asyncHandler(ctrl.createTraining));
router.put('/admin/:id', authMiddleware, asyncHandler(ctrl.updateTraining));
router.delete('/admin/:id', authMiddleware, asyncHandler(ctrl.deleteTraining));

// ==================== ADMIN TOGGLES ====================
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(ctrl.togglePublish));
router.patch('/admin/:id/feature', authMiddleware, asyncHandler(ctrl.toggleFeatured));
router.patch('/admin/:id/registration', authMiddleware, asyncHandler(ctrl.updateRegistration));

// ==================== IMAGE UPLOADS ====================
router.post('/admin/:id/cover-image', authMiddleware, upload.single('image'), asyncHandler(ctrl.uploadCoverImage));
router.post('/admin/:id/gallery-image', authMiddleware, upload.single('image'), asyncHandler(ctrl.addGalleryImage));
router.delete('/admin/:id/gallery-image/:imageId', authMiddleware, asyncHandler(ctrl.deleteGalleryImage));
router.post('/admin/:id/instructor/:instructorId/avatar', authMiddleware, upload.single('image'), asyncHandler(ctrl.uploadInstructorAvatar));

export default router;
