<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';
	export type Option = {
		key: string;
		label: string;
		hint?: string;
		selected?: boolean;
		small?: boolean;
	};
</script>

<script lang="ts" generics="MyOption extends Option">
	const {
		options,
		multiselect = false,
		initialSelection = undefined,
		onselect,
		onmultiselect
	}: {
		options: MyOption[];
		multiselect?: boolean;
		initialSelection?: MyOption | MyOption[];
		onmultiselect?: (options: MyOption[]) => void;
		onselect?: (options: MyOption | undefined) => void;
	} = $props();

	let lookup = new Map<string, MyOption>(options.map((o) => [o.key, o]));
	let selection = new SvelteSet<string>();

	// Filter big and small options
	const bigOptions: MyOption[] = [];
	const smallOptions: MyOption[] = [];

	for (const option of options) {
		if (option.small) {
			smallOptions.push(option);
		} else {
			bigOptions.push(option);
		}
		if (!initialSelection && option.selected) {
			selection.add(option.key);
		}
	}

	if (initialSelection) {
		if (Array.isArray(initialSelection)) {
			for (const option of initialSelection) {
				selection.add(option.key);
			}
		} else {
			selection.add(initialSelection.key);
		}
	}

	if (selection.size > 0) {
		if (multiselect) {
			onmultiselect?.(getMultiSelection());
		} else {
			onselect?.(getSingleSelection());
		}
	} else {
		if (multiselect) {
			onmultiselect?.([]);
		} else {
			onselect?.(undefined);
		}
	}

	function handleClick(option: MyOption) {
		if (multiselect) {
			if (selection.has(option.key)) {
				selection.delete(option.key);
			} else {
				selection.add(option.key);
			}
			onmultiselect?.(getMultiSelection());
		} else {
			selection.clear();
			selection.add(option.key);
		}
		onselect?.(lookup.get(option.key));
	}

	function getSingleSelection(): MyOption | undefined {
		return selection.size === 1 ? lookup.get(selection.values().next().value!) : undefined;
	}

	function getMultiSelection(): MyOption[] {
		return Array.from(selection)
			.map((key) => lookup.get(key))
			.filter((e) => e != undefined) as MyOption[];
	}
</script>

{#snippet button(option: MyOption)}
	<button
		class:selected={selection.has(option.key)}
		aria-pressed={selection.has(option.key)}
		onclick={() => handleClick(option)}
	>
		{option.label}
	</button>
{/snippet}

{#key selection}
	{#if bigOptions.length > 0}
		<div class="options">
			{#each bigOptions as option (option.key)}
				{@render button(option)}
			{/each}
		</div>
	{/if}

	{#if smallOptions.length > 0}
		<div class="options small">
			{#each smallOptions as option (option.key)}
				{@render button(option)}
			{/each}
		</div>
	{/if}

	{#if !multiselect && getSingleSelection()?.hint}
		<p class="small">{getSingleSelection()!.hint}</p>
	{/if}
{/key}

<style>
	:root {
		--button-padding: 0.5em 1em;
		--button-border-radius: 0.5em;
		--button-border-color: rgba(255, 255, 255, 0.2);
		--button-bg-color: transparent;
		--button-color: #fff;
		--button-font-size: 1em;
		--button-hover-bg-color: rgba(255, 255, 255, 0.2);
		--button-hover-border-color: rgba(255, 255, 255, 0.8);
		--button-selected-bg-color: rgba(255, 255, 255, 1);
		--button-selected-color: #000;
	}

	div.options {
		display: flex;
		justify-content: center;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	div.options.small {
		margin-top: 1em;
		font-size: 0.7em;
	}

	button {
		cursor: pointer;
		padding: var(--button-padding);
		border: 1px solid var(--button-border-color);
		border-radius: var(--button-border-radius);
		background-color: var(--button-bg-color);
		color: var(--button-color);
		user-select: none;
		font-size: var(--button-font-size);
		transition:
			background-color 0.3s,
			border-color 0.3s;
	}

	button.selected {
		background-color: var(--button-selected-bg-color) !important;
		color: var(--button-selected-color);
	}

	button:hover {
		background-color: var(--button-hover-bg-color);
		border-color: var(--button-hover-border-color);
	}

	p.small {
		margin: 1rem;
		font-size: 0.8rem;
		text-align: center;
		opacity: 0.8;
	}
</style>
