<!-- FormOption.svelte -->
<script lang="ts">
	type Option = { key: string; title: string };

	export let group: string;
	export let option: Option;
	export let selectedOption: Option;

	function handleChange(event: Event) {
		selectedOption = option;
	}
</script>

<label class:selected={selectedOption?.key === option.key}>
	<input on:change={handleChange} type="radio" name={group} value={option.key} />
	{option.title}
</label>

<style>
	label {
		cursor: pointer;
		padding: 0.5em 1em;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
		margin-bottom: 10px;
		user-select: none;
	}
	input {
		display: none;
	}
	label.selected {
		background-color: rgba(255, 255, 255, 1) !important;
		color: #000;
	}
	label:hover {
		background-color: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
