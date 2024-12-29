import { type Snippet } from 'svelte'
import { TableState } from '../table/table.svelte.js'
import type { ItemState } from 'runic-reorder'
import { assign, pick, type AnyRecord } from '../utility.svelte.js'

export type ColumnProps<T extends AnyRecord, V> = (
	& {
		id: string
		table?: TableState<T>
	}
	& ColumnSnippets<T, V>
	& ColumnDefaults<T>
	& ColumnOptions<T, V>
) extends infer K ? {
	[P in keyof K]: K[P]
} : never


type HeaderCtx<T> = {
	readonly data: T[]
	/**
	 * Is true when displaying in the header,
	 * so additional content can be shown if desired,
	 * so the header snippet can be re-used.
	 */
	readonly header?: boolean
}

export type RowCtx<T extends AnyRecord, V> = {
	readonly value: V
	readonly isHovered: boolean
	readonly index: number
	readonly itemState: ItemState<T>
	selected: boolean
}

export type StatusbarCtx<T extends AnyRecord> = {
	readonly data: T[]
}


type ColumnSnippets<T extends AnyRecord, V> = {
	header?: Snippet<[ctx: HeaderCtx<T>]>
	row?: Snippet<[item: T, ctx: RowCtx<T, V>]>
	statusbar?: Snippet<[ctx: StatusbarCtx<T>]>
}

type ColumnDefaults<T> = {
	/**
	 * Is this column sticky by default?
	 * @default false
	*/
	sticky?: boolean
	/**
	 * Is this column visible by default?
	 * @default true
	 */
	show?: boolean
	/**
	 * Is this column sorted by default?
	 * @default false
	*/
	sortby?: boolean
	/**
	 * The width of the column in pixels by default
	 * @default 150
	 */
	width?: number
}

type ColumnOptions<T extends AnyRecord, V> = {
	/**
	 * Fixed is like sticky, but in its own category — meant to not be moved/hidden ex. select-boxes
	 * @default false
	*/
	fixed?: boolean
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
	sort?: boolean | ((a: V, b: V) => number)
	/**
	 * Is this column resizeable?  
	 * Can not be resized if Table is marked as `resizeable={false}` 
	 * @default true
	*/
	resizeable?: boolean
	/**
	 * 
	 * @example (value) => value.includes(search)
	*/
	filter?: (value: V) => boolean
}



export class ColumnState<T extends AnyRecord = any, V = any> {
	#props = {} as ColumnProps<T, V>

	id = $derived(this.#props.id) as string

	/**
	 * Associated table
	*/
	table: TableState<T>

	snippets = $derived({
		header: this.#props.header,
		/** Title is the header-snippet, with header-ctx: `{ header: false }` */
		title: (...args: any[]) => {
			const getData = () => this.table.data.current
			return this.#props.header?.(...[args[0], () => ({ 
				get header() { return false },
				get data() {
					return getData()
				}
			 })] as any[] as [any])
		},
		row: this.#props.row,
		statusbar: this.#props.statusbar
	})

	/** 
	 * Variables that can be saved (e.g. localStorage) 
	 * and re-provided, where these are default-fallbacks
	*/
	defaults = $derived({
		sticky: this.#props.sticky ?? false,
		show: this.#props.show ?? true,
		sortby: this.#props.sortby ?? false,
		width: this.#props.width ?? 150
	})

	/** Static options */
	options = $derived({
		fixed: this.#props.fixed ?? false,
		sort: this.#props.sort ?? false,
		filter: this.#props.filter,
		value: this.#props.value,
		resizeable: this.#props.resizeable ?? true,
	})

	toggleVisiblity() {
		const index = this.table.positions.hidden.indexOf(this)
		if (index > -1) this.table.positions.hidden.splice(index, 1)
		else this.table.positions.hidden.push(this)
	}

	constructor(props: ColumnProps<T, V>) {
		this.#props = props

		this.table = props.table ?? TableState.getContext<T>()!
		if(!this.table) {
			throw new Error('svelte-tably: Column must be associated with a Table')
		}

		const remove = this.table.add(this)
		$effect(() => remove)
	}
}