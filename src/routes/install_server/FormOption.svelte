<!-- FormOption.svelte -->
<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';

	export let group: string;
	export let key: string;
	export let title: string;
	export let selectedKey: string;
	export let onChange: ChangeEventHandler<HTMLInputElement>;
</script>

<label class:selected={selectedKey === key}>
	<input on:change={onChange} type="radio" name={group} value={key} />
	{title}
</label>

<style>
	label {
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 10px 20px;
		border: 2px solid #ccc;
		border-radius: 5px;
		margin-bottom: 10px;
		user-select: none;
	}
	input {
		display: none;
	}
	label.selected {
		background-color: #007bff;
		color: white;
		border-color: #007bff;
	}
</style>
