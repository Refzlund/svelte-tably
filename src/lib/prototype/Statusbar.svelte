<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts'>

	import type { Snippet } from 'svelte'
	import { getTableState, type TableState } from './Table.svelte'

	interface Props {
		[key: string]: Snippet<[data: T[]]>
	}

	let statusbars: Props = $props()
	const table = getTableState()
	
	let keys = [] as string[]

	$effect.pre(() => {
		keys.forEach(key => delete table.columns[key].statusbar)
		keys = []
		for(const [key, value] of Object.entries(statusbars)) {
			table.updateColumn(key, { statusbar: value })
			keys.push(key)
		}
	})

</script>
<!---------------------------------------------------->