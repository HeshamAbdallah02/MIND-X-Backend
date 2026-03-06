// backend/controllers/membersController.mjs
// Business logic extracted from routes/members.mjs (Issue 2B)
import Member, { MEMBER_POSITIONS, TEAM_SECTIONS } from '../models/Member.mjs';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.mjs';

// ==================== PUBLIC ====================

export const getActiveMembers = async (req, res) => {
    const { section, position } = req.query;
    const query = { status: 'active' };

    if (section) query.section = section;
    if (position) query.position = position;

    const members = await Member.find(query)
        .populate('blogs', 'title slug coverImage publishedAt')
        .sort({ displayOrder: 1, createdAt: -1 })
        .select('-__v -createdBy -updatedBy');

    res.json(members);
};

export const getConstants = async (_req, res) => {
    res.json({
        positions: MEMBER_POSITIONS,
        sections: TEAM_SECTIONS
    });
};

export const getMemberBySlug = async (req, res) => {
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
};

// ==================== ADMIN ====================

export const getAllAdminMembers = async (req, res) => {
    const members = await Member.find({ createdBy: req.adminId })
        .populate('blogs', 'title slug')
        .sort({ displayOrder: 1, createdAt: -1 })
        .select('-__v');

    res.json(members);
};

export const getAdminMember = async (req, res) => {
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
};

export const createMember = async (req, res) => {
    const member = new Member({
        ...req.body,
        createdBy: req.adminId
    });
    await member.save();

    res.status(201).json(member);
};

export const updateMember = async (req, res) => {
    const member = await Member.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        { ...req.body, updatedBy: req.adminId },
        { new: true, runValidators: true }
    ).select('-__v');

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
};

export const deleteMember = async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    await deleteFromCloudinary(member.avatar?.public_id);
    await Member.findByIdAndDelete(req.params.id);

    res.json({ message: 'Member deleted successfully' });
};

export const toggleStatus = async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    const statusCycle = {
        'active': 'inactive',
        'inactive': 'alumni',
        'alumni': 'active'
    };

    member.status = statusCycle[member.status] || 'active';
    member.updatedBy = req.adminId;
    await member.save();

    res.json(member);
};

export const updateOrder = async (req, res) => {
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
};

// ==================== AVATAR ====================

export const uploadAvatar = async (req, res) => {
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

    await deleteFromCloudinary(member.avatar?.public_id);

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'members/avatars'
    );

    member.avatar = {
        url: result.secure_url,
        public_id: result.public_id  // Fixed: was publicId (camelCase) in old route
    };

    member.updatedBy = req.adminId;
    await member.save();

    res.json(member);
};

export const deleteAvatar = async (req, res) => {
    const member = await Member.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!member) {
        return res.status(404).json({ message: 'Member not found' });
    }

    await deleteFromCloudinary(member.avatar?.public_id);

    member.avatar = undefined;
    member.updatedBy = req.adminId;
    await member.save();

    res.json(member);
};

// ==================== BLOGS ====================

export const updateMemberBlogs = async (req, res) => {
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
};

// ==================== STATISTICS ====================

export const getStatsOverview = async (req, res) => {
    const [totalMembers, activeCount, alumniCount, inactiveCount] = await Promise.all([
        Member.countDocuments({ createdBy: req.adminId }),
        Member.countDocuments({ createdBy: req.adminId, status: 'active' }),
        Member.countDocuments({ createdBy: req.adminId, status: 'alumni' }),
        Member.countDocuments({ createdBy: req.adminId, status: 'inactive' })
    ]);

    const sectionCounts = await Member.aggregate([
        { $match: { createdBy: req.adminId, status: 'active' } },
        { $group: { _id: '$section', count: { $sum: 1 } } }
    ]);

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
};
