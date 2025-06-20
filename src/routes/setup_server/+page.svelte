<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from './FormOption/FormOptionGroup.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import { generateCode } from './generate_code';

	import {
		optionsCoverage,
		optionsFrontend,
		optionsMaps,
		optionsMethod,
		optionsOS
	} from './options';
	import type {
		BBox,
		OptionCoverage,
		OptionFrontend,
		OptionMaps,
		OptionMethod,
		OptionOS
	} from './options';

	let selectedOS: OptionOS | undefined = $state(undefined);
	let selectedMethod: OptionMethod | undefined = $state(undefined);
	let selectedMaps: OptionMaps[] = $state([]);
	let selectedCoverage: OptionCoverage | undefined = $state(undefined);
	let selectedBBox: BBox | undefined = $state(undefined);
	let selectedFrontend: OptionFrontend | undefined = $state(undefined);

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
</script>

<svelte:head>
	<title>Install VersaTiles</title>
	<meta name="description" content="How to install VersaTiles?" />
</svelte:head>

<section class="form">
	<h1>How to install VersaTiles?</h1>

	<h2>1. Select your Operating System</h2>
	<div class="options">
		<FormOptionGroup options={optionsOS} onselect={(s) => (selectedOS = s)} />
	</div>

	{#if selectedOS}
		{#key selectedOS}
			<h2>2. Select an Installation Method</h2>
			<div class="options">
				<FormOptionGroup
					initialSelection={selectedMethod}
					options={optionsMethod(selectedOS.key)}
					onselect={(s) => (selectedMethod = s)}
				/>
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
					options={optionsMaps}
					multiselect={true}
					onmultiselect={(s) => (selectedMaps = s)}
				/>
			</div>

			{#if selectedMaps.length > 0}
				<h2>4. Select Coverage Area</h2>
				<div class="options">
					<FormOptionGroup options={optionsCoverage} onselect={(s) => (selectedCoverage = s)} />
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
						<FormOptionGroup options={optionsFrontend} onselect={(s) => (selectedFrontend = s)} />
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</section>

<section>
	{#if code}
		<hr />
		<h2>Paste these Instructions into your Shell</h2>
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
