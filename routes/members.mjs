// backend/routes/members.mjs
import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import Member, { MEMBER_POSITIONS, TEAM_SECTIONS } from '../models/Member.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for avatars
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, originalname, folder = 'members') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder: folder,
                public_id: `${folder}_${Date.now()}_${originalname.split('.')[0]}`,
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' }
                ]
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

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    if (publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.warn('Failed to delete image from Cloudinary:', error);
        }
    }
};

// ==================== PUBLIC ROUTES ====================

// GET all active members (public)
router.get('/public', asyncHandler(async (req, res) => {
    const { section, position } = req.query;

    const query = { status: 'active' };

    if (section) {
        query.section = section;
    }

    if (position) {
        query.position = position;
    }

    const members = await Member.find(query)
        .populate('blogs', 'title slug coverImage publishedAt')
        .sort({ displayOrder: 1, createdAt: -1 })
        .select('-__v -createdBy -updatedBy');

    res.json(members);
}));

// GET positions and sections constants (public)
router.get('/constants', asyncHandler(async (req, res) => {
    res.json({
        positions: MEMBER_POSITIONS,
        sections: TEAM_SECTIONS
    });
}));

// GET single member by slug (public)
router.get('/public/:slug', asyncHandler(async (req, res) => {
    const member = await Member.findOne({
        slug: req.params.slug,
        status: 'active'
    })
        .populate('blogs', 'title slug excerpt coverImage category publishedAt readTime')
        .select('-__v -createdBy -updatedBy');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
}));

// ==================== ADMIN ROUTES ====================

// GET all members (admin)
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
    const members = await Member.find({ createdBy: req.adminId })
        .populate('blogs', 'title slug')
        .sort({ displayOrder: 1, createdAt: -1 })
        .select('-__v');

    res.json(members);
}));

// GET single member by ID (admin)
router.get('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    })
        .populate('blogs', 'title slug')
        .select('-__v');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
}));

// CREATE new member (admin)
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
    const memberData = {
        ...req.body,
        createdBy: req.adminId
    };

    const member = new Member(memberData);
    await member.save();

    res.status(201).json(member);
}));

// UPDATE member (admin)
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
    const member = await Member.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        { ...req.body, updatedBy: req.adminId },
        { new: true, runValidators: true }
    ).select('-__v');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
}));

// DELETE member (admin)
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    // Clean up avatar before deleting
    if (member.avatar?.publicId) {
        await deleteFromCloudinary(member.avatar.publicId);
    }

    await Member.findByIdAndDelete(req.params.id);

    res.json({ message: 'Member deleted successfully' });
}));

// TOGGLE member status (admin)
router.patch('/admin/:id/toggle-status', authMiddleware, asyncHandler(async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    // Cycle through statuses: active -> inactive -> alumni -> active
    const statusCycle = {
        'active': 'inactive',
        'inactive': 'alumni',
        'alumni': 'active'
    };

    member.status = statusCycle[member.status] || 'active';
    member.updatedBy = req.adminId;
    await member.save();

    res.json(member);
}));

// UPDATE display order (admin)
router.patch('/admin/:id/order', authMiddleware, asyncHandler(async (req, res) => {
    const { displayOrder } = req.body;

    const member = await Member.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        { displayOrder, updatedBy: req.adminId },
        { new: true }
    ).select('-__v');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
}));

// ==================== AVATAR UPLOAD ROUTE ====================

// UPLOAD avatar (admin)
router.post('/admin/:id/avatar',
    authMiddleware,
    upload.single('avatar'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const member = await Member.findOne({
            _id: req.params.id,
            createdBy: req.adminId
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Delete old avatar if exists
        if (member.avatar?.publicId) {
            await deleteFromCloudinary(member.avatar.publicId);
        }

        // Upload new image
        const result = await uploadToCloudinary(
            req.file.buffer,
            req.file.originalname,
            'members/avatars'
        );

        member.avatar = {
            url: result.secure_url,
            publicId: result.public_id
        };

        member.updatedBy = req.adminId;
        await member.save();

        res.json(member);
    })
);

// DELETE avatar (admin)
router.delete('/admin/:id/avatar', authMiddleware, asyncHandler(async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    if (member.avatar?.publicId) {
        await deleteFromCloudinary(member.avatar.publicId);
    }

    member.avatar = undefined;
    member.updatedBy = req.adminId;
    await member.save();

    res.json(member);
}));

// ==================== BLOGS MANAGEMENT ====================

// UPDATE member's blogs (admin)
router.put('/admin/:id/blogs', authMiddleware, asyncHandler(async (req, res) => {
    const { blogs } = req.body;

    const member = await Member.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        { blogs, updatedBy: req.adminId },
        { new: true }
    )
        .populate('blogs', 'title slug')
        .select('-__v');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
}));

// ==================== STATISTICS ROUTES ====================

// GET member statistics (admin)
router.get('/admin/stats/overview', authMiddleware, asyncHandler(async (req, res) => {
    const [totalMembers, activeCount, alumniCount, inactiveCount] = await Promise.all([
        Member.countDocuments({ createdBy: req.adminId }),
        Member.countDocuments({ createdBy: req.adminId, status: 'active' }),
        Member.countDocuments({ createdBy: req.adminId, status: 'alumni' }),
        Member.countDocuments({ createdBy: req.adminId, status: 'inactive' })
    ]);

    // Count by section
    const sectionCounts = await Member.aggregate([
        { $match: { createdBy: req.adminId, status: 'active' } },
        { $group: { _id: '$section', count: { $sum: 1 } } }
    ]);

    // Count by position
    const positionCounts = await Member.aggregate([
        { $match: { createdBy: req.adminId, status: 'active' } },
        { $group: { _id: '$position', count: { $sum: 1 } } }
    ]);

    res.json({
        totalMembers,
        activeCount,
        alumniCount,
        inactiveCount,
        sectionCounts: Object.fromEntries(sectionCounts.map(s => [s._id, s.count])),
        positionCounts: Object.fromEntries(positionCounts.map(p => [p._id, p.count]))
    });
}));

export default router;
