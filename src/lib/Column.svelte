<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang="ts">
	export type RowCtx<V> = {
		readonly value: V
		readonly isHovered: boolean
		readonly index: number
		selected: boolean
	}

	export interface ColumnProps<T, V> {
		header?: Snippet<
			[
				/**
				 * Is true when displaying in the header,
				 * so additional content can be shown if desired,
				 * so the header snippet can be re-used.
				 */
				header?: boolean
			]
		>
		row: Snippet<[item: T, row: RowCtx<V>]>
		statusbar?: Snippet

		id: string

		// options
		/**
		 * Is this column sticky by default?
		 * @default false
		*/
		sticky?: boolean
		/** 
		 * Fixed is like sticky, but in its own category — meant to not be moved/hidden ex. select-boxes
		 * @default false
		*/
		fixed?: boolean
		/**
		 * Is this column sorted by default?
		 * @default false
		*/
		sort?: boolean
		/**
		 * Is this column visible by default?
		 * @default true
		 */
		show?: boolean
		/**
		 * The width of the column in pixels by default
		 * @default 150
		 */
		width?: number
		/**
		 * The value of the row. Required for sorting/filtering
		 * @example row => row.name
		*/
		value?: (item: T) => V
		/**
		 * Makes the column sortable. Sorts based of a sorting function.
		 * 
		 * **Important**   `value`-attribute is required adjacent to this.
		 * 
		 * If `true` uses the default `.sort()` algorithm.
		 * 
		 * @default false
		*/
		sorting?: boolean | ((a: V, b: V) => number)
		/**
		 * Is this column resizeable?  
		 * Can not be resized if Table is marked as `resizeable={false}` 
		 * @default true
		*/
		resizeable?: boolean

		/**
		 * Optional: Provide the table it is a part of
		*/
		table?: TableState
	}

	export interface ColumnState<T = unknown, V = unknown, C extends ColumnProps<T, V> = ColumnProps<T, V>> {
		id: C['id']
		header?: C['header']
		row: C['row']
		statusbar?: C['statusbar']

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
			value?: C['value']
			sorting?: boolean | ((a: any, b: any) => number)
			resizeable: boolean
		}
	}
</script>

<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte'
	import { getTableState, type TableState } from './Table.svelte'

	type T = $$Generic<Record<PropertyKey, any>>
	type V = $$Generic

	let {
		header,
		row,
		statusbar,
		id,

		sticky = false,
		fixed = false,
		sort = false,
		show = true,
		width,

		resizeable = true,
		value,
		sorting,

		table
	}: ColumnProps<T, V> = $props()

	const column: ColumnState<T, V> = $state({
		id,
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
	table.addColumn(id, column as ColumnState)

	onDestroy(() => {
		table.removeColumn(id)
	})
</script>
