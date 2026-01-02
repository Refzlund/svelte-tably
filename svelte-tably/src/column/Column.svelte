<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	import type { Snippet } from 'svelte'
	import type { HeaderCtx } from './column-state.svelte.js'

	/** Creates a default header snippet that displays the title string */
	export function getDefaultHeader<T>(title: string): Snippet<[ctx: HeaderCtx<T>]> {
		// Svelte snippets internally receive (anchor, getContext) but the Snippet type
		// abstracts this away. We cast to the expected type.
		return ((anchor: Comment, _getCtx: () => HeaderCtx<T>) => {
			snippetLiteral(defaultHeader)(anchor, () => title)
		}) as unknown as Snippet<[ctx: HeaderCtx<T>]>
	}

	import { snippetLiteral } from '../utility.svelte.js'
</script>

<script lang='ts'>
	import { onMount, onDestroy, untrack } from 'svelte'
	import { ColumnState, type ColumnProps } from './column-state.svelte.js'

	type T = $$Generic
	type V = $$Generic

	type $$Props = ColumnProps<T, V>
	let column = $origin.component(ColumnState<T, V>())

	// Initialize column on mount (runs once)
	onMount(() => {
		if (typeof column.init === 'function') {
			column.init()
		}
	})

	// Workaround for svelte-origin not calling cleanup on component destroy
	onDestroy(() => {
		if (typeof column.cleanup === 'function') {
			column.cleanup()
		}
	})
</script>


{#snippet defaultHeader(title: string)}
	{title}
{/snippet}