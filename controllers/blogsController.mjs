// backend/controllers/blogsController.mjs
// Business logic extracted from routes/blogs.mjs (Issue 2B)
import Blog from '../models/Blog.mjs';
import { uploadToCloudinary, deleteFromCloudinary, deleteMultipleFromCloudinary } from '../utils/cloudinary.mjs';
import { shouldCountView } from '../models/ViewLog.mjs';

// ==================== PUBLIC ====================

export const getPublishedBlogs = async (req, res) => {
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
};

export const getBlogBySlug = async (req, res) => {
    const blog = await Blog.findOne({
        slug: req.params.slug,
        status: 'published'
    }).select('-createdBy');

    if (!blog) {
        return res.status(404).json({ message: 'Blog post not found' });
    }

    // Increment views (only once per IP per hour via MongoDB TTL — Issue 13A)
    const clientIp = req.ip || req.connection.remoteAddress;
    const isNewView = await shouldCountView('blog', blog._id, clientIp);

    if (isNewView) {
        blog.views += 1;
        await blog.save();
    }

    res.json(blog);
};

export const getFeaturedBlogs = async (_req, res) => {
    const blogs = await Blog.find({
        status: 'published',
        featured: true
    })
        .sort({ publishedAt: -1 })
        .limit(3)
        .select('-createdBy');

    res.json(blogs);
};

export const getPopularBlogs = async (_req, res) => {
    const blogs = await Blog.find({
        status: 'published',
        views: { $gt: 0 }
    })
        .sort({ views: -1 })
        .limit(3)
        .select('-createdBy');

    res.json(blogs);
};

export const getAuthorsOfMonth = async (_req, res) => {
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
        { $sort: { totalViews: -1 } },
        { $limit: 3 },
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
};

export const getRelatedBlogs = async (req, res) => {
    const currentBlog = await Blog.findOne({ slug: req.params.slug });

    if (!currentBlog) {
        return res.status(404).json({ message: 'Blog not found' });
    }

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
};

export const getCategories = async (_req, res) => {
    const categories = await Blog.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    res.json(categories);
};

export const getTags = async (_req, res) => {
    const tags = await Blog.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
    ]);

    res.json(tags);
};

// ==================== ADMIN ====================

export const getAllAdminBlogs = async (req, res) => {
    const blogs = await Blog.find({ createdBy: req.adminId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');

    res.json(blogs);
};

export const getAdminBlog = async (req, res) => {
    const blog = await Blog.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
    }

    res.json(blog);
};

export const createBlog = async (req, res) => {
    const blog = new Blog({
        ...req.body,
        createdBy: req.adminId
    });

    await blog.save();
    res.status(201).json(blog);
};

export const updateBlog = async (req, res) => {
    const blog = await Blog.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.adminId },
        req.body,
        { new: true, runValidators: true }
    );

    if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
    }

    res.json(blog);
};

export const toggleFeatured = async (req, res) => {
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
};

export const togglePublish = async (req, res) => {
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
};

export const deleteBlog = async (req, res) => {
    const blog = await Blog.findOne({
        _id: req.params.id,
        createdBy: req.adminId
    });

    if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
    }

    // Parallel Cloudinary cleanup (Issue 14A)
    await deleteMultipleFromCloudinary([
        blog.coverImage?.public_id,
        blog.author?.avatar?.public_id
    ]);

    await blog.deleteOne();
    res.json({ message: 'Blog deleted successfully' });
};

// ==================== IMAGE UPLOADS ====================

export const uploadCoverImage = async (req, res) => {
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

    await deleteFromCloudinary(blog.coverImage?.public_id);

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'mind-x/blogs/covers',
        {
            transformation: [
                { width: 1200, height: 630, crop: 'fill', quality: 'auto' }
            ]
        }
    );

    blog.coverImage = {
        url: result.secure_url,
        public_id: result.public_id,  // Fixed: was publicId in old route
        alt: req.body.alt || blog.title
    };

    await blog.save();
    res.json(blog);
};

export const uploadAuthorAvatar = async (req, res) => {
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

    await deleteFromCloudinary(blog.author?.avatar?.public_id);

    const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        'mind-x/blogs/avatars',
        {
            transformation: [
                { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }
            ]
        }
    );

    if (!blog.author) blog.author = {};
    blog.author.avatar = {
        url: result.secure_url,
        public_id: result.public_id  // Fixed: was publicId in old route
    };

    await blog.save();
    res.json(blog);
};
