// backend/routes/dailyLife.mjs
import express from 'express';
import DailyLifeSettings from '../models/DailyLifeSettings.mjs';
import DailyLifePost, { POST_CATEGORIES } from '../models/DailyLifePost.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { upload, uploadToCloudinary, deleteFromCloudinary, deleteMultipleFromCloudinary } from '../utils/cloudinary.mjs';

const router = express.Router();

// ─── Helper: is today in the last 7 days of the month? ───
function isHonorBoardHidden() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() > (lastDay - 7);
}

// ═══════════════════════ PUBLIC ═══════════════════════

// GET /api/daily-life/public/settings
router.get('/public/settings', asyncHandler(async (_req, res) => {
    const settings = await DailyLifeSettings.findOne({ isActive: true })
        .populate('honorBoard.member', 'name position section avatar slug');

    if (!settings) {
        return res.json({ honorBoard: [], highlights: [], timeline: [] });
    }

    const data = settings.toObject();

    // Auto-hide honor board in the last week of the month
    if (isHonorBoardHidden()) {
        data.honorBoard = [];
        data._honorBoardHidden = true;
        // Compute next month's 1st day for countdown
        const now = new Date();
        data._honorBoardRevealDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    res.json(data);
}));

// GET /api/daily-life/public/posts
router.get('/public/posts', asyncHandler(async (req, res) => {
    const { category, page = 1, limit = 12 } = req.query;
    const query = { isPublished: true };
    if (category && POST_CATEGORIES.includes(category)) {
        query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
        DailyLifePost.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        DailyLifePost.countDocuments(query)
    ]);

    res.json({
        posts,
        categories: POST_CATEGORIES,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

// PATCH /api/daily-life/public/posts/:id/like
router.patch('/public/posts/:id/like', asyncHandler(async (req, res) => {
    const post = await DailyLifePost.findByIdAndUpdate(
        req.params.id,
        { $inc: { likes: 1 } },
        { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ likes: post.likes });
}));

// ═══════════════════════ ADMIN — SETTINGS ═══════════════════════

// GET /api/daily-life/admin/settings
router.get('/admin/settings', authMiddleware, asyncHandler(async (req, res) => {
    let settings = await DailyLifeSettings.findOne()
        .populate('honorBoard.member', 'name position section avatar slug');

    if (!settings) {
        settings = await DailyLifeSettings.create({
            honorBoard: [],
            highlights: [],
            timeline: [],
            createdBy: req.adminId
        });
    }

    res.json(settings);
}));

// PUT /api/daily-life/admin/settings
router.put('/admin/settings', authMiddleware, asyncHandler(async (req, res) => {
    const { honorBoard, highlights, timeline } = req.body;

    let settings = await DailyLifeSettings.findOne();
    if (!settings) {
        settings = new DailyLifeSettings({ createdBy: req.adminId });
    }

    if (honorBoard !== undefined) settings.honorBoard = honorBoard;
    if (highlights !== undefined) settings.highlights = highlights;
    if (timeline !== undefined) settings.timeline = timeline;

    await settings.save();

    // Re-populate member data for the response
    await settings.populate('honorBoard.member', 'name position section avatar slug');
    res.json(settings);
}));

// POST /api/daily-life/admin/settings/timeline/:id/image
router.post('/admin/settings/timeline/:id/image', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No image provided' });

    const settings = await DailyLifeSettings.findOne();
    if (!settings) return res.status(404).json({ message: 'Settings not found' });

    const entry = settings.timeline.id(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Timeline entry not found' });

    await deleteFromCloudinary(entry.image?.public_id);

    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'daily-life/timeline');
    entry.image = { url: result.secure_url, public_id: result.public_id };
    await settings.save();

    res.json(settings);
}));

// DELETE /api/daily-life/admin/settings/timeline/:id/image
router.delete('/admin/settings/timeline/:id/image', authMiddleware, asyncHandler(async (req, res) => {
    const settings = await DailyLifeSettings.findOne();
    if (!settings) return res.status(404).json({ message: 'Settings not found' });

    const entry = settings.timeline.id(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Timeline entry not found' });

    await deleteFromCloudinary(entry.image?.public_id);
    entry.image = undefined;
    await settings.save();

    res.json(settings);
}));

// ═══════════════════════ ADMIN — POSTS ═══════════════════════

// GET /api/daily-life/admin/posts
router.get('/admin/posts', authMiddleware, asyncHandler(async (_req, res) => {
    const posts = await DailyLifePost.find().sort({ createdAt: -1 });
    res.json(posts);
}));

// POST /api/daily-life/admin/posts
router.post('/admin/posts', authMiddleware, asyncHandler(async (req, res) => {
    const post = await DailyLifePost.create({
        ...req.body,
        images: [],  // images uploaded separately
        createdBy: req.adminId
    });
    res.status(201).json(post);
}));

// PUT /api/daily-life/admin/posts/:id
router.put('/admin/posts/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { author, caption, category, isPublished } = req.body;
    const post = await DailyLifePost.findByIdAndUpdate(
        req.params.id,
        { author, caption, category, isPublished },
        { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
}));

// DELETE /api/daily-life/admin/posts/:id
router.delete('/admin/posts/:id', authMiddleware, asyncHandler(async (req, res) => {
    const post = await DailyLifePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Clean up all images from Cloudinary
    const imageIds = post.images.map(img => img.public_id);
    await deleteMultipleFromCloudinary(imageIds);

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
}));

// POST /api/daily-life/admin/posts/:id/images — upload images (max 10)
router.post('/admin/posts/:id/images', authMiddleware, upload.array('images', 10), asyncHandler(async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ message: 'No images provided' });

    const post = await DailyLifePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.images.length + req.files.length > 10) {
        return res.status(400).json({ message: `Cannot exceed 10 images. Post has ${post.images.length}, trying to add ${req.files.length}.` });
    }

    // Upload all images in parallel
    const uploads = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.buffer, file.originalname, 'daily-life/posts'))
    );

    uploads.forEach(result => {
        post.images.push({
            url: result.secure_url,
            public_id: result.public_id,
            alt: ''
        });
    });

    await post.save();
    res.json(post);
}));

// DELETE /api/daily-life/admin/posts/:id/images/:imageId
router.delete('/admin/posts/:id/images/:imageId', authMiddleware, asyncHandler(async (req, res) => {
    const post = await DailyLifePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const image = post.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ message: 'Image not found' });

    await deleteFromCloudinary(image.public_id);
    post.images.pull(req.params.imageId);
    await post.save();

    res.json(post);
}));

// PATCH /api/daily-life/admin/posts/:id/publish
router.patch('/admin/posts/:id/publish', authMiddleware, asyncHandler(async (req, res) => {
    const post = await DailyLifePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.isPublished = !post.isPublished;
    await post.save();
    res.json(post);
}));

export default router;
