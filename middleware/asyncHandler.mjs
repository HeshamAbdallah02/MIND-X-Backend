// backend/middleware/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch((error) => {
            console.error('Request error:', {
                path: req.path,
                method: req.method,
                error: error.message,
                stack: error.stack
            });

            // Handle Mongoose validation errors
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    message: 'Validation Error',
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            // Handle Mongoose duplicate key errors
            if (error.code === 11000) {
                return res.status(409).json({
                    message: 'Duplicate Entry',
                    field: Object.keys(error.keyPattern)[0]
                });
            }

            // Handle Mongoose cast errors (invalid IDs)
            if (error.name === 'CastError') {
                return res.status(400).json({
                    message: 'Invalid ID format',
                    field: error.path
                });
            }

            // Default error response
            res.status(error.status || 500).json({
                message: error.message || 'Internal Server Error',
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack
                })
            });
        });
};

export default asyncHandler;