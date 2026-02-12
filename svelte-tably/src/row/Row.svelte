<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts' generics='T'>
	import { onDestroy } from 'svelte'
	import { RowState } from './row-state.svelte.js'
	import { getTableContext } from '../table/table-state.svelte.js'

	let row = $origin.component(RowState<T>())

	// Get table context during component initialization (MUST be synchronous)
	// getContext must be called during component init, not in onMount
	const tableFromContext = getTableContext<T>()

	// Initialize immediately during component initialization
	if (typeof row.init === 'function') {
		row.init(tableFromContext)
	}

	onDestroy(() => {
		if (typeof row.cleanup === 'function') {
			row.cleanup()
		}
	})
</script>
