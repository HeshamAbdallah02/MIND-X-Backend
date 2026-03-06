// backend/models/ViewLog.mjs
// MongoDB-based view deduplication with automatic TTL cleanup (Issue 13A)
import mongoose from 'mongoose';
import crypto from 'crypto';

const viewLogSchema = new mongoose.Schema({
    resourceType: {
        type: String,
        required: true,
        enum: ['blog', 'training']
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ipHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // TTL: auto-delete after 1 hour (3600 seconds)
    }
});

// Compound index for fast lookups + uniqueness
viewLogSchema.index({ resourceType: 1, resourceId: 1, ipHash: 1 }, { unique: true });

/**
 * Check if a view should be counted (returns true if new or expired).
 * Uses upsert to atomically check-and-set in one DB call.
 * IP is hashed for privacy — we never store raw IPs.
 */
export async function shouldCountView(resourceType, resourceId, clientIp) {
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16);

    try {
        const result = await ViewLog.findOneAndUpdate(
            { resourceType, resourceId, ipHash },
            { $setOnInsert: { createdAt: new Date() } },
            { upsert: true, new: false } // returns null if inserted (new view)
        );

        // If result is null, this is a new view (document was just inserted)
        return result === null;
    } catch (error) {
        // If duplicate key error (race condition), view already exists
        if (error.code === 11000) return false;
        // On any other error, allow the view to count (fail open)
        console.warn('ViewLog error (allowing view):', error.message);
        return true;
    }
}

const ViewLog = mongoose.model('ViewLog', viewLogSchema);
export default ViewLog;
