<!-- FormOption.svelte -->
<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';

	export let group: string;
	export let value: string;
	export let title: string;
	export let onChange: ChangeEventHandler<HTMLInputElement>;
</script>

<label>
	<input on:change={onChange} type="radio" name={group} {value} />
	{title}
</label>

<style>
	/* Add your styles here */
	label {
		display: flex;
		align-items: center;
		cursor: pointer;
	}
	input {
		margin-right: 0.5em;
	}
</style>
