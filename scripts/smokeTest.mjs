#!/usr/bin/env node
// scripts/smokeTest.mjs
// Smoke test script that hits all major endpoints (Issue 12B)
// Usage: node scripts/smokeTest.mjs [base-url]
//   e.g. node scripts/smokeTest.mjs http://localhost:5000

const BASE_URL = process.argv[2] || 'http://127.0.0.1:5000';

const ENDPOINTS = [
    // Health
    { method: 'GET', path: '/api/health', expect: 200 },

    // Public routes — should return 200 or empty arrays
    { method: 'GET', path: '/api/hero', expect: [200, 404] },
    { method: 'GET', path: '/api/header', expect: 200 },
    { method: 'GET', path: '/api/story-hero', expect: [200, 404] },
    { method: 'GET', path: '/api/settings', expect: 200 },
    { method: 'GET', path: '/api/events', expect: 200 },
    { method: 'GET', path: '/api/page-events/public', expect: [200, 400] },
    { method: 'GET', path: '/api/blogs/public', expect: 200 },
    { method: 'GET', path: '/api/blogs/public/featured/all', expect: 200 },
    { method: 'GET', path: '/api/blogs/public/popular/week', expect: 200 },
    { method: 'GET', path: '/api/blogs/public/categories/all', expect: 200 },
    { method: 'GET', path: '/api/blogs/public/tags/all', expect: 200 },
    { method: 'GET', path: '/api/trainings/public', expect: 200 },
    { method: 'GET', path: '/api/trainings/public/upcoming', expect: 200 },
    { method: 'GET', path: '/api/trainings/public/past', expect: 200 },
    { method: 'GET', path: '/api/trainings/public/featured', expect: 200 },
    { method: 'GET', path: '/api/members/public', expect: 200 },
    { method: 'GET', path: '/api/members/constants', expect: 200 },
    { method: 'GET', path: '/api/testimonials', expect: 200 },
    { method: 'GET', path: '/api/sponsors', expect: [200, 401] },
    { method: 'GET', path: '/api/awards', expect: [200, 404] },
    { method: 'GET', path: '/api/timeline/public', expect: [200, 404] },
    { method: 'GET', path: '/api/seasons/public', expect: [200, 400] },
    { method: 'GET', path: '/api/cta', expect: [200, 404] },
    { method: 'GET', path: '/api/stats', expect: 200 },
    { method: 'GET', path: '/api/training-hero/public', expect: [200, 404] },
    { method: 'GET', path: '/api/training-cta/public', expect: [200, 404] },
    { method: 'GET', path: '/api/forms', expect: [200, 404] },

    // Auth routes — should return 401 without token
    { method: 'GET', path: '/api/auth/me', expect: 401 },
    { method: 'GET', path: '/api/trainings/admin/all', expect: 401 },
    { method: 'GET', path: '/api/blogs/admin/all', expect: 401 },
    { method: 'GET', path: '/api/members/admin/all', expect: 401 },
];

async function runSmokeTests() {
    console.log(`\n🔥 Smoke Test — ${BASE_URL}\n`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const endpoint of ENDPOINTS) {
        const url = `${BASE_URL}${endpoint.path}`;
        try {
            const res = await fetch(url, { method: endpoint.method });
            const expectedStatuses = Array.isArray(endpoint.expect) ? endpoint.expect : [endpoint.expect];

            if (expectedStatuses.includes(res.status)) {
                console.log(`  ✅ ${endpoint.method} ${endpoint.path} → ${res.status}`);
                passed++;
            } else {
                console.log(`  ❌ ${endpoint.method} ${endpoint.path} → ${res.status} (expected ${endpoint.expect})`);
                failed++;
                failures.push({ ...endpoint, actual: res.status });
            }
        } catch (error) {
            console.log(`  💥 ${endpoint.method} ${endpoint.path} → ${error.message}`);
            failed++;
            failures.push({ ...endpoint, error: error.message });
        }
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${ENDPOINTS.length} total`);

    if (failures.length > 0) {
        console.log('\n❌ Failures:');
        for (const f of failures) {
            if (f.error) {
                console.log(`   ${f.method} ${f.path}: ${f.error}`);
            } else {
                console.log(`   ${f.method} ${f.path}: got ${f.actual}, expected ${f.expect}`);
            }
        }
        process.exit(1);
    } else {
        console.log('\n🎉 All smoke tests passed!\n');
        process.exit(0);
    }
}

runSmokeTests();
