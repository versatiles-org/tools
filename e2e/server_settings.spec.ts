import { test, expect, type Page } from '@playwright/test';

// The server settings sit between the "Review and run…" headline and the code
// block. They only fill values into the generated code.

async function selectMethod(page: Page, method: string) {
	await page.goto('/setup_server');
	await page.waitForLoadState('networkidle');
	await page.locator('button', { hasText: 'Linux' }).click();
	await page.locator('button', { hasText: method }).click();
	await page.locator('button', { hasText: 'OpenStreetMap' }).click();
	await page.locator('button', { hasText: 'Entire world' }).click();
	await expect(
		page.getByRole('heading', { name: 'Review and run these commands in your shell' })
	).toBeVisible();
}

test.describe('server settings', () => {
	test('port is used in the script, with sudo only for privileged ports', async ({ page }) => {
		await selectMethod(page, 'Install script');
		const code = page.locator('code').first();
		const port = page.getByLabel('Port');

		await expect(page.getByLabel('Domain')).toHaveCount(0);
		await expect(page.getByLabel('Email')).toHaveCount(0);
		await expect(code).toContainText('versatiles server --port 8080 ');
		await expect(code).not.toContainText('sudo "$(command -v versatiles)"');

		await port.fill('80');
		await expect(code).toContainText('sudo "$(command -v versatiles)" server --port 80 ');

		await port.fill('1024');
		await expect(code).toContainText('versatiles server --port 1024 ');
		await expect(code).not.toContainText('sudo "$(command -v versatiles)"');
	});

	test('an invalid port falls back to the default and shows a hint', async ({ page }) => {
		await selectMethod(page, 'Install script');
		const port = page.getByLabel('Port');

		await port.fill('99999');
		await port.blur();

		await expect(page.getByText('Port must be a number between 1 and 65535')).toBeVisible();
		await expect(page.locator('code').first()).toContainText('server --port 8080 ');
	});

	test('domain and email replace the example values for Docker with Nginx', async ({ page }) => {
		await selectMethod(page, 'Docker with Nginx');
		const code = page.locator('code').first();

		await expect(page.getByLabel('Port')).toHaveCount(0);
		await expect(code).toContainText('-e DOMAIN=maps.example.com');
		await expect(code).toContainText('USE THE CORRECT DOMAIN AND EMAIL SETTINGS!');

		await page.getByLabel('Domain').fill('tiles.my-city.org');
		await page.getByLabel('Email').fill('ops@my-city.org');

		await expect(code).toContainText('-e DOMAIN=tiles.my-city.org');
		await expect(code).toContainText('-e EMAIL=ops@my-city.org');
		await expect(code).not.toContainText('USE THE CORRECT DOMAIN AND EMAIL SETTINGS!');
	});

	test('a value that is not a domain never reaches the script', async ({ page }) => {
		await selectMethod(page, 'Docker with Nginx');
		const domain = page.getByLabel('Domain');

		await domain.fill('a.com; rm -rf /');
		await domain.blur();

		await expect(page.getByText('Enter a domain name like maps.example.com')).toBeVisible();
		await expect(page.locator('code').first()).toContainText('-e DOMAIN=maps.example.com');
		await expect(page.locator('code').first()).not.toContainText('rm -rf');
	});

	test('the share link does not contain the server settings', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await selectMethod(page, 'Docker with Nginx');

		await page.getByLabel('Domain').fill('tiles.my-city.org');
		await page.getByLabel('Email').fill('ops@my-city.org');
		await page.locator('button', { hasText: 'copy link' }).click();

		const link = await page.evaluate(() => navigator.clipboard.readText());
		expect(link).toContain('#linux+docker_nginx+osm+global+standard');
		expect(link).not.toContain('my-city');
	});
});
