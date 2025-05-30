import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

process.chdir(new URL('../', import.meta.url).pathname);

mkdirSync('scripts/lib', { recursive: true });
const lib = await (
	await fetch(
		'https://raw.githubusercontent.com/versatiles-org/versatiles-org.github.io/refs/heads/main/src/cms/page.ts'
	)
).text();
writeFileSync('scripts/lib/page.ts', lib);

const { Page } = await import('./lib/page.js');

let html = await (await fetch('https://versatiles.org/tools.html')).text();
html = new Page(html)
	.setBaseUrl('https://versatiles.org/tools/')
	.addHead('%sveltekit.head%')
	.setContent('%sveltekit.body%')
	.render();

writeFileSync('src/app.html', html);

rmSync('scripts/lib', { recursive: true });
