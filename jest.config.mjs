/** @type {import('jest').Config} */
export default {
    // ESM support via Node's native --experimental-vm-modules
    testEnvironment: 'node',
    transform: {},
    extensionsToTreatAsEsm: [],

    // Test file patterns
    testMatch: ['**/tests/**/*.test.mjs'],

    // Setup & teardown
    globalSetup: './tests/setup/globalSetup.mjs',
    globalTeardown: './tests/setup/globalTeardown.mjs',

    // Timeouts
    testTimeout: 15000,

    // Coverage
    collectCoverageFrom: [
        'controllers/**/*.mjs',
        'middleware/**/*.mjs',
        'utils/**/*.mjs',
        '!**/node_modules/**'
    ]
};
