import type { Snippet } from "svelte"
import { getTableContext, type RowCtx } from "../table/table-state.svelte.js"
import { getDefaultHeader } from "./Column.svelte"

// Self-reference type for arrays (defined before ColumnTableRef)
export interface ColumnSelfRef {
	readonly id: string
	toggleVisiblity(): void
}

// Minimal interface for what Column needs from Table
export interface ColumnTableRef {
	dataState: {
		current: unknown[]
		sortBy(column: string): void
	}
	positions: {
		hidden: ColumnSelfRef[]
	}
	add(column: unknown): (() => void) | undefined
}

export interface HeaderCtx<T> {
	readonly data: T[]
	/**
	 * Is true when displaying in the header,
	 * so additional content can be shown if desired,
	 * so the header snippet can be re-used.
	 */
	readonly header?: boolean
}

export interface RowColumnCtx<T, V> extends RowCtx<T> {
	readonly value: V
	readonly columnHovered: boolean
}

export type StatusbarCtx<T> = {
	readonly data: T[]
}

export const ColumnState = <T, V = unknown>() => $origin({
	props: $origin.props({
		id: "" as string,
		header: undefined as Snippet<[ctx: HeaderCtx<T>]> | string | undefined,
		row: undefined as Snippet<[item: T, ctx: RowColumnCtx<T, V>]> | undefined,
		statusbar: undefined as Snippet<[ctx: StatusbarCtx<T>]> | undefined,
		/**
		 * Is this column sticky by default?
		 * @default false
		 */
		sticky: false as boolean,
		/**
		 * Is this column visible by default?
		 * @default true
		 */
		show: true as boolean,
		/**
		 * Is this column sorted by default?
		 * @default false
		 */
		sortby: false as boolean,
		/**
		 * The width of the column in pixels by default
		 * @default 150
		 */
		width: 150 as number,
		/**
		 * Fixed is like sticky, but in its own category	meant to not be moved/hidden ex. select-boxes
		 * @default false
		 */
		fixed: false as boolean,
		/**
		 * The value of the row. Required for sorting/filtering
		 * @example row => row.name
		 */
		value: undefined as ((item: T) => V) | undefined,
		/**
		 * Makes the column sortable. Sorts based of a sorting function.
		 *
		 * **Important**	 ``value``-attribute is required adjacent to this.
		 *
		 * If ``true`` uses the default ``.sort()`` algorithm.
		 *
		 * @default false
		 */
		sort: false as boolean | ((a: V, b: V) => number),
		/**
		 * Is this column resizeable?
		 * Can not be resized if Table is marked as ``resizeable={false}``
		 * @default true
		 */
		resizeable: true as boolean,
		/**
		 *
		 * @example (value) => value.includes(search)
		 */
		filter: undefined as ((value: V) => boolean) | undefined,

		/** Styling for the column element (td) */
		style: undefined as string | undefined,

		/** Class for the column element (td) */
		class: undefined as string | undefined,

		/** Event when the row-column is clicked */
		onclick: undefined as
			| ((event: MouseEvent, rowColumnCtx: RowColumnCtx<T, V>) => void)
			| undefined,

		/**
		 * Pad child element of ``td``/``th`` instead of the column element itself.
		 * This ensures the child element "fills" the whole column.
		 * Ex. good if you want to make the column an anchor link ``<a href='...'>``
		 */
		pad: undefined as "row" | "header" | "statusbar" | "both" | undefined,

		/** @internal */
		_table: undefined as ColumnTableRef | undefined,
	}),

	_table: $state<ColumnTableRef | undefined>(undefined),

	get id() {
		return this.props.id
	},

	get table() {
		return this._table!
	},

	get snippets() {
		return {
			header:
				typeof this.props.header === "string"
					? getDefaultHeader(this.props.header)
					: this.props.header,
			/** Title is the header-snippet, with header-ctx: ``{ header: false }`` */
			title: ((anchor: Comment, _ctxGetter: unknown) => {
				const tableRef = this._table
				const getData = () => tableRef?.dataState.current ?? []
				const headerProp = this.props.header
				const headerSnippet =
					typeof headerProp === "string" ? getDefaultHeader<T>(headerProp) : headerProp
					// Call the header snippet with a context where header is false
					// Cast through unknown to work around TypeScript's strict function type checking
					; (headerSnippet as unknown as (anchor: Comment, getCtx: () => HeaderCtx<T>) => void)?.(
						anchor,
						() => ({
							get header() {
								return false
							},
							get data() {
								return getData() as T[]
							}
						})
					)
			}) as Snippet | undefined,
			row: this.props.row,
			statusbar: this.props.statusbar,
		}
	},

	/**
	 * Variables that can be saved (e.g. localStorage)
	 * and re-provided, where these are default-fallbacks
	 */
	get defaults() {
		return {
			sticky: this.props.sticky ?? false,
			show: this.props.show ?? true,
			sortby: this.props.sortby ?? false,
			width: this.props.width ?? 150,
		}
	},

	/** Static options */
	get options() {
		return {
			fixed: this.props.fixed ?? false,
			sort: this.props.sort ?? false,
			filter: this.props.filter,
			value: this.props.value,
			resizeable: this.props.resizeable ?? true,
			style: this.props.style,
			class: this.props.class,
			onclick: this.props.onclick,
			padRow: this.props.pad === "row" || this.props.pad === "both",
			padHeader: this.props.pad === "header" || this.props.pad === "both",
			padStatusbar: this.props.pad === "statusbar",
		}
	},

	toggleVisiblity() {
		const table = this._table
		if (!table) return
		const index = table.positions.hidden.indexOf(this as ColumnSelfRef)
		if (index > -1) table.positions.hidden.splice(index, 1)
		else table.positions.hidden.push(this as ColumnSelfRef)
	},

	/** Stored cleanup function */
	_cleanup: undefined as (() => void) | undefined,

	/** Call to remove this column from the table */
	cleanup() {
		if (typeof this._cleanup === 'function') {
			this._cleanup()
			this._cleanup = undefined
		}
	},

	init() {
		// Get table from context or from props (for programmatic usage)
		const table = this.props._table ?? getTableContext<T>()
		if (!table) {
			throw new Error("svelte-tably: Column must be associated with a Table")
		}

		this._table = table as ColumnTableRef
		const remove = (table as ColumnTableRef).add(this)
		// Store the cleanup function on the instance
		this._cleanup = remove
		return remove
	}
})

/** ColumnInstance interface - defined explicitly to avoid circular ReturnType issues */
export interface ColumnInstance<T = unknown, V = unknown> {
	readonly id: string
	readonly table: ColumnTableRef
	readonly snippets: {
		header: Snippet<[ctx: HeaderCtx<T>]> | undefined
		title: Snippet | undefined
		row: Snippet<[item: T, ctx: RowColumnCtx<T, V>]> | undefined
		statusbar: Snippet<[ctx: StatusbarCtx<T>]> | undefined
	}
	readonly defaults: {
		sticky: boolean
		show: boolean
		sortby: boolean
		width: number
	}
	readonly options: {
		fixed: boolean
		sort: boolean | ((a: V, b: V) => number)
		filter: ((value: V) => boolean) | undefined
		value: ((item: T) => V) | undefined
		resizeable: boolean
		style: string | undefined
		class: string | undefined
		onclick: ((event: MouseEvent, rowColumnCtx: RowColumnCtx<T, V>) => void) | undefined
		padRow: boolean
		padHeader: boolean
		padStatusbar: boolean
	}
	toggleVisiblity(): void
}

export type ColumnProps<T = unknown, V = unknown> = $origin.Props<ReturnType<typeof ColumnState<T, V>>>
