<!-- FormOption.svelte -->
<script lang="ts">
	export let group: string;
	export let key: string;
	export let title: string;
	export let selectedKey: string;

	function handleChange(event: Event) {
		selectedKey = (event.target as HTMLInputElement).value;
	}
</script>

<label class:selected={selectedKey === key}>
	<input on:change={handleChange} type="radio" name={group} value={key} bind:group={selectedKey} />
	{title}
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
