<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from './FormOption/FormOptionGroup.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import { generateCode } from './generate_code';
	import { onMount } from 'svelte';
	import { decodeHash, encodeHash } from './hash';

	import {
		optionsCoverage,
		optionsFrontend,
		optionsMap,
		optionsMethod,
		optionsOS
	} from './options';
	import type {
		BBox,
		OptionCoverage,
		OptionFrontend,
		OptionMap,
		OptionMethod,
		OptionOS
	} from './options';

	let selectedOS: OptionOS | undefined = $state(undefined);
	let selectedMethod: OptionMethod | undefined = $state(undefined);
	let selectedMaps: OptionMap[] = $state([]);
	let selectedCoverage: OptionCoverage | undefined = $state(undefined);
	let selectedBBox: BBox | undefined = $state(undefined);
	let selectedFrontend: OptionFrontend | undefined = $state(undefined);

	onMount(() => {
		const { os, method, maps, coverage, frontend } = decodeHash(window.location.hash);
		if (os) {
			selectedOS = optionsOS.find((o) => o.key === os);
			if (selectedOS && method)
				selectedMethod = optionsMethod(selectedOS.key).find((m) => m.key === method);
		}
		if (maps) selectedMaps = optionsMap.filter((m) => maps.includes(m.key));
		if (coverage) selectedCoverage = optionsCoverage.find((c) => c.key === coverage);
		if (frontend) selectedFrontend = optionsFrontend.find((f) => f.key === frontend);
	});

	let code: string | undefined = $derived(
		selectedOS && selectedMethod
			? generateCode(
					selectedOS,
					selectedMethod,
					selectedMaps,
					selectedCoverage,
					selectedBBox,
					selectedFrontend
				)
			: undefined
	);

	$effect(() => {
		let hash = encodeHash({
			selectedOS,
			selectedMethod,
			selectedMaps,
			selectedCoverage,
			selectedBBox,
			selectedFrontend
		});
		hash = hash ? `#${hash}` : '';

		if (hash !== window.location.hash.slice(1)) {
			let new_url = new URL(hash, window.location.href);
			if (!hash) {
				new_url.hash = '';
			}
			history.replaceState(null, '', new_url.href);
		}
	});
</script>

<svelte:head>
	<title>Install VersaTiles</title>
	<meta name="description" content="How to install VersaTiles?" />
</svelte:head>

<section class="form">
	<h1>How to install VersaTiles?</h1>

	<h2>1. Select your Operating System</h2>
	<div class="options">
		<FormOptionGroup options={optionsOS} bind:value={selectedOS} />
	</div>

	{#if selectedOS}
		{#key selectedOS}
			<h2>2. Select an Installation Method</h2>
			<div class="options">
				<FormOptionGroup options={optionsMethod(selectedOS.key)} bind:value={selectedMethod} />
			</div>
		{/key}

		{#if selectedMethod}
			<h2>3. Select Map Data</h2>
			<p class="small">
				Currently, only OpenStreetMap vector data is available.<br />
				More map sources will be added in the future.
			</p>
			<div class="options">
				<FormOptionGroup
					options={optionsMap}
					allowMultiselect={true}
					bind:valueList={selectedMaps}
				/>
			</div>

			{#if selectedMaps.length > 0}
				<h2>4. Select Coverage Area</h2>
				<div class="options">
					<FormOptionGroup options={optionsCoverage} bind:value={selectedCoverage} />
				</div>

				{#if selectedCoverage?.key == 'bbox'}
					<div
						style="width:80vmin;height:60vmin;max-width:600px;max-height:450px;margin:0.5em auto;color-scheme:dark;"
					>
						<BBoxMap bind:selectedBBox />
					</div>
				{/if}

				{#if selectedCoverage}
					<h2>5. Add a Frontend?</h2>
					<div class="options">
						<FormOptionGroup options={optionsFrontend} bind:value={selectedFrontend} />
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</section>

<section>
	{#if code}
		<hr />
		<h2>Check and paste these instructions into your shell</h2>
		<CodeBlock {code} />
	{/if}
</section>

<style>
	hr {
		margin: 5rem auto 2rem;
		border: none;
		height: 1px;
		background: #888;
		width: 100%;
	}
	.form h2 {
		margin-bottom: 0;
	}
	p.small {
		margin-top: 0.2rem;
		font-size: 0.8rem;
		text-align: center;
		opacity: 0.8;
	}
	div.options {
		margin: 1rem 0 0.5rem;
	}
</style>
