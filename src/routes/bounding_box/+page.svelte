<!-- +page.svelte -->
<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import { BBoxMap } from '@versatiles/svelte';

	let selectedBBox: [number, number, number, number] | undefined = undefined;
	let code = '';

	$: {
		if (selectedBBox) updateCode();
	}

	function updateCode() {
		code = selectedBBox ? JSON.stringify(selectedBBox) : '';
	}
</script>

<svelte:head>
	<title>Bounding Box VersaTiles</title>
	<meta name="description" content="How to install VersaTiles?" />
</svelte:head>

<section class="form">
	<h1>Select a bounding box</h1>

	<div style="width:100%;height:70vh;margin:0.5em auto;color-scheme:dark;">
		<BBoxMap bind:selectedBBox />
	</div>
	<div style="max-width: 30em; margin: 0 auto;">
		<CodeBlock {code} style="text-align:center" languageName="json" />
	</div>
</section>

<style>
</style>
