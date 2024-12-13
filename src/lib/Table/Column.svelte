<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface Column<T = unknown, V = unknown> {
		header: Snippet
		row: Snippet<[item: T, value?: V]>
		statusbar?: Snippet<[data: T[]]>
		
		/** Default options for initial table */
		defaults: {
			sticky?: boolean
			sort?: boolean
			show?: boolean
		}
		/** More options */
		options: {
			value?: (item: T) => V
			sorting?: unknown extends V ? (a: T, b: T) => number : (a: V, b: V) => number
		}
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, any>, V'>

	import { onDestroy, type Snippet } from 'svelte'
	import { getTableState } from './Table.svelte'

	interface Props {
		header: Column<T, V>['header']
		row: Column<T, V>['row']
		statusbar?: Column<T, V>['statusbar']

		// options
		sticky?: boolean
		sort?: boolean
		show?: boolean
		value?: Column<T, V>['options']['value']
		sorting?: Column<T, V>['options']['sorting']
	}

	let { 
		header, row, statusbar, 
		
		sticky = false,
		sort = false, 
		show = true,

		value, sorting,

		...rest
	}: Props = $props()
	const key = (rest as unknown as { __key: string }).__key

	const column: Column<T, V> = $state({
		header,
		row,
		statusbar,
		defaults: {
			sticky,
			sort,
			show
		},
		options: {
			value,
			sorting
		}
	})

	const table = getTableState()
	table.addColumn(key, column as Column)

	onDestroy(() => {
		table.removeColumn(key)
	})

</script>
<!---------------------------------------------------->





<!---------------------------------------------------->
<style lang='postcss'>
	
	

</style>