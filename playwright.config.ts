import { defineConfig, devices } from '@playwright/test';

// E2E tests run against `vite dev` (no production build required so
// build:size-index — which hits the network — doesn't need to run in CI).
// Tests must not depend on size-index data being present.
export default defineConfig({
	testDir: 'e2e',
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['github'], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:5180',
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		// Use a non-default port + strictPort so the e2e suite can't accidentally
		// bind to (or, worse, reuse) an unrelated vite dev server on 5173.
		command: 'npm run dev -- --port 5180 --strictPort',
		url: 'http://localhost:5180',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
