import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text'],
			include: ['{scripts,src}/**/*.{ts,js}'],
			exclude: ['src/**/*.d.ts']
		},
		include: ['{scripts,src}/**/*.{test,spec}.{js,ts}']
	},
	esbuild: {
		supported: {
			'top-level-await': true
		}
	}
});
