<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
</script>

<script lang='ts' generics='T, V'>
	import { onMount, onDestroy, untrack } from 'svelte'
	import { ColumnState } from './column-state.svelte.js'

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


