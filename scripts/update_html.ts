import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Page } from 'cheerio_cms';
import { format } from 'prettier';

const TEMPLATE_URL = 'https://versatiles.org/tools.html';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const response = await fetch(TEMPLATE_URL);
if (!response.ok) {
	throw new Error(`Failed to fetch ${TEMPLATE_URL}: ${response.status} ${response.statusText}`);
}

const page = new Page(await response.text());

// Same-page anchors (e.g. the skip link) must stay relative: `setBaseUrl` would
// turn them into links to the tools home page, away from the current page.
const fragmentLinks = page.$('[href^="#"]').toArray();
const fragments = fragmentLinks.map((element) => page.$(element).attr('href')!);

page.setBaseUrl('https://versatiles.org/tools/');
fragmentLinks.forEach((element, i) => page.$(element).attr('href', fragments[i]));

// Title, description, canonical URL and social tags are set per page (see
// PageMeta.svelte). Keeping the template's copies would duplicate them, and
// crawlers use the first.
page
	.$(
		[
			'title',
			'link[rel="canonical"]',
			'meta[name="description"]',
			'meta[name="image"]',
			'meta[property^="og:"]',
			'meta[name^="twitter:"]'
		].join(', ')
	)
	.remove();

page.addHead('%sveltekit.head%').setContent('%sveltekit.body%');
page.$('main').removeClass('markdown-body');

writeFileSync(
	'src/app.html',
	await format(page.render(), { parser: 'html', printWidth: 120, useTabs: true, tabWidth: 3 })
);
