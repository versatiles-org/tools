<!-- FormOptionGroup.svelte -->
<script lang="ts">
	import FormOption from './FormOption.svelte';

	export let group;
	export let options: { key: string; title: string }[] = [];
	export let onChange: (key: string) => void;

	function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		onChange(event.currentTarget.value);
	}
</script>

{#each options as option}
	<FormOption {group} value={option.key} title={option.title} onChange={handleChange} />
{/each}

<style>
	/* Add your styles here */
	:global(form) {
		margin-bottom: 1em;
	}
</style>
