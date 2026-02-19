import { writeFileSync } from 'node:fs';
import { Page } from 'cheerio_cms';
import { format } from 'prettier';

process.chdir(new URL('../', import.meta.url).pathname);

const html = await (await fetch('https://versatiles.org/tools.html')).text();

const page = new Page(html)
	.setBaseUrl('https://versatiles.org/tools/')
	.addHead('%sveltekit.head%')
	.setContent('%sveltekit.body%');
page.$('main').removeClass('markdown-body');

writeFileSync(
	'src/app.html',
	await format(page.render(), { parser: 'html', printWidth: 120, useTabs: true, tabWidth: 3 })
);
