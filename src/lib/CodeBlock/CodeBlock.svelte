<!-- CodeBlock.svelte -->
<script lang="ts">
	import Highlight from 'svelte-highlight';
	import { bash, json } from 'svelte-highlight/languages';
	import github from 'svelte-highlight/styles/github-dark';

	const languages = {
		bash,
		json
	} as const;

	type LanguageName = keyof typeof languages;
	type LanguageType = (typeof languages)[LanguageName];

	export let code = '';
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
	<Highlight {language} {code} style="text-align:center" />
	<button on:click={copyToClipboard}>copy</button>
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
		top: 0;
		right: 0;
		padding: 0.5em;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
		opacity: 0.5;
	}
	button:hover {
		background-color: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.8);
		opacity: 1;
	}
</style>
