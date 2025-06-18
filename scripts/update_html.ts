import { writeFileSync } from 'node:fs';
import { Page } from 'cheerio_cms';

process.chdir(new URL('../', import.meta.url).pathname);

const html = await (await fetch('https://versatiles.org/tools.html')).text();

const page = new Page(html)
	.setBaseUrl('https://versatiles.org/tools/')
	.addHead('%sveltekit.head%')
	.setContent('%sveltekit.body%');
page.$('main').removeClass('markdown-body');

writeFileSync('src/app.html', page.render());
