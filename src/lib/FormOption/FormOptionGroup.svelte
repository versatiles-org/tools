<!-- FormOptionGroup.svelte -->
<script lang="ts">
	import FormOption from './FormOption.svelte';
	
	type Option = { key: string; title: string };

	export let group: string;
	export let options: Option[] = [];
	export let selectedOption: Option;

</script>

<div>
	{#each options as option}
		<FormOption {group} {option} bind:selectedOption />
	{/each}
</div>

<style>
	div {
		display: flex;
		justify-content: center;
		gap: 1em;
	}
</style>
