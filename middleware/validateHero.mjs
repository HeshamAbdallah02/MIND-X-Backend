//backend/middleware/validateHero.js
import Joi from 'joi';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const textSizeRegex = /^text-\[\d+px\]$/;

// Add a custom URL validation function
const validateUrl = (value, helpers) => {
  // Check if it's a relative URL starting with '/'
  if (value.startsWith('/')) {
    return value;
  }
  
  // Check if it's a valid absolute URL
  try {
    new URL(value);
    return value;
  } catch (error) {
    return helpers.error('string.uri');
  }
};

// Base schema for shared fields
const baseHeroSchema = {
  mediaType: Joi.string().valid('image', 'gif', 'video').required(),
  mediaUrl: Joi.string().uri().required(),
  displayDuration: Joi.number().min(1000).max(30000),
  heading: Joi.object({
    text: Joi.string().required(),
    color: Joi.string().pattern(hexColorRegex).default('#ffffff'),
    size: Joi.string().pattern(textSizeRegex).default('text-[64px]')
  }).required(),
  subheading: Joi.object({
    text: Joi.string().allow('').optional(),
    color: Joi.string().pattern(hexColorRegex).default('#ffffff'),
    size: Joi.string().pattern(textSizeRegex).default('text-[32px]')
  }).optional(),
  description: Joi.object({
    text: Joi.string().allow('').optional(),
    color: Joi.string().pattern(hexColorRegex).default('#ffffff'),
    size: Joi.string().pattern(textSizeRegex).default('text-[16px]')
  }).optional(),
  button: Joi.object({
    text: Joi.string().min(1).required().when('.action.target', {
      is: Joi.exist(),
      then: Joi.required()
    }),
    backgroundColor: Joi.string().pattern(hexColorRegex).default('#FBB859'),
    textColor: Joi.string().pattern(hexColorRegex).default('#ffffff'),
    action: Joi.object({
      type: Joi.string().valid('url', 'scroll').required(),
      target: Joi.when('type', {
        is: 'scroll',
        then: Joi.string().pattern(/^#[\w-]+$/).required(),
        otherwise: Joi.string().custom(validateUrl, 'URL validation').required()
      })
    }).optional()
  }).optional()
};

// Schema for creating new content
const createHeroSchema = Joi.object({
  ...baseHeroSchema,
  // Order is optional for creation as it will be set by the server
  order: Joi.number().integer().min(0).optional()
}).unknown(false); // Explicitly disallow unknown fields

// Schema for updating existing content
const updateHeroSchema = Joi.object({
  ...baseHeroSchema,
  // Order is required for updates
  order: Joi.number().integer().min(0).required()
}).unknown(false); // Explicitly disallow unknown fields

// Order validation schema
const orderSchema = Joi.object({
  order: Joi.number().integer().min(0).required()
}).unknown(false);

const validateHero = (req, res, next) => {
  // Choose schema based on request method
  const schema = req.method === 'PUT' ? updateHeroSchema : createHeroSchema;
  
  const { error } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true // Remove any fields not in the schema
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ error: errors.join('; ') });
  }
  next();
};

const validateOrder = (req, res, next) => {
  const { error } = orderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// Export both middleware functions
export default validateHero;
export { validateOrder };