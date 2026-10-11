<!-- +page.svelte -->
<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import PageMeta from '../../lib/PageMeta/PageMeta.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import '../../style/default.css';

	let selectedBBox = $state<[number, number, number, number] | undefined>(undefined);
	let code = $derived(selectedBBox ? JSON.stringify(selectedBBox) : '');
</script>

<PageMeta
	title="VersaTiles - Bounding Box Picker"
	description="Select a geographic bounding box and get its coordinates."
	path="bounding_box"
/>

<section class="form">
	<h1>Select a bounding box</h1>

	<div style="width:100%;height:70vh;margin:0.5em auto;color-scheme:dark;">
		<BBoxMap bind:selectedBBox />
	</div>
	<div style="max-width: 30em; margin: 0 auto;">
		<CodeBlock {code} style="text-align:center" languageName="json" />
	</div>
</section>
