/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    // Add more setup options before each test is run
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    // Exclude E2E tests - those are run via Playwright, not Jest
    testPathIgnorePatterns: [
        '/node_modules/',
        '/__tests__/e2e/',
    ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
