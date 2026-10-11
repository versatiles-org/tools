import { test, expect, type Page } from '@playwright/test';

// The size indices are generated at build time and may be missing in dev, so
// these tests stub the requests instead of relying on the real files.
const INDEX_URL = '**/data/size-index-*.json';

async function selectUpToMaps(page: Page) {
	await page.goto('/setup_server');
	await page.waitForLoadState('networkidle');
	await page.locator('button', { hasText: 'Linux' }).click();
	await page.locator('button', { hasText: 'Install script' }).click();
	await page.locator('button', { hasText: 'OpenStreetMap' }).click();
}

test.describe('size estimate', () => {
	test('loads each size index only once', async ({ page }) => {
		let requests = 0;
		await page.route(INDEX_URL, async (route) => {
			requests++;
			// Respond slowly, so the selection changes below overlap with the request.
			await new Promise((resolve) => setTimeout(resolve, 1500));
			await route.fulfill({ json: { levels: { '0': 5 * 1024 ** 3 } } });
		});

		await selectUpToMaps(page);
		await page.locator('button', { hasText: 'Entire world' }).click();
		await page.locator('button', { hasText: 'Custom region' }).click();
		await page.locator('button', { hasText: 'Entire world' }).click();

		await expect(page.getByText('Estimated download size:')).toBeVisible();
		await expect(page.getByText('~ 5.00 GB')).toBeVisible();
		expect(requests).toBe(1);
	});

	test('tells the user when the size index cannot be loaded', async ({ page }) => {
		await page.route(INDEX_URL, (route) => route.fulfill({ status: 404, body: 'Not found' }));

		await selectUpToMaps(page);
		await page.locator('button', { hasText: 'Entire world' }).click();

		await expect(page.getByText('Download size estimate is not available.')).toBeVisible();
	});
});
