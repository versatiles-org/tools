<!-- CodeBlock.svelte -->
<script lang="ts">
	/* eslint svelte/no-at-html-tags: "off" */

	import Highlight from 'svelte-highlight';
	import { bash, json } from 'svelte-highlight/languages';
	import github from 'svelte-highlight/styles/github-dark';
	import '../../style/button.css';

	const languages = {
		bash,
		json
	} as const;

	type LanguageName = keyof typeof languages;
	type LanguageType = (typeof languages)[LanguageName];

	let { code = '', style = '', languageName = 'bash' as LanguageName } = $props();
	let language: LanguageType = $derived(languages[languageName]);

	async function copyToClipboard(this: HTMLButtonElement) {
		try {
			await navigator.clipboard.writeText(code);
			this.classList.add('done');
			setTimeout(() => this.classList.remove('done'), 1000);
		} catch {
			this.classList.add('failed');
			setTimeout(() => this.classList.remove('failed'), 1000);
		}
	}
</script>

<svelte:head>
	{@html github}
</svelte:head>

<div class="code-container">
	<Highlight {language} {code} {style} />
	<button onclick={copyToClipboard} class="check">copy</button>
</div>

<style>
	.code-container {
		position: relative;
		margin: 0 auto 1em;
		font-size: 0.7em;
		width: 90%;
	}
	button {
		position: absolute;
		top: 0.2em;
		right: 0.2em;
		padding: 0.2em 0.4em;
		opacity: 0.5;
	}
	button:hover {
		opacity: 1;
	}
</style>
