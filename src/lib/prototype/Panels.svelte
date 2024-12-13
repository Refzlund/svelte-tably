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
		[key: string]: Snippet<[table: TableState]>
	}

	let panels: Props = $props()

	getTableState().panels = panels

</script>
<!---------------------------------------------------->