<script lang="ts">
	import Highlight from 'svelte-highlight';
	import bash from 'svelte-highlight/languages/bash';
	import github from "svelte-highlight/styles/github";

	export let code = '';

	function copyToClipboard() {
		navigator.clipboard.writeText(code).then(() => {
			alert('Copied to clipboard');
		});
	}
</script>

<svelte:head>
  {@html github}
</svelte:head>

<div class="code-container">
	<Highlight language={bash} {code} />
	<button on:click={copyToClipboard}>Copy</button>
</div>

<style>
	.code-container {
		position: relative;
		margin-bottom: 1em;
	}
	button {
		position: absolute;
		top: 0;
		right: 0;
		padding: 0.5em;
		background: #007bff;
		color: white;
		border: none;
		cursor: pointer;
	}
</style>
