// backend/utils/cloudinary.mjs
// Shared Cloudinary upload/delete helpers — replaces duplicated code across 6+ route files
import cloudinary from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import multer from 'multer';

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Original filename
 * @param {string} folder - Cloudinary folder (e.g., 'trainings', 'seasons')
 * @param {object} [extraOptions] - Extra Cloudinary upload options (e.g., transformation)
 * @returns {Promise<object>} Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, originalname, folder = 'uploads', extraOptions = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder,
                public_id: `${folder}_${Date.now()}_${originalname.split('.')[0]}`,
                ...extraOptions
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

/**
 * Delete an image from Cloudinary by public_id
 * Swallows errors — a failed delete should not crash the request
 * @param {string} publicId - Cloudinary public_id
 */
export const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.warn('Failed to delete from Cloudinary:', publicId, error.message);
    }
};

/**
 * Delete multiple images from Cloudinary in parallel (Issue 14A)
 * @param {string[]} publicIds - Array of Cloudinary public_ids
 */
export const deleteMultipleFromCloudinary = async (publicIds) => {
    const validIds = (publicIds || []).filter(Boolean);
    if (validIds.length === 0) return;
    await Promise.all(validIds.map(id => deleteFromCloudinary(id)));
};

/**
 * Create a multer upload instance with standard config
 * @param {number} maxSizeMB - Max file size in MB (default: 10)
 * @returns {multer.Multer} Configured multer instance
 */
export const createUpload = (maxSizeMB = 10) => {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'), false);
            }
        }
    });
};

// Default upload instance (10MB limit)
export const upload = createUpload();
