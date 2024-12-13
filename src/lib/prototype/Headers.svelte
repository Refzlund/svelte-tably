<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang="ts">
	import type { Snippet } from 'svelte'
	import { getTableState, type ColumnOptions } from '../Table.svelte'

	interface Props {
		[key: string]: Snippet<[options: ColumnOptions]>
	}

	let headers: Props = $props()
	const table = getTableState()

	let keys = [] as string[]

	$effect.pre(() => {
		keys.forEach((key) => delete table.columns[key].header)
		keys = []

		for (const [key, value] of Object.entries(headers)) {
			table.updateColumn(key, { header: value })
			keys.push(key)
		}
	})
</script>
