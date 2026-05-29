import { test, expect } from '@playwright/test';

test('home page shows all three tool cards', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'VersaTiles Tools' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Server Setup Guide' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Bounding Box Picker' })).toBeVisible();
	await expect(page.locator('a', { hasText: 'Map Style Editor' })).toBeVisible();
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
