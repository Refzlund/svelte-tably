<!-- @component

	Expandable row component for svelte-tably.
	Allows rows to be expanded to show additional content.

@example
```svelte
<Table data={items}>
	{#snippet content({ Expandable })}
		<Expandable chevron="always">
			{#snippet content(item)}
				<p>Details for {item.name}</p>
			{/snippet}
		</Expandable>
	{/snippet}
</Table>
```

-->

<script lang='ts'>
	import { onDestroy } from 'svelte'
	import { ExpandableState, type ExpandableProps } from './expandable-state.svelte.js'
	import { getTableContext } from '../table/table-state.svelte.js'

	type T = $$Generic

	type $$Props = ExpandableProps<T>
	let expandable = $origin.component(ExpandableState<T>())

	// Get table context during component initialization (MUST be synchronous)
	// getContext must be called during component init, not in onMount
	const tableFromContext = getTableContext<T>()

	// Initialize immediately during component initialization
	if (typeof expandable.init === 'function') {
		expandable.init(tableFromContext)
	}

	onDestroy(() => {
		if (typeof expandable.cleanup === 'function') {
			expandable.cleanup()
		}
	})
</script>
