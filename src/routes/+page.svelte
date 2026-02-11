<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>VersaTiles Tools</h1>
<p>We've prepared some tools to help you get started with VersaTiles:</p>

<div class="tools">
	<a class="tool" href={resolve('/setup_server')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<rect x="2" y="3" width="20" height="6" rx="1" />
			<rect x="2" y="13" width="20" height="6" rx="1" />
			<circle cx="6" cy="6" r="1" fill="currentColor" />
			<circle cx="6" cy="16" r="1" fill="currentColor" />
			<line x1="10" y1="6" x2="18" y2="6" />
			<line x1="10" y1="16" x2="18" y2="16" />
		</svg>
		<span class="title">Server Setup Guide</span>
		<span class="description"
			>Step-by-step instructions to install and run a VersaTiles map server with map data and
			frontend.</span
		>
	</a>

	<a class="tool" href={resolve('/bounding_box')}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M3 7V3h4" />
			<path d="M17 3h4v4" />
			<path d="M21 17v4h-4" />
			<path d="M7 21H3v-4" />
			<circle cx="12" cy="10" r="3" />
			<path d="M12 13v4" />
		</svg>
		<span class="title">Bounding Box Picker</span>
		<span class="description"
			>Select a geographic region on the map and copy its bounding box coordinates.</span
		>
	</a>

	<a class="tool" href="https://tiles.versatiles.org" target="_blank" rel="noopener noreferrer">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M12 2L2 7l10 5 10-5-10-5z" />
			<path d="M2 17l10 5 10-5" />
			<path d="M2 12l10 5 10-5" />
		</svg>
		<span class="title">Map Style Editor</span>
		<span class="description"
			>Build, preview and export a custom map style for your VersaTiles server.</span
		>
	</a>
</div>

<style>
	h1 {
		text-align: center;
	}

	p {
		text-align: center;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
		margin-bottom: 2rem;
	}

	.tools {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1.5rem;
	}

	a.tool {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.3));
		background: rgba(255, 255, 255, 0.05);
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	a.tool:hover {
		border-color: var(--color-accent-fg, rgba(255, 255, 255, 0.6));
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	a.tool svg {
		width: 2.5rem;
		height: 2.5rem;
		margin-bottom: 1rem;
		color: var(--color-accent-fg, #2f81f7);
		transition: color 0.2s ease;
	}

	a.tool:hover svg {
		color: var(--color-fg-default, #e6edf3);
	}

	.title {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.description {
		font-size: 0.9rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
		line-height: 1.4;
	}
</style>
