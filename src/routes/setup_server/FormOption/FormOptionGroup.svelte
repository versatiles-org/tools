<script lang="ts" module>
	export type Option = {
		key: string;
		label: string;
		hint: string;
		selected?: boolean;
	};
</script>

<script lang="ts" generics="MyOption extends Option">
	import '../../../style/button.css';
	import { SvelteSet } from 'svelte/reactivity';
	import { untrack } from 'svelte';
	let {
		options,
		allowMultiselect = false,
		// bind:value   for single‑select
		value = $bindable<MyOption | undefined>(undefined),
		// bind:valueList for multi‑select
		valueList = $bindable<MyOption[]>([])
	}: {
		options: MyOption[];
		allowMultiselect?: boolean;
		value?: MyOption | undefined;
		valueList?: MyOption[];
	} = $props();

	/*───────────────────────────────────────────────────────────────────────
	 * Guard: `allowMultiselect` must never change after mount
	 *───────────────────────────────────────────────────────────────────────*/
	let _lockedAllow = untrack(() => allowMultiselect);
	$effect(() => {
		if (allowMultiselect !== _lockedAllow) {
			throw new Error('FormOptionGroup: `allowMultiselect` cannot be changed after mount');
		}
	});

	/*───────────────────────────────────────────────────────────────────────
	 * Internals
	 *───────────────────────────────────────────────────────────────────────*/
	const lookup = new Map<string, MyOption>(untrack(() => options).map((o) => [o.key, o]));
	const selection = new SvelteSet<string>();

	/*───────────────────────────────────────────────────────────────────────
	 * Keep `selection` in sync with the outward binding
	 *───────────────────────────────────────────────────────────────────────*/
	if (_lockedAllow) {
		$effect(() => {
			selection.clear();
			valueList.forEach((o) => {
				if (lookup.has(o.key)) {
					selection.add(o.key);
				}
			});
		});
	} else {
		$effect(() => {
			selection.clear();
			if (value) {
				selection.add(value.key);
			}
		});
	}

	/*───────────────────────────────────────────────────────────────────────
	 * Click handler – mutates both `selection` and the bindables
	 *───────────────────────────────────────────────────────────────────────*/
	function handleClick(option: MyOption) {
		if (_lockedAllow) {
			// toggle membership
			if (selection.has(option.key)) {
				selection.delete(option.key);
			} else {
				selection.add(option.key);
			}
			// push out new list
			valueList = Array.from(selection)
				.map((k) => lookup.get(k))
				.filter(Boolean) as MyOption[];
		} else {
			value = option;
		}
	}

</script>

{#snippet button(option: MyOption)}
	<button
		class:selected={selection.has(option.key)}
		aria-pressed={selection.has(option.key)}
		onclick={() => handleClick(option)}
	>
		{#if _lockedAllow}<span class="checkbox">{selection.has(option.key) ? '☑' : '☐'}</span>{/if}
		{option.label}
	</button>
{/snippet}

{#key selection}
	<div class="option-list">
		{#each options as option (option.key)}
			{@render button(option)}
			<span class="hint" class:selected={selection.has(option.key)}>{option.hint ?? ''}</span>
		{/each}
	</div>
{/key}

<style>
	.option-list {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1rem;
		align-items: center;
		max-width: 40rem;
		margin: 0 auto;
	}

	.option-list button {
		text-align: left;
	}

	.checkbox {
		margin-right: 0.3em;
	}

	.hint {
		font-size: 0.85em;
		opacity: 0.5;
	}

	.hint.selected {
		opacity: 1;
	}
</style>
