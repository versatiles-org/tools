<script lang="ts">
	import Highlight from 'svelte-highlight';
	import bash from 'svelte-highlight/languages/bash';
	import github from 'svelte-highlight/styles/github-dark';

	export let code = '';

	function copyToClipboard() {
		navigator.clipboard.writeText(code);
	}
</script>

<svelte:head>
	{@html github}
</svelte:head>

<div class="code-container">
	<Highlight language={bash} {code} />
	<button on:click={copyToClipboard}>copy</button>
</div>

<style>
	.code-container {
		position: relative;
		margin-bottom: 1em;
		font-size: 0.7em;
	}
	button {
		position: absolute;
		top: 0;
		right: 0;
		padding: 0.5em;
		background: #000;
		color: white;
		border: none;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
	}
	button:hover {
		background-color: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
