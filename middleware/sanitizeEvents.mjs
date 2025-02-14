// backend/middleware/sanitizeEvents.js
const sanitizeEvent = (req, _res, next) => {
    const protectedFields = ['_id', '__v', 'createdAt', 'updatedAt'];
    protectedFields.forEach(field => delete req.body[field]);
    next();
};

export default sanitizeEvent;