<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from './components/FormOptionGroup.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import { generateCode } from './generate_code';
	import { decodeHash, encodeHash } from './hash';
	import SizeEstimate from './components/SizeEstimate.svelte';
	import type { SetupState } from './types';
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
	<title>Set up your own VersaTiles server</title>
	<meta
		name="description"
		content="An interactive guide to setting up a VersaTiles map server with map data and a frontend."
	/>
	<meta property="og:title" content="Set up your own VersaTiles server" />
	<meta
		property="og:description"
		content="An interactive guide to setting up a VersaTiles map server with map data and a frontend."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://versatiles.org/tools/setup_server" />
	<meta property="og:image" content="https://versatiles.org/tools/images/setup_server.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Set up your own VersaTiles server" />
	<meta
		name="twitter:description"
		content="An interactive guide to setting up a VersaTiles map server with map data and a frontend."
	/>
	<meta name="twitter:image" content="https://versatiles.org/tools/images/setup_server.png" />
</svelte:head>

<section class="form">
	<h1>Set up your own VersaTiles server</h1>

	<h2>1. Select your operating system</h2>
	<div class="options">
		<FormOptionGroup options={optionsOS} bind:value={selection.os} />
	</div>

	{#if selection.os}
		{#key selection.os}
			<h2>2. Select an installation method</h2>
			<div class="options">
				<FormOptionGroup options={optionsMethod(selection.os.key)} bind:value={selection.method} />
			</div>
		{/key}
	{/if}

	{#if selection.os && selection.method}
		<h2>3. Select map data</h2>
		<div class="options">
			<FormOptionGroup
				options={optionsMap}
				allowMultiselect={true}
				bind:valueList={selection.maps}
			/>
		</div>
	{/if}

	{#if selection.os && selection.method && selection.maps.length > 0}
		<h2>4. Select coverage area</h2>
		<div class="options">
			<FormOptionGroup options={optionsCoverage} bind:value={selection.coverage} />
		</div>

		{#if selection.coverage?.key === 'bbox'}
			<div class="bbox-map">
				<BBoxMap bind:selectedBBox={selection.bbox} />
			</div>
		{/if}
	{/if}

	{#if selection.os && selection.method && selection.maps.length > 0 && selection.coverage}
		<p class="hint">
			<SizeEstimate maps={selection.maps} coverage={selection.coverage} bbox={selection.bbox} />
		</p>

		<h2>5. Add a frontend</h2>
		<div class="options">
			<FormOptionGroup options={optionsFrontend} bind:value={selection.frontend} />
		</div>
		<p class="hint">
			For an overview of all frontends and their contents, see the <a
				href="https://github.com/versatiles-org/versatiles-frontend/releases/latest/"
				target="_blank"
				rel="noopener noreferrer">latest release</a
			>.
		</p>
	{/if}
</section>

<section>
	{#if code}
		<hr />
		<h2>Review and run these commands in your shell</h2>
		<CodeBlock {code} />
		<p style="text-align:center; margin-top: 8em; font-size: 0.8em; opacity: 0.7;">
			Share your current selection:<br />
			<button onclick={copyShareLink} class="check">copy link</button>
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
	.hint {
		text-align: center;
		font-size: 0.85em;
		opacity: 0.5;
		margin: 1rem 0;
	}
	div.options {
		margin: 1rem 0 0.5rem;
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
