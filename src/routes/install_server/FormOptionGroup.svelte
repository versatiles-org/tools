<!-- FormOptionGroup.svelte -->
<script lang="ts">
	import FormOption from './FormOption.svelte';

	export let group: string;
	export let options: { key: string; title: string }[] = [];
	export let onChange: (key: string) => void;

	let selectedKey = '';

	function handleChange(event: Event) {
		selectedKey = (event.target as HTMLInputElement).value;
		onChange(selectedKey);
	}
</script>

{#each options as option}
	<FormOption
		{group}
		key={option.key}
		title={option.title}
		{selectedKey}
		onChange={handleChange}
	/>
{/each}

<style>
	/* Add your styles here */
	:global(form) {
		margin-bottom: 1em;
	}
</style>
