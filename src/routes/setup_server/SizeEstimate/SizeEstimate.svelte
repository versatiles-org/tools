<script lang="ts">
	import { base } from '$app/paths';
	import { estimateDownloadSizes, formatBytes, type SizeEstimate } from '../estimate_size';
	import type { BBox, OptionCoverage, OptionMap } from '../options';

	let {
		maps,
		coverage,
		bbox
	}: {
		maps: OptionMap[];
		coverage: OptionCoverage;
		bbox?: BBox;
	} = $props();

	let sizeEstimates = $state<SizeEstimate[]>([]);

	$effect(() => {
		const sortedMaps = maps.slice().sort((a, b) => a.label.localeCompare(b.label));
		const coverageKey = coverage.key;
		const currentBbox = bbox;

		if (sortedMaps.length === 0) {
			sizeEstimates = [];
			return;
		}

		const timer = setTimeout(() => {
			estimateDownloadSizes(sortedMaps, coverageKey, base, currentBbox)
				.then((estimates) => {
					sizeEstimates = estimates;
				})
				.catch(() => {
					sizeEstimates = [];
				});
		}, 50);

		return () => clearTimeout(timer);
	});
</script>

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

<style>
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
</style>
