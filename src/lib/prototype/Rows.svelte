<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import type { Snippet } from 'svelte'
	import { getTableState } from './Table.svelte'

	interface Props {
		[key: string]: Snippet<[data: T]>
	}

	let rows: Props = $props()
	const table = getTableState<T>()
	
	let keys = [] as string[]

	$effect.pre(() => {
		keys.forEach(key => delete table.columns[key].row)
		keys = []

		for(const [key, value] of Object.entries(rows)) {
			table.updateColumn(key, { row: value })
			keys.push(key)
		}
	})

</script>