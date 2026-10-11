import { test, expect } from '@playwright/test';

test('home page shows all four tool cards', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'VersaTiles Tools' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Server Setup Guide' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Bounding Box Picker' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Map Style Editor' })).toHaveAttribute(
		'href',
		'https://versatiles.org/maplibre-versatiles-styler/'
	);
	await expect(page.locator('a', { hasText: 'Map Editor' })).toHaveAttribute(
		'href',
		'https://versatiles.org/versatiles-map-editor/'
	);
});

test('clicking the Server Setup card navigates to the setup_server page', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.locator('a', { hasText: 'Server Setup Guide' }).click();
	await expect(page).toHaveURL(/\/setup_server\/?$/);
	await expect(
		page.getByRole('heading', { name: 'Set up your own VersaTiles server' })
	).toBeVisible();
});

// The page shell (src/app.html) is generated from the versatiles.org template.
// These guard against it bringing its own head tags or absolute anchors along.
for (const { path, title } of [
	{ path: '/', title: 'VersaTiles - Tools' },
	{ path: '/setup_server', title: 'Set up your own VersaTiles server' },
	{ path: '/bounding_box', title: 'VersaTiles - Bounding Box Picker' }
]) {
	test(`${path} has exactly one set of head tags and a same-page skip link`, async ({ page }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveTitle(title);
		await expect(page.locator('head title')).toHaveCount(1);
		await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
		await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
		await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute('content', title);
		await expect(page.locator('head meta[property="og:image"]')).toHaveCount(1);
		await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
		await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content');
	});
}
