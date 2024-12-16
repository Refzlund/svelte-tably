<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface Column<T = unknown, V = unknown> {
		header?: Snippet<[
			/** 
			 * Is true when displaying in the header,
			 * so additional content can be shown if desired,
			 * so the header snippet can be re-used.
			*/
			header?: boolean
		]>
		row: Snippet<[item: T, row: {
			readonly value: V
			readonly isHovered: boolean
			readonly index: number
		}]>
		statusbar?: Snippet
		
		/** Default options for initial table */
		defaults: {
			sticky?: boolean
			sort?: boolean
			show?: boolean
			width?: number
		}
		/** More options */
		options: {
			value?: (item: T) => V
			sorting?: unknown extends V ? (a: T, b: T) => number : (a: V, b: V) => number
		}
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, any>, V = unknown'>

	import { onDestroy, type Snippet } from 'svelte'
	import { getTableState } from './Table.svelte'

	interface Props {
		header?: Column<T, V>['header']
		row: Column<T, V>['row']
		statusbar?: Column<T, V>['statusbar']

		id: string

		// options
		sticky?: boolean
		sort?: boolean
		show?: boolean
		width?: number
		value?: Column<T, V>['options']['value']
		sorting?: Column<T, V>['options']['sorting']
	}

	let { 
		header, row, statusbar, id,
		
		sticky = false,
		sort = false, 
		show = true,
		width,

		value, sorting
	}: Props = $props()

	const column: Column<T, V> = $state({
		header,
		row,
		statusbar,
		defaults: {
			sticky,
			sort,
			show,
			width
		},
		options: {
			value,
			sorting
		}
	})

	const table = getTableState()
	table.addColumn(id, column as Column)

	onDestroy(() => {
		table.removeColumn(id)
	})

</script>
<!---------------------------------------------------->





<!---------------------------------------------------->
<style lang='postcss'>
	
	

</style>