<!-- FormOptionGroup.svelte -->
<script lang="ts">
	import FormOption from './FormOption.svelte';

	export let group: string;
	export let options: { key: string; title: string }[] = [];
	export let selected: string;

	$: selectedKey = selected;
</script>

<div>
	{#each options as option}
		<FormOption {group} key={option.key} title={option.title} bind:selectedKey={selected} />
	{/each}
</div>

<style>
	div {
		display: flex;
		justify-content: center;
		gap: 1em;
	}
</style>
