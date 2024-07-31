<!-- BBoxMap.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { type Point } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { BBox, BBoxDrag } from './BBoxMap';
	import { getBBoxDrag, getBBoxGeometry, getCursor, loadBBoxes } from './BBoxMap';
	import AutoComplete from '$lib/AutoComplete/AutoComplete.svelte';

	let bboxes: { key: string; value: BBox }[];
	let container: HTMLDivElement;
	const worldBBox: BBox = [-180, -85, 180, 85];
	export let selectedBBox: BBox = worldBBox;
	let map: maplibregl.Map; // Declare map instance at the top level

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: 'https://tiles.versatiles.org/assets/styles/colorful.json',
			bounds: selectedBBox,
			renderWorldCopies: false,
			dragRotate: false,

			attributionControl: { compact: false }
		});

		const canvas = map.getCanvasContainer();

		map.on('load', () => {
			map.addSource('bbox', { type: 'geojson', data: getBBoxGeometry(selectedBBox) });
			map.addLayer({
				id: 'bbox-line',
				type: 'line',
				source: 'bbox',
				filter: ['==', '$type', 'LineString'],
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#000000', 'line-width': 0.5 }
			});
			map.addLayer({
				id: 'bbox-fill',
				type: 'fill',
				source: 'bbox',
				filter: ['==', '$type', 'Polygon'],
				paint: { 'fill-color': '#000000', 'fill-opacity': 0.2 }
			});

			loadBBoxes((entries) => {
				bboxes = entries;
			});
		});

		function getDrag(point: Point): BBoxDrag {
			const { x: x0, y: y1 } = map.project([selectedBBox[0], selectedBBox[1]]);
			const { x: x1, y: y0 } = map.project([selectedBBox[2], selectedBBox[3]]);
			return getBBoxDrag(point, [x0, y0, x1, y1]);
		}

		let lastDrag: BBoxDrag = false;
		map.on('mousemove', (e) => {
			const drag = getDrag(e.point);
			if (drag === lastDrag) return;
			lastDrag = drag;
			canvas.style.cursor = getCursor(drag) || 'grab';
		});

		return () => {
			map.remove();
		};
	});

	// Reactive statement to update bbox source data when selectedBBox changes
	$: {
		if (map && map.getSource('bbox')) {
			if (!selectedBBox) selectedBBox = worldBBox;

			const bboxSource = map.getSource('bbox') as maplibregl.GeoJSONSource;
			bboxSource.setData(getBBoxGeometry(selectedBBox));
			const transform = map.cameraForBounds(selectedBBox);
			transform.zoom -= 0.5;
			map.flyTo({
				...transform,
				essential: true,
				speed: 5,
				bearing: 0,
				pitch: 0
			});
		}
	}
</script>

<div class="container">
	{#if bboxes}
		<div class="input">
			<AutoComplete
				items={bboxes}
				placeholder="Find country, region or city …"
				bind:selectedValue={selectedBBox}
			/>
		</div>
	{/if}
	<div class="map" bind:this={container}></div>
</div>

<style>
	.container {
		width: 80vmin;
		height: 80vmin;
		margin: auto;
		position: relative;
	}
	.map {
		position: absolute;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
	}
	:global(.maplibregl-ctrl-attrib) {
		background: none;
		color: #000 !important;
		opacity: 0.5;
	}
	.input {
		position: absolute;
		top: 0.5em;
		left: 0.5em;
		right: 0.5em;
		z-index: 10;
	}
</style>
