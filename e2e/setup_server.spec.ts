import { test, expect } from '@playwright/test';

// Note on selectors: the FormOptionGroup template emits buttons whose label text
// is prefixed with Svelte's reactive-comment markers. `getByRole` ends up unable
// to compute the accessible name through those markers, so we use Playwright's
// `locator('button', { hasText: ... })` which does a straightforward substring
// match against textContent and is far more robust here.

test.describe('setup_server', () => {
	test('walks the global-coverage happy path and shows the generated script', async ({ page }) => {
		await page.goto('/setup_server');
		// Wait for hydration to attach button listeners — otherwise the first click
		// fires against a pre-hydration DOM that has no Svelte event handler yet.
		await page.waitForLoadState('networkidle');

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Install script' }).click();
		await page.locator('button', { hasText: 'OpenStreetMap' }).click();
		await page.locator('button', { hasText: 'Entire world' }).click();
		await page.locator('button', { hasText: 'Standard' }).click();

		await expect(
			page.getByRole('heading', { name: 'Review and run these commands in your shell' })
		).toBeVisible();

		const code = page.locator('code').first();
		await expect(code).toContainText(
			'curl -Ls "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-unix.sh"'
		);
		await expect(code).toContainText('curl -C - -fLo "osm.versatiles"');
		await expect(code).toContainText('versatiles server --port 80');
	});

	test('Custom region generates a bbox-restricted convert script', async ({ page }) => {
		// BBoxMap auto-initialises with a default region, so the script should
		// always switch from a planet-wide curl to `versatiles convert --bbox …`.
		await page.goto('/setup_server');
		await page.waitForLoadState('networkidle');

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Install script' }).click();
		await page.locator('button', { hasText: 'OpenStreetMap' }).click();
		await page.locator('button', { hasText: 'Custom region' }).click();
		await page.locator('button', { hasText: 'Standard' }).click();

		const code = page.locator('code').first();
		await expect(code).toContainText('versatiles convert --bbox-border 3 --bbox "');
		await expect(code).toContainText('"osm.versatiles"');
		// The non-converting curl path must NOT be present when bbox is in effect.
		await expect(code).not.toContainText('curl -C - -fLo "osm.versatiles"');
	});

	test('zoom range inputs do not appear when method is docker_nginx', async ({ page }) => {
		// Regression: versatiles-nginx ignores MIN_ZOOM/MAX_ZOOM env vars, so the
		// UI must not offer zoom inputs when that install method is selected.
		await page.goto('/setup_server');
		// Wait for hydration to attach button listeners — otherwise the first click
		// fires against a pre-hydration DOM that has no Svelte event handler yet.
		await page.waitForLoadState('networkidle');

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Docker with Nginx' }).click();
		await page.locator('button', { hasText: 'OpenStreetMap' }).click();
		await page.locator('button', { hasText: 'Custom region' }).click();

		await expect(page.getByText('Zoom range')).toBeHidden();
	});
});
