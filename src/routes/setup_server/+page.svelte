<script lang="ts">
	import CodeBlock from '../../lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from './components/FormOptionGroup.svelte';
	import PageMeta from '../../lib/PageMeta/PageMeta.svelte';
	import { BBoxMap } from '@versatiles/svelte';
	import { generateCode } from './generate_code';
	import { clampZoom, decodeHash, encodeHash, MAX_ZOOM_LIMIT, MIN_ZOOM_LIMIT } from './hash';
	import {
		DEFAULT_PORT,
		EXAMPLE_DOMAIN,
		EXAMPLE_EMAIL,
		isValidDomain,
		isValidEmail,
		parsePort
	} from './server_settings';
	import SizeEstimate from './components/SizeEstimate.svelte';
	import type { SetupState } from './types';
	import { onMount } from 'svelte';
	import '../../style/default.css';

	import {
		defaultFrontend,
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
		minZoom: undefined,
		maxZoom: undefined,
		frontend: defaultFrontend
	});

	onMount(() => {
		if (window.location.hash) {
			const { os, method, maps, coverage, bbox, minZoom, maxZoom, frontend } = decodeHash(
				window.location.hash
			);
			if (os) {
				selection.os = optionsOS.find((o) => o.key === os);
				if (selection.os && method)
					selection.method = optionsMethod(selection.os.key).find((m) => m.key === method);
			}
			if (maps) selection.maps = optionsMap.filter((m) => maps.includes(m.key));
			if (coverage) selection.coverage = optionsCoverage.find((c) => c.key === coverage);
			if (bbox) selection.bbox = bbox;
			if (minZoom !== undefined) {
				selection.minZoom = minZoom;
				minZoomInput = minZoom;
			}
			if (maxZoom !== undefined) {
				selection.maxZoom = maxZoom;
				maxZoomInput = maxZoom;
			}
			if (frontend) selection.frontend = optionsFrontend.find((f) => f.key === frontend);
		}
	});

	$effect(() => {
		if (selection.os && selection.method) {
			const validMethods = optionsMethod(selection.os.key);
			if (!validMethods.some((m) => m.key === selection.method!.key)) {
				selection.method = undefined;
			}
		}
	});

	// Local mirrors for the zoom inputs so what the user types is what's
	// displayed (no caret jumps from echoing back a clamped/truncated number
	// mid-typing). Synced from selection on hash-decode; pushed back on commit.
	// For `type="number"` inputs Svelte binds a number, or null while empty.
	type NumberInput = number | null;
	let minZoomInput = $state<NumberInput>(null);
	let maxZoomInput = $state<NumberInput>(null);

	function commitZoom(raw: NumberInput): number | undefined {
		if (raw === null || Number.isNaN(raw)) return undefined;
		return clampZoom(raw);
	}

	function onMinZoomCommit() {
		selection.minZoom = commitZoom(minZoomInput);
		minZoomInput = selection.minZoom ?? null;
	}

	function onMaxZoomCommit() {
		selection.maxZoom = commitZoom(maxZoomInput);
		maxZoomInput = selection.maxZoom ?? null;
	}

	let zoomError = $derived(
		selection.minZoom !== undefined &&
			selection.maxZoom !== undefined &&
			selection.minZoom > selection.maxZoom
			? 'Min zoom must be ≤ max zoom'
			: undefined
	);

	// Zoom only applies when (a) the user picked a custom region AND (b) the
	// install method's download path supports zoom flags. versatiles-nginx
	// doesn't expose MIN_ZOOM/MAX_ZOOM env vars, so hide the inputs for it.
	let zoomApplies = $derived(
		selection.coverage?.key === 'bbox' && selection.method?.key !== 'docker_nginx'
	);

	// "Custom region" without a drawn rectangle isn't a complete selection —
	// without this guard the script silently falls back to a planet-wide curl
	// and the size estimate shows the full-extent number.
	let coverageReady = $derived(
		selection.coverage?.key === 'global' ||
			(selection.coverage?.key === 'bbox' && selection.bbox !== undefined)
	);

	// Server settings are a helper for the code block only: they replace example
	// values in the generated code, are all optional and are not part of the
	// share link. Docker with Nginx needs ports 80 and 443 for its certificate,
	// so it takes a domain and an email address where the others take a port.
	let domainInput = $state('');
	let emailInput = $state('');
	let portInput = $state('');
	let usesDomain = $derived(selection.method?.key === 'docker_nginx');

	let domain = $derived(isValidDomain(domainInput.trim()) ? domainInput.trim() : undefined);
	let email = $derived(isValidEmail(emailInput.trim()) ? emailInput.trim() : undefined);
	let port = $derived(parsePort(portInput.trim()));

	// An error is only shown once the user has left the field, not while typing.
	let focusedSetting = $state<'domain' | 'email' | 'port' | undefined>(undefined);
	let settingsError = $derived.by(() => {
		if (usesDomain) {
			if (domainInput.trim() && !domain && focusedSetting !== 'domain')
				return `Enter a domain name like ${EXAMPLE_DOMAIN}`;
			if (emailInput.trim() && !email && focusedSetting !== 'email')
				return `Enter an email address like ${EXAMPLE_EMAIL}`;
		} else if (portInput.trim() && !port && focusedSetting !== 'port') {
			return 'Port must be a number between 1 and 65535';
		}
		return undefined;
	});

	let code: string | undefined = $derived.by(() => {
		if (zoomError) return undefined;
		if (!coverageReady) return undefined;
		return generateCode({ ...selection, domain, email, port });
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

<PageMeta
	title="Set up your own VersaTiles server"
	description="An interactive guide to setting up a VersaTiles map server with map data and a frontend."
	path="setup_server"
	image="https://versatiles.org/tools/images/setup_server.png"
/>

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
			{#if !selection.bbox}
				<p class="hint draw-prompt">Draw a rectangle on the map to define your region.</p>
			{/if}
		{/if}
	{/if}

	{#if selection.os && selection.method && selection.maps.length > 0 && selection.coverage}
		{#if zoomApplies}
			<p class="subheading">Zoom range <span class="optional">(optional)</span></p>
			<div class="zoom-range">
				<label>
					<span>Min zoom</span>
					<input
						type="number"
						min={MIN_ZOOM_LIMIT}
						max={MAX_ZOOM_LIMIT}
						step="1"
						placeholder="auto"
						bind:value={minZoomInput}
						onchange={onMinZoomCommit}
						onblur={onMinZoomCommit}
					/>
				</label>
				<label>
					<span>Max zoom</span>
					<input
						type="number"
						min={MIN_ZOOM_LIMIT}
						max={MAX_ZOOM_LIMIT}
						step="1"
						placeholder="auto"
						bind:value={maxZoomInput}
						onchange={onMaxZoomCommit}
						onblur={onMaxZoomCommit}
					/>
				</label>
			</div>
			{#if zoomError}
				<p class="hint input-error">{zoomError}</p>
			{/if}
		{/if}

		{#if coverageReady}
			<div class="hint">
				<SizeEstimate
					maps={selection.maps}
					coverage={selection.coverage}
					bbox={selection.bbox}
					minZoom={zoomApplies ? selection.minZoom : undefined}
					maxZoom={zoomApplies ? selection.maxZoom : undefined}
				/>
			</div>
		{/if}

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
		<div class="server-settings">
			{#if usesDomain}
				<label>
					<span>Domain <span class="optional">(optional)</span></span>
					<input
						type="text"
						class="wide"
						placeholder={EXAMPLE_DOMAIN}
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						bind:value={domainInput}
						onfocus={() => (focusedSetting = 'domain')}
						onblur={() => (focusedSetting = undefined)}
					/>
				</label>
				<label>
					<span>Email <span class="optional">(optional)</span></span>
					<input
						type="email"
						class="wide"
						placeholder={EXAMPLE_EMAIL}
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						bind:value={emailInput}
						onfocus={() => (focusedSetting = 'email')}
						onblur={() => (focusedSetting = undefined)}
					/>
				</label>
			{:else}
				<label>
					<span>Port <span class="optional">(optional)</span></span>
					<input
						type="text"
						inputmode="numeric"
						placeholder={DEFAULT_PORT.toString()}
						autocomplete="off"
						bind:value={portInput}
						onfocus={() => (focusedSetting = 'port')}
						onblur={() => (focusedSetting = undefined)}
					/>
				</label>
			{/if}
		</div>
		{#if settingsError}
			<p class="hint input-error">{settingsError}</p>
		{/if}
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
	.subheading {
		margin: 1.25rem 0 0;
		font-size: 1rem;
		font-weight: normal;
		text-align: center;
		opacity: 0.85;
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
	.zoom-range,
	.server-settings {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
		justify-content: center;
		margin: 1rem 0 0.5rem;
	}
	.server-settings {
		margin-bottom: 1.5rem;
	}
	.zoom-range label,
	.server-settings label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.9em;
		align-items: center;
	}
	.zoom-range input,
	.server-settings input {
		width: 5rem;
		padding: 0.3rem 0.5rem;
		background: transparent;
		color: inherit;
		border: 1px solid #888;
		border-radius: 4px;
		font: inherit;
		text-align: center;
	}
	.optional {
		font-weight: normal;
		font-size: 0.85em;
		opacity: 0.6;
	}
	.server-settings input.wide {
		width: 14rem;
		max-width: 100%;
	}
	.input-error {
		color: #e88;
		opacity: 1;
	}
	.draw-prompt {
		opacity: 0.8;
		font-style: italic;
	}
</style>
