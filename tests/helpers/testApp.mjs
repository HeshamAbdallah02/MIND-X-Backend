// tests/helpers/testApp.mjs
// Creates an Express app instance for Supertest (no server.listen)
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from '../../routes/auth.mjs';
import uploadRoutes from '../../routes/upload.mjs';
import blogRoutes from '../../routes/blogs.mjs';
import trainingsRoutes from '../../routes/trainings.mjs';
import membersRoutes from '../../routes/members.mjs';

/**
 * Create a test Express app (no server.listen — Supertest handles that)
 */
export function createTestApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/blogs', blogRoutes);
    app.use('/api/trainings', trainingsRoutes);
    app.use('/api/members', membersRoutes);

    // Health check
    app.get('/api/health', (_req, res) => {
        res.json({ message: 'Server is running!' });
    });

    // Error handler
    app.use((err, _req, res, _next) => {
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
    });

    return app;
}

/**
 * Connect to test MongoDB
 */
export async function connectTestDB() {
    const uri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
}

/**
 * Disconnect from test MongoDB
 */
export async function disconnectTestDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
}

/**
 * Clear all collections (careful — only use on test DB!)
 */
export async function clearTestDB() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}
