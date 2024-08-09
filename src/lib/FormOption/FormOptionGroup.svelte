<script lang="ts">
	type Option = { key: string; title: string };

	export let options: Option[] = [];
	export let selectedOption: Option = undefined;

	// Reactive statement to reset selectedOption when options change
	$: if (!options.find((option) => option.key === selectedOption?.key)) {
		selectedOption = undefined;
	}

	function handleChange(option: Option) {
		if (selectedOption !== option) selectedOption = option;
	}
</script>

<div>
	{#each options as option}
		<button
			class:selected={selectedOption?.key === option.key}
			on:click={() => handleChange(option)}
		>
			{option.title}
		</button>
	{/each}
</div>

<style>
	div {
		display: flex;
		justify-content: center;
		gap: 1em;
	}

	button {
		cursor: pointer;
		padding: 0.5em 1em;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
		background-color: transparent;
		color: #fff;
		user-select: none;
		font-size: 1rem;
	}

	button.selected {
		background-color: rgba(255, 255, 255, 1) !important;
		color: #000;
	}

	button:hover {
		background-color: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.8);
	}
</style>
