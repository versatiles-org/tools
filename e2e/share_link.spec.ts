import { test, expect, type Page } from './fixtures';

// The "copy link" button stores the selection in the URL hash. Opening that
// link restores the selection on mount, so the page shows the same script.

const CODE_HEADING = 'Review and run these commands in your shell';

async function openSetup(page: Page, hash = '') {
	await page.goto('/setup_server' + hash);
	// Wait for hydration, so clicks reach Svelte's handlers and the hash is read.
	await page.waitForLoadState('networkidle');
}

function pressedButtons(page: Page) {
	return page.locator('button[aria-pressed="true"]');
}

test.describe('share link', () => {
	test('opening a copied link restores the selection and the script', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await openSetup(page);

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Install script' }).click();
		await page.locator('button', { hasText: 'Satellite imagery' }).click();
		await page.locator('button', { hasText: 'Custom region' }).click();
		const minZoom = page.getByLabel('Min zoom');
		await minZoom.fill('2');
		await minZoom.blur();
		const maxZoom = page.getByLabel('Max zoom');
		await maxZoom.fill('10');
		await maxZoom.blur();
		await page.locator('button', { hasText: 'Minimal' }).click();

		const code = page.locator('code').first();
		await expect(code).toContainText('--min-zoom 2 --max-zoom 10');
		const originalCode = await code.textContent();
		const originalPressed = await pressedButtons(page).allTextContents();

		await page.locator('button', { hasText: 'copy link' }).click();
		const link = await page.evaluate(() => navigator.clipboard.readText());
		expect(link).toMatch(/#linux\+script\+osm,satellite\+bbox,[-\d.,]+\+z,2,10\+min$/);

		const restored = await context.newPage();
		await openSetup(restored, new URL(link).hash);

		await expect(restored.getByRole('heading', { name: CODE_HEADING })).toBeVisible();
		await expect(restored.locator('code').first()).toHaveText(originalCode!);
		expect(await pressedButtons(restored).allTextContents()).toEqual(originalPressed);
		await expect(restored.getByLabel('Min zoom')).toHaveValue('2');
		await expect(restored.getByLabel('Max zoom')).toHaveValue('10');
	});

	test('a method that does not fit the operating system is dropped', async ({ page }) => {
		// Docker is not offered on Windows.
		await openSetup(page, '#windows+docker+osm+global+standard');

		await expect(page.locator('button', { hasText: 'Windows' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByRole('heading', { name: '2. Select an installation method' })
		).toBeVisible();
		await expect(page.locator('button', { hasText: 'Docker' })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: '3. Select map data' })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: CODE_HEADING })).toHaveCount(0);
	});
});
