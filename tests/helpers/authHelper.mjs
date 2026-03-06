// tests/helpers/authHelper.mjs
// Helper to create test admin and get JWT token
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../../models/Admin.mjs';

const TEST_ADMIN = {
    email: 'test-admin@mind-x.test',
    password: 'TestPassword123!'
};

/**
 * Create a test admin user and return admin + JWT token
 */
export async function createTestAdmin() {
    const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 10);

    const admin = await Admin.create({
        email: TEST_ADMIN.email,
        passwordHash
    });

    const token = jwt.sign(
        { id: admin._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return { admin, token, credentials: TEST_ADMIN };
}

/**
 * Get auth header object for Supertest requests
 */
export function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}
