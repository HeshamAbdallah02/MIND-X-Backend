// tests/setup/globalSetup.mjs
// Runs once before all test suites — sets up test environment
import dotenv from 'dotenv';
dotenv.config();

export default async function globalSetup() {
    // SAFETY: Refuse to run tests against the production database
    if (!process.env.MONGODB_TEST_URI) {
        console.error('\n❌ MONGODB_TEST_URI is not set!');
        console.error('   Tests use clearTestDB() which DELETES ALL DATA.');
        console.error('   Set MONGODB_TEST_URI in .env to a separate test database.\n');
        console.error('   Example: MONGODB_TEST_URI=mongodb://localhost:27017/mindx-test\n');
        process.exit(1);
    }

    process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing';
    process.env.NODE_ENV = 'test';
}
