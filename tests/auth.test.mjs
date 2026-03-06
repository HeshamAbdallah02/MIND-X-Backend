// tests/auth.test.mjs
// Tests for authentication flow (Issue 11B)
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, connectTestDB, disconnectTestDB, clearTestDB } from './helpers/testApp.mjs';
import { createTestAdmin } from './helpers/authHelper.mjs';

const app = createTestApp();

describe('Auth Flow', () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await clearTestDB();
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
    });

    describe('POST /api/auth/login', () => {
        it('should return 401 for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@test.com', password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return 401 for wrong password', async () => {
            const { credentials } = await createTestAdmin();

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: credentials.email, password: 'wrong-password' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return a JWT token for valid credentials', async () => {
            const { credentials } = await createTestAdmin();

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: credentials.email, password: credentials.password });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(typeof res.body.token).toBe('string');
            expect(res.body.token.split('.')).toHaveLength(3); // JWT format
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Authorization token required');
        });

        it('should return 401 with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token.here');

            expect(res.status).toBe(401);
        });

        it('should return admin data with valid token', async () => {
            const { token, credentials } = await createTestAdmin();

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe(credentials.email);
            expect(res.body.passwordHash).toBeUndefined(); // Should not leak password
        });
    });

    describe('Auth Middleware Protection', () => {
        it('should block unauthenticated access to admin routes', async () => {
            const routes = [
                { method: 'get', path: '/api/trainings/admin/all' },
                { method: 'get', path: '/api/blogs/admin/all' },
                { method: 'get', path: '/api/members/admin/all' },
            ];

            for (const route of routes) {
                const res = await request(app)[route.method](route.path);
                expect(res.status).toBe(401);
            }
        });

        it('should allow authenticated access to admin routes', async () => {
            const { token } = await createTestAdmin();

            const res = await request(app)
                .get('/api/trainings/admin/all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
