<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from './FormOption/FormOptionGroup.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import { generateCode } from './generate_code';
	import { decodeHash, encodeHash } from './hash';
	import { estimateDownloadSizes, formatBytes, type SizeEstimate } from './estimate_size';
	import type { SetupState } from './types';
	import { base } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import '../../style/default.css';

	import {
		optionsCoverage,
		optionsFrontend,
		optionsMap,
		optionsMethod,
		optionsOS
	} from './options';

	let selection = $state<SetupState>({
		os: undefined,
		method: undefined,
		maps: [],
		coverage: undefined,
		bbox: undefined,
		frontend: undefined
	});

	onMount(() => {
		const applyFromHash = () => {
			const { os, method, maps, coverage, bbox, frontend } = decodeHash(window.location.hash);
			if (os) {
				selection.os = optionsOS.find((o) => o.key === os);
				if (selection.os && method)
					selection.method = optionsMethod(selection.os.key).find((m) => m.key === method);
			}
			if (maps) selection.maps = optionsMap.filter((m) => maps.includes(m.key));
			if (coverage) selection.coverage = optionsCoverage.find((c) => c.key === coverage);
			if (bbox) selection.bbox = bbox;
			if (frontend) selection.frontend = optionsFrontend.find((f) => f.key === frontend);
		};

		// Initialize from current URL hash on first mount
		applyFromHash();

		// Keep selection in sync when the user navigates back/forward or edits the hash
		window.addEventListener('hashchange', applyFromHash);
		window.addEventListener('popstate', applyFromHash);
		return () => {
			window.removeEventListener('hashchange', applyFromHash);
			window.removeEventListener('popstate', applyFromHash);
		};
	});

	let mounted = false;

	$effect(() => {
		const h = encodeHash(selection);
		if (!mounted) return;
		history.replaceState(null, '', '#' + h);
	});

	// Allow applyFromHash to run first, then enable hash syncing
	onMount(() => {
		tick().then(() => {
			mounted = true;
		});
	});

	$effect(() => {
		if (selection.os && selection.method) {
			const validMethods = optionsMethod(selection.os.key);
			if (!validMethods.some((m) => m.key === selection.method!.key)) {
				selection.method = undefined;
			}
		}
	});

	let sizeEstimates = $state<SizeEstimate[]>([]);

	$effect(() => {
		const maps = selection.maps;
		const coverage = selection.coverage;
		const bbox = selection.bbox;

		if (!coverage || maps.length === 0) {
			sizeEstimates = [];
			return;
		}

		const timer = setTimeout(() => {
			estimateDownloadSizes(maps, coverage.key, base, bbox)
				.then((estimates) => {
					sizeEstimates = estimates;
				})
				.catch(() => {
					sizeEstimates = [];
				});
		}, 50);

		return () => clearTimeout(timer);
	});

	let code: string | undefined = $derived.by(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { os, method, maps, coverage, bbox, frontend } = selection;
		return selection.os && selection.method ? generateCode(selection) : undefined;
	});

	async function copyShareLink(this: HTMLButtonElement) {
		const hash = encodeHash(selection);
		const url = new URL('#' + hash, window.location.href);
		try {
			await navigator.clipboard.writeText(url.href);
			this.classList.add('done');
			setTimeout(() => this.classList.remove('done'), 1000);
		} catch {
			this.classList.add('failed');
			setTimeout(() => this.classList.remove('failed'), 1000);
		}
	}
</script>

<svelte:head>
	<title>How to setup a VersaTiles server?</title>
	<meta
		name="description"
		content="A quick, interactive guide to installing a VersaTiles map server in seconds, complete with map data and front end."
	/>
	<meta property="og:title" content="How to setup a VersaTiles server?" />
	<meta
		property="og:description"
		content="A quick, interactive guide to installing a VersaTiles map server in seconds, complete with map data and front end."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://versatiles.org/tools/setup_server" />
	<meta property="og:image" content="https://versatiles.org/tools/images/setup_server.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="How to setup a VersaTiles server?" />
	<meta
		name="twitter:description"
		content="A quick, interactive guide to installing a VersaTiles map server in seconds, complete with map data and front end."
	/>
	<meta name="twitter:image" content="https://versatiles.org/tools/images/setup_server.png" />
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

				{#if selection.coverage?.key === 'bbox'}
					<div class="bbox-map">
						<BBoxMap bind:selectedBBox={selection.bbox} />
					</div>
				{/if}

				{#if selection.coverage}
					{#if sizeEstimates.length > 0}
						<div class="size-estimate">
							<span class="size-label">Estimated download size:</span>
							{#each sizeEstimates as est (est.mapKey)}
								<span class="size-row">
									<span class="size-name">{est.mapLabel}</span>
									<span class="size-value">~ {formatBytes(est.bytes)}</span>
								</span>
							{/each}
							{#if sizeEstimates.length > 1}
								<span class="size-row size-total">
									<span class="size-name">Total</span>
									<span class="size-value">
										~ {formatBytes(sizeEstimates.reduce((s, e) => s + e.bytes, 0))}
									</span>
								</span>
							{/if}
						</div>
					{/if}

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
		<p style="text-align:center; margin-top: 8em; font-size: 0.8em; opacity: 0.7;">
			Copy a shareable link of your current selection:<br />
			<button onclick={copyShareLink} class="check">copy share link</button>
		</p>
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
		font-size: 1.2rem;
	}
	div.options {
		margin: 1rem 0 0.5rem;
	}
	.size-estimate {
		margin: 1rem auto;
		padding: 0.7rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5em;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-width: 400px;
	}
	.size-estimate .size-label {
		opacity: 0.5;
		margin-bottom: 0.15rem;
	}
	.size-estimate .size-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	.size-estimate .size-name {
		opacity: 0.7;
	}
	.size-estimate .size-value {
		font-variant-numeric: tabular-nums;
	}
	.size-estimate .size-total {
		padding-top: 0.35rem;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		font-weight: bold;
	}
	.size-estimate .size-total .size-name {
		opacity: 1;
	}
	.bbox-map {
		width: 80vmin;
		height: 60vmin;
		max-width: 600px;
		max-height: 450px;
		margin: 0.5em auto;
		color-scheme: dark;
		position: relative;
	}
</style>
