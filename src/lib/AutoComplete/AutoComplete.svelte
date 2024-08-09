<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	type T = $$Generic;

	// Component properties
	export let placeholder: string = '';
	export let minChar: number = 0;
	export let maxItems: number = 10;

	// Reactive variables
	export let items: { key: string; value: T }[];
	let isOpen = false;
	let results = [];
	let inputText: string = '';
	let selectedIndex = 0;

	// Escape special characters in search string for use in regex
	const regExpEscape = (s: string) => {
		return s.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
	};

	// Handle input change
	async function onChange() {
		if (inputText.length >= Number(minChar)) {
			filterResults();
			selectedIndex = 0;
			isOpen = true;
		}
	}

	async function onFocus() {
		input.setSelectionRange(0, 1000);
	}

	// Filter results based on search query
	function filterResults() {
		const searchText = inputText.trim();
		const searchTextUpper = inputText.toUpperCase();
		const searchReg = RegExp(regExpEscape(searchText), 'i');
		results = items
			.filter((item) => item.key.toUpperCase().includes(searchTextUpper))
			.slice(0, maxItems)
			.map((item) => ({ ...item, label: item.key.replace(searchReg, '<span>$&</span>') }));
	}

	// Handle keyboard navigation
	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' && selectedIndex < results.length - 1) {
			selectedIndex += 1;
		} else if (event.key === 'ArrowUp' && selectedIndex > 0) {
			selectedIndex -= 1;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			close(selectedIndex);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	// Close the autocomplete and select an item
	function close(index = -1) {
		isOpen = false;
		selectedIndex = -1;
		if (input) {
			input.blur();
		}
		if (index > -1 && results[index]) {
			const { key, value } = results[index];
			inputText = key;
			dispatch('change', JSON.parse(JSON.stringify(value)));
		}
	}

	// References to DOM elements
	let input: HTMLInputElement;
	let list: HTMLDivElement;
</script>

<svelte:window on:click={() => close()} />

<div class="autocomplete">
	<input
		type="text"
		bind:value={inputText}
		{placeholder}
		autocomplete="off"
		on:input={onChange}
		on:keydown={onKeyDown}
		on:focusin={onFocus}
		on:click={(e) => e.stopPropagation()}
		bind:this={input}
	/>
	<div class="autocomplete-results{!isOpen ? ' hide-results' : ''}" bind:this={list}>
		{#each results as result, i}
			<button on:click={() => close(i)} class={i === selectedIndex ? ' is-active' : ''}>
				{@html result.label}
			</button>
		{/each}
	</div>
</div>

<style>
	* {
		box-sizing: border-box;
		line-height: normal;
	}

	.autocomplete {
		position: relative;
		border-radius: 0.5em;
		background: rgba(0, 0, 0, 0.8);
	}

	input {
		width: 100%;
		display: block;
		padding: 0.3em 0.6em;
		border: none;
		background: none;
	}

	.hide-results {
		display: none;
	}

	.autocomplete-results {
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		width: 100%;
		z-index: 100;
	}

	button {
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		border: none;
		display: block;
		background: transparent;
		font-weight: normal;
		color: rgba(255, 255, 255, 0.5);
		width: 100%;
		text-align: left;
	}

	button > :global(span) {
		color: rgba(255, 255, 255, 1);
	}

	button.is-active,
	button:hover {
		background-color: #444;
	}
</style>
