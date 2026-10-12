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
			'curl -fsSL "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-unix.sh"'
		);
		await expect(code).toContainText('curl -C - -fLo "osm.versatiles"');
		await expect(code).toContainText('versatiles serve');
		await expect(code).toContainText('--port 8080');
	});

	test('preselects the Standard frontend', async ({ page }) => {
		// Regression: no frontend was selected by default, so the native methods
		// silently installed none while docker_nginx fell back to "standard".
		await page.goto('/setup_server');
		await page.waitForLoadState('networkidle');

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Install script' }).click();
		await page.locator('button', { hasText: 'OpenStreetMap' }).click();
		await page.locator('button', { hasText: 'Entire world' }).click();

		await expect(page.locator('button', { hasText: 'Standard' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.locator('code').first()).toContainText('--static "frontend.br.tar.gz"');
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
		await expect(code).toContainText('versatiles convert');
		await expect(code).toContainText('--bbox-border 3');
		await expect(code).toContainText('"osm.versatiles"');
		// The non-converting curl path must NOT be present when bbox is in effect.
		await expect(code).not.toContainText('curl -C - -fLo "osm.versatiles"');
	});

	test('zoom range is applied to the script and clamped', async ({ page }) => {
		// Regression: the inputs are bound as numbers, but were handled as strings,
		// so committing a value threw and the zoom range was silently ignored.
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/setup_server');
		await page.waitForLoadState('networkidle');

		await page.locator('button', { hasText: 'Linux' }).click();
		await page.locator('button', { hasText: 'Install script' }).click();
		await page.locator('button', { hasText: 'OpenStreetMap' }).click();
		await page.locator('button', { hasText: 'Custom region' }).click();

		const minZoom = page.getByLabel('Min zoom');
		const maxZoom = page.getByLabel('Max zoom');
		const code = page.locator('code').first();

		await minZoom.fill('3');
		await minZoom.blur();
		await maxZoom.fill('99');
		await maxZoom.blur();

		await expect(maxZoom).toHaveValue('15');
		await expect(code).toContainText('--min-zoom 3 --max-zoom 15');

		await minZoom.fill('');
		await minZoom.blur();
		await expect(code).not.toContainText('--min-zoom');
		await expect(code).toContainText('--max-zoom 15');

		await minZoom.fill('16');
		await minZoom.blur();
		await maxZoom.fill('2');
		await maxZoom.blur();
		await expect(page.getByText('Min zoom must be ≤ max zoom')).toBeVisible();

		expect(errors).toEqual([]);
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
