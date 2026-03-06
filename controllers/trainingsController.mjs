// backend/controllers/trainingsController.mjs
// Business logic extracted from routes/trainings.mjs (Issue 2B)
import Training from '../models/Training.mjs';
import { uploadToCloudinary, deleteFromCloudinary, deleteMultipleFromCloudinary } from '../utils/cloudinary.mjs';
import { validateTraining, validateTrainingUpdate } from '../validators/trainingValidator.mjs';
import { shouldCountView } from '../models/ViewLog.mjs';

// ==================== PUBLIC ====================

export const getPublishedTrainings = async (req, res) => {
    const { status, category, featured } = req.query;
    const query = { isPublished: true };

    if (status) query.status = status;
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;

    const trainings = await Training.find(query)
        .sort({ startDate: -1, displayOrder: 1 })
        .select('-__v');

    res.json(trainings);
};

export const getUpcomingTrainings = async (_req, res) => {
    const trainings = await Training.find({
        isPublished: true,
        status: 'upcoming',
        startDate: { $gte: new Date() }
    })
        .sort({ startDate: 1, displayOrder: 1 })
        .select('-__v');

    res.json(trainings);
};

export const getPastTrainings = async (_req, res) => {
    const trainings = await Training.find({
        isPublished: true,
        status: 'completed'
    })
        .sort({ startDate: -1 })
        .select('-__v');

    res.json(trainings);
};

export const getFeaturedTraining = async (_req, res) => {
    const training = await Training.findOne({
        isPublished: true,
        isFeatured: true,
        status: { $in: ['upcoming', 'ongoing'] }
    })
        .sort({ startDate: 1 })
        .select('-__v');

    res.json(training);
};

export const getTrainingBySlug = async (req, res) => {
    const training = await Training.findOne({
        slug: req.params.slug,
        isPublished: true
    }).select('-__v');

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    // Increment view count (deduplicated via MongoDB TTL — Issue 13A)
    const clientIp = req.ip || req.connection.remoteAddress;
    const isNewView = await shouldCountView('training', training._id, clientIp);

    if (isNewView) {
        training.stats.views += 1;
        await training.save();
    }

    res.json(training);
};

// ==================== ADMIN ====================

export const getAllAdminTrainings = async (req, res) => {
    const trainings = await Training.find({ createdBy: req.adminId })
        .sort({ startDate: -1, createdAt: -1 })
        .select('-__v');

    res.json(trainings);
};

export const getAdminTraining = async (req, res) => {
    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    }).select('-__v');

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    res.json(training);
};

export const createTraining = async (req, res) => {
    const { error, value } = validateTraining(req.body);
    if (error) {
        return res.status(400).json({
            message: 'Validation failed',
            details: error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message.replace(/['"]/g, '')
            }))
        });
    }

    const training = new Training({
        ...value,
        createdBy: req.adminId
    });
    await training.save();

    res.status(201).json(training);
};

export const updateTraining = async (req, res) => {
    const { error, value } = validateTrainingUpdate(req.body);
    if (error) {
        return res.status(400).json({
            message: 'Validation failed',
            details: error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message.replace(/['"]/g, '')
            }))
        });
    }

    const training = await Training.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        { ...value, updatedBy: req.adminId },
        { new: true, runValidators: true }
    ).select('-__v');

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    res.json(training);
};

export const deleteTraining = async (req, res) => {
    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    // Parallel Cloudinary cleanup (Issue 14A)
    const idsToDelete = [
        training.coverImage?.public_id,
        ...(training.galleryImages || []).map(img => img.public_id),
        ...(training.instructors || []).map(inst => inst.avatar?.public_id)
    ];
    await deleteMultipleFromCloudinary(idsToDelete);

    await Training.findByIdAndDelete(req.params.id);

    res.json({ message: 'Training deleted successfully' });
};

export const togglePublish = async (req, res) => {
    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    training.isPublished = !training.isPublished;
    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

export const toggleFeatured = async (req, res) => {
    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    // If setting as featured, unfeatured others
    if (!training.isFeatured) {
        await Training.updateMany(
            { createdBy: req.adminId, isFeatured: true },
            { isFeatured: false }
        );
    }

    training.isFeatured = !training.isFeatured;
    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

export const updateRegistration = async (req, res) => {
    const { registered } = req.body;

    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    if (registered !== undefined) {
        training.registration.spots.registered = registered;
        training.registration.spots.available =
            (training.registration.spots.total || 0) - registered;
        training.stats.registrations = registered;
    }

    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

// ==================== IMAGE UPLOADS ====================

export const uploadCoverImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
    }

    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    // Delete old cover image
    await deleteFromCloudinary(training.coverImage?.public_id);

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'trainings/covers'
    );

    training.coverImage = {
        url: result.secure_url,
        public_id: result.public_id
    };

    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

export const addGalleryImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
    }

    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'trainings/gallery'
    );

    training.galleryImages.push({
        url: result.secure_url,
        public_id: result.public_id,
        caption: req.body.caption || ''
    });

    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

export const deleteGalleryImage = async (req, res) => {
    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    const image = training.galleryImages.id(req.params.imageId);
    if (!image) {
        return res.status(404).json({ message: 'Image not found' });
    }

    await deleteFromCloudinary(image.public_id);

    training.galleryImages.pull(req.params.imageId);
    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

export const uploadInstructorAvatar = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
    }

    const training = await Training.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!training) {
        return res.status(404).json({ message: 'Training not found' });
    }

    const instructor = training.instructors.id(req.params.instructorId);
    if (!instructor) {
        return res.status(404).json({ message: 'Instructor not found' });
    }

    await deleteFromCloudinary(instructor.avatar?.public_id);

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'trainings/instructors'
    );

    instructor.avatar = {
        url: result.secure_url,
        public_id: result.public_id
    };

    training.updatedBy = req.adminId;
    await training.save();

    res.json(training);
};

// ==================== STATISTICS ====================

export const getStatsOverview = async (req, res) => {
    const [totalTrainings, upcomingCount, pastCount, ongoingCount] = await Promise.all([
        Training.countDocuments({ createdBy: req.adminId }),
        Training.countDocuments({ createdBy: req.adminId, status: 'upcoming' }),
        Training.countDocuments({ createdBy: req.adminId, status: 'completed' }),
        Training.countDocuments({ createdBy: req.adminId, status: 'ongoing' })
    ]);

    const trainings = await Training.find({ createdBy: req.adminId });

    const totalRegistrations = trainings.reduce((sum, t) => sum + (t.stats?.registrations || 0), 0);
    const totalViews = trainings.reduce((sum, t) => sum + (t.stats?.views || 0), 0);

    res.json({
        totalTrainings,
        upcomingCount,
        pastCount,
        ongoingCount,
        totalRegistrations,
        totalViews
    });
};
