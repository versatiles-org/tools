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

	type SetupState = {
		os?: OptionOS;
		method?: OptionMethod;
		maps: OptionMap[];
		coverage?: OptionCoverage;
		bbox?: BBox;
		frontend?: OptionFrontend;
	};

	let selection = $state<SetupState>({
		os: undefined,
		method: undefined,
		maps: [],
		coverage: undefined,
		bbox: undefined,
		frontend: undefined
	});

	onMount(() => {
		const { os, method, maps, coverage, frontend } = decodeHash(window.location.hash);
		if (os) {
			selection.os = optionsOS.find((o) => o.key === os);
			if (selection.os && method)
				selection.method = optionsMethod(selection.os.key).find((m) => m.key === method);
		}
		if (maps) selection.maps = optionsMap.filter((m) => maps.includes(m.key));
		if (coverage) selection.coverage = optionsCoverage.find((c) => c.key === coverage);
		if (frontend) selection.frontend = optionsFrontend.find((f) => f.key === frontend);
	});

	let code: string | undefined = $derived(
		selection.os && selection.method
			? generateCode(
					selection.os,
					selection.method,
					selection.maps,
					selection.coverage,
					selection.bbox,
					selection.frontend
				)
			: undefined
	);

	$effect(() => {
		let hash = encodeHash({
			selectedOS: selection.os,
			selectedMethod: selection.method,
			selectedMaps: selection.maps,
			selectedCoverage: selection.coverage,
			selectedBBox: selection.bbox,
			selectedFrontend: selection.frontend
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
	<title>Setup a VersaTiles server</title>
	<meta name="description" content="How to setup a VersaTiles server?" />
</svelte:head>

<section class="form">
	<h1>How to setup a VersaTiles server?</h1>

	<h2>1. Select your Operating System</h2>
	<div class="options">
		<FormOptionGroup options={optionsOS} bind:value={selection.os} />
	</div>

	{#if selection.os}
		{#key selection.os}
			<h2>2. Select an Installation Method</h2>
			<div class="options">
				<FormOptionGroup options={optionsMethod(selection.os.key)} bind:value={selection.method} />
			</div>
		{/key}

		{#if selection.method}
			<h2>3. Select Map Data</h2>
			<p class="small">
				Currently, only OpenStreetMap vector data is available.<br />
				More map sources will be added in the future.
			</p>
			<div class="options">
				<FormOptionGroup
					options={optionsMap}
					allowMultiselect={true}
					bind:valueList={selection.maps}
				/>
			</div>

			{#if selection.maps.length > 0}
				<h2>4. Select Coverage Area</h2>
				<div class="options">
					<FormOptionGroup options={optionsCoverage} bind:value={selection.coverage} />
				</div>

				{#if selection.coverage?.key == 'bbox'}
					<div
						style="width:80vmin;height:60vmin;max-width:600px;max-height:450px;margin:0.5em auto;color-scheme:dark;"
					>
						<BBoxMap bind:selectedBBox={selection.bbox} />
					</div>
				{/if}

				{#if selection.coverage}
					<h2>5. Add a Frontend?</h2>
					<div class="options">
						<FormOptionGroup options={optionsFrontend} bind:value={selection.frontend} />
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
