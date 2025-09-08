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

	export let code = '';
	export let style = '';
	export let languageName: LanguageName = 'bash';
	let language: LanguageType = bash;

	$: {
		language = languages[languageName];
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(code);
	}
</script>

<svelte:head>
	{@html github}
</svelte:head>

<div class="code-container">
	<Highlight {language} {code} {style} />
	<button onclick={copyToClipboard}>copy</button>
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
