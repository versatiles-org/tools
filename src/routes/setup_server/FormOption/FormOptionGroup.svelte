<script lang="ts" module>
	export type Option = {
		key: string;
		label: string;
		hint?: string;
		selected?: boolean;
		small?: boolean;
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

	// Split big/small options once (assumes `options` is static)
	const bigOptions: MyOption[] = [];
	const smallOptions: MyOption[] = [];
	for (const opt of untrack(() => options)) (opt.small ? smallOptions : bigOptions).push(opt);

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

	let singleSelection: MyOption | undefined = $derived(
		selection.size === 1 ? lookup.get(selection.values().next().value!) : undefined
	);
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

	{#if singleSelection?.hint}
		<p class="small">{singleSelection.hint}</p>
	{/if}
{/key}

<style>
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

	p.small {
		margin: 1rem;
		font-size: 0.8rem;
		text-align: center;
		opacity: 0.8;
	}
</style>
