// backend/validators/trainingValidator.mjs
// Joi validation schemas for training admin routes (Issue 6A)
import Joi from 'joi';

const trainingValidation = Joi.object({
    // Basic Info
    title: Joi.string().trim().max(200).required(),
    description: Joi.string().trim().required(),
    shortDescription: Joi.string().trim().max(300).allow(''),

    // Date & Time
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    displayDate: Joi.string().required(),
    duration: Joi.string().allow(''),
    schedule: Joi.string().allow(''),

    // Location
    location: Joi.object({
        venue: Joi.string().allow(''),
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        isOnline: Joi.boolean(),
        onlineLink: Joi.string().uri().allow('')
    }),

    // Registration
    registration: Joi.object({
        isOpen: Joi.boolean(),
        deadline: Joi.date().iso().allow(null),
        formLink: Joi.string().uri().allow(''),
        externalLink: Joi.string().uri().allow(''),
        spots: Joi.object({
            total: Joi.number().integer().min(0),
            available: Joi.number().integer().min(0),
            registered: Joi.number().integer().min(0)
        })
    }),

    // Pricing
    pricing: Joi.object({
        isFree: Joi.boolean(),
        regular: Joi.number().min(0),
        student: Joi.number().min(0),
        earlyBird: Joi.object({
            amount: Joi.number().min(0),
            deadline: Joi.date().iso().allow(null)
        }),
        currency: Joi.string().max(5)
    }),

    // Training Details
    topics: Joi.array().items(Joi.string().trim()),
    objectives: Joi.array().items(Joi.string().trim()),
    prerequisites: Joi.array().items(Joi.string().trim()),
    targetAudience: Joi.string().allow(''),

    // Instructors
    instructors: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        title: Joi.string().allow(''),
        bio: Joi.string().allow(''),
        avatar: Joi.object({
            url: Joi.string().uri().allow(''),
            public_id: Joi.string().allow('')
        }),
        linkedin: Joi.string().uri().allow(''),
        website: Joi.string().uri().allow('')
    })),

    // Media
    coverImage: Joi.object({
        url: Joi.string().uri().required(),
        public_id: Joi.string().allow('')
    }),

    // Additional Info
    category: Joi.string(),
    tags: Joi.array().items(Joi.string().trim()),
    level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'All Levels'),

    // Certificates & Materials
    certificate: Joi.object({
        isProvided: Joi.boolean(),
        type: Joi.string().allow(''),
        requirements: Joi.string().allow('')
    }),
    materials: Joi.object({
        isProvided: Joi.boolean(),
        description: Joi.string().allow('')
    }),

    // Status & Visibility
    status: Joi.string().valid('upcoming', 'ongoing', 'completed', 'cancelled'),
    isPublished: Joi.boolean(),
    isFeatured: Joi.boolean(),

    // Contact & Support
    contactInfo: Joi.object({
        email: Joi.string().email().allow(''),
        phone: Joi.string().allow(''),
        whatsapp: Joi.string().allow('')
    }),

    // SEO
    seo: Joi.object({
        metaTitle: Joi.string().allow(''),
        metaDescription: Joi.string().allow(''),
        keywords: Joi.array().items(Joi.string())
    }),

    displayOrder: Joi.number().integer().min(0)
}).options({ stripUnknown: true });

// Relaxed update schema — all fields optional
const trainingUpdateValidation = trainingValidation.fork(
    ['title', 'description', 'startDate', 'endDate', 'displayDate'],
    (schema) => schema.optional()
);

/**
 * Validate training creation data
 */
export const validateTraining = (data) => {
    return trainingValidation.validate(data, { abortEarly: false });
};

/**
 * Validate training update data (all fields optional)
 */
export const validateTrainingUpdate = (data) => {
    return trainingUpdateValidation.validate(data, { abortEarly: false });
};
