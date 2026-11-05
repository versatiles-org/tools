import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

// The tests must stay offline, so requests to download.versatiles.org, such
// as the size indices, fail unless a test stubs them. A test's own
// `page.route` takes precedence over this context-wide route.
export const test = base.extend<{ blockDownloads: void }>({
	blockDownloads: [
		async ({ context }, use) => {
			await context.route('https://download.versatiles.org/**', (route) => route.abort());
			await use();
		},
		{ auto: true }
	]
});
