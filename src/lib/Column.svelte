<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export type RowCtx<V> = {
		readonly value: V
		readonly isHovered: boolean
		readonly index: number
		selected: boolean
	}

	export interface Column<T = unknown, V = unknown> {
		header?: Snippet<[
			/** 
			 * Is true when displaying in the header,
			 * so additional content can be shown if desired,
			 * so the header snippet can be re-used.
			*/
			header?: boolean
		]>
		row: Snippet<[item: T, row: RowCtx<V>]>
		statusbar?: Snippet

		fixed?: boolean
		
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
			resizeable: boolean
		}
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, any>, V = unknown'>

	import { onDestroy, type Snippet } from 'svelte'
	import { getTableState, type TableState } from './Table.svelte'

	interface Props {
		header?: Column<T, V>['header']
		row: Column<T, V>['row']
		statusbar?: Column<T, V>['statusbar']

		id: string

		// options
		sticky?: boolean
		/** Fixed is like sticky, but in its own category — meant to not be moved/hidden ex. select-boxes */
		fixed?: boolean
		sort?: boolean
		show?: boolean
		width?: number
		value?: Column<T, V>['options']['value']
		sorting?: Column<T, V>['options']['sorting']
		/** @default true */
		resizeable?: boolean

		/** Optional: Provide the table it is a part of */
		table?: TableState
	}

	let { 
		header, row, statusbar, id,
		
		sticky = false,
		fixed = false,
		sort = false, 
		show = true,
		width,
		
		resizeable = true,
		value, sorting,

		table
	}: Props = $props()

	const column: Column<T, V> = $state({
		header,
		row,
		statusbar,
		fixed,
		defaults: {
			sticky,
			sort,
			show,
			width
		},
		options: {
			value,
			sorting,
			resizeable
		}
	})

	table ??= getTableState()
	table.addColumn(id, column as Column)

	onDestroy(() => {
		table.removeColumn(id)
	})

</script>