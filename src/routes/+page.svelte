<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>VersaTiles Tools</h1>
<p>We've prepared some tools to help you get started with VersaTiles:</p>
<a class="tool" href={resolve('/setup_server')}>
	<span class="title">Setup a new VersaTiles server</span><br />
	A quick, interactive guide to installing a VersaTiles map server in seconds, complete with map data
	and front end.
</a>

<a class="tool" href={resolve('/bounding_box')}>
	<span class="title">Find a bounding box</span>
</a>

<a class="tool" href="https://tiles.versatiles.org" target="_blank" rel="noopener noreferrer">
	<span class="title">Build a map style</span><br />
	Create and export a custom map style using the VersaTiles style editor.
</a>

<style>
	a.tool {
		display: block;
		margin: 2rem 0;
		padding: 2rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.05);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	a.tool:hover {
		border-color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.title {
		font-size: 1.2rem;
		display: block;
		text-align: center;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}
</style>
