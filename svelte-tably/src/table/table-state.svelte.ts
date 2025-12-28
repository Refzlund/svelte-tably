import { getContext, setContext, untrack, type Snippet } from 'svelte'
import type { ColumnInstance, RowColumnCtx } from '../column/column-state.svelte.js'
import { Data, type DataInstance } from './data.svelte.js'
import type { ItemState } from 'runic-reorder'
import type { CSVOptions } from './csv.js'
import type { PanelInstance } from '../panel/panel-state.svelte.js'
import type { ExpandableInstance } from '../expandable/expandable-state.svelte.js'
import type { RowInstance } from '../row/row-state.svelte.js'

export type HeaderSelectCtx<T = unknown> = {
	isSelected: boolean
	/** The list of selected items */
	readonly selected: T[]
	/**
	 * See [MDN :indeterminate](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate)
	 */
	readonly indeterminate: boolean
}

export type RowSelectCtx<T = unknown> = {
	readonly item: T
	readonly row: RowColumnCtx<T, unknown>
	data: T[]
	isSelected: boolean
}

export interface RowCtx<T> {
	readonly rowHovered: boolean
	readonly index: number
	readonly itemState: ItemState<T> | undefined
	selected: boolean
	expanded: boolean
}

type SelectOptions<T> = {
	/**
	 * The style, in which the selection is shown
	 *
	 * NOTE: If using ``edge`` | ''side'', "show" will always be ``hover``. This is due to
	 * an inconsistency/limitation of matching the scroll between the selection div and the rows.
	 *
	 * @default ''column''
	 */
	style?: 'column'
	/**
	 * When to show the row-select, when not selected?
	 * @default ''hover''
	 */
	show?: 'hover' | 'always' | 'never'
	/**
	 * Custom snippet
	 */
	headerSnippet?: Snippet<[context: HeaderSelectCtx]>
	rowSnippet?: Snippet<[context: RowSelectCtx<T>]>
}

export const TableState = <T>() => $origin({
	props: $attrs({
		id: undefined as string | undefined,
		/** Class name for the table element */
		class: undefined as string | undefined,
		data: [] as T[],
		selected: $bindable([]) as T[],
		/** Current visible panel */
		panel: $bindable(undefined) as string | undefined,
		filters: undefined as ((item: T) => boolean)[] | undefined,
		/**
		 * **For a reorderable table, the data is mutated when reordered.**
		 * 
		 * Reorderable tables cannot
		 * - Be filtered
		 * - Be sorted
		 * @default false
		 */
		reorderable: false as boolean,
		/** Whether columns in this table can be resized */
		resizeable: true as boolean,
		/** Whether to enable selection */
		select: false as boolean | SelectOptions<T>,
		/** Create missing columns automatically. */
		auto: false as boolean,
		/** Content snippet for rendering Column/Panel/Expandable/Row components */
		content: undefined as Snippet<[context: unknown]> | undefined
	}),

	_cssId: $state(''),
	_dataState: $state<DataInstance | undefined>(undefined),
	_columns: $state<Record<string, ColumnInstance>>({}),
	_panels: $state<Record<string, PanelInstance>>({}),
	_expandable: $state<ExpandableInstance | undefined>(undefined),
	_row: $state<RowInstance | undefined>(undefined),
	_columnWidths: $state<Record<string, number>>({}),
	_positions: $state<{
		fixed: string[]
		sticky: string[]
		hidden: string[]
		scroll: string[]
	}>({
		fixed: [],
		sticky: [],
		hidden: [],
		scroll: []
	}),
	_positionsState: $state<{
		fixed: ColumnInstance[]
		sticky: ColumnInstance[]
		scroll: ColumnInstance[]
		hidden: ColumnInstance[]
	}>({
		fixed: [],
		sticky: [],
		scroll: [],
		hidden: []
	}),
	/**
	 * Tracks the order in which columns are first declared/registered.
	 * Used as fallback for positioning when no saved order exists in localStorage.
	 */
	_declarationOrder: $state<string[]>([]),

	get id() {
		return this.props!.id
	},

	get cssId() {
		return this._cssId
	},

	get dataState() {
		return this._dataState!
	},

	set dataState(value: DataInstance) {
		this._dataState = value
	},

	get data() {
		return $derived(this._dataState?.current ?? [])
	},

	get columns() {
		return this._columns
	},

	set columns(value: Record<string, ColumnInstance>) {
		this._columns = value
	},

	get panels() {
		return this._panels
	},

	set panels(value: Record<string, PanelInstance>) {
		this._panels = value
	},

	get expandable() {
		return this._expandable
	},

	set expandable(value: ExpandableInstance | undefined) {
		this._expandable = value
	},

	get row() {
		return this._row
	},

	set row(value: RowInstance | undefined) {
		this._row = value
	},

	get selected() {
		return this.props!.selected
	},

	set selected(items: T[]) {
		this.props!.selected = items
	},

	get positions() {
		return this._positionsState
	},

	set positions(value: typeof this._positionsState) {
		this._positionsState = value
	},

	get columnWidths() {
		return this._columnWidths
	},

	set columnWidths(value: Record<string, number>) {
		this._columnWidths = value
	},

	get options() {
		return $derived({
			panel: this.props!.panel,
			filters: this.props!.reorderable ? false : (this.props!.filters ?? []),
			resizeable: this.props!.resizeable ?? true,
			reorderable: this.props!.reorderable ?? false,
			select: this.props!.select ?? false,
			auto: this.props!.auto ?? false
		})
	},

	add(state: ColumnInstance | PanelInstance) {
		// Check if it's a ColumnInstance by looking for column-specific properties
		if ('defaults' in state && 'snippets' in state && 'options' in state && 'toggleVisiblity' in state) {
			const column = state as ColumnInstance
			const key = column.id
			this._columns[key] = column

			// Track declaration order for columns that haven't been seen before
			if (!this._declarationOrder.includes(key)) {
				this._declarationOrder.push(key)
			}

			/**
			 * Insert a column into an array at the correct position based on order.
			 * Priority: savedOrder (localStorage) > declarationOrder > append
			 */
			const insertByOrder = (
				arr: ColumnInstance[],
				item: ColumnInstance,
				savedOrder: string[]
			) => {
				// First check if there's a saved position from localStorage
				const savedIdx = savedOrder.indexOf(item.id)
				// Fall back to declaration order if no saved position
				const orderToUse = savedIdx !== -1 ? savedOrder : this._declarationOrder
				const idx = orderToUse.indexOf(item.id)

				if (idx === -1) {
					// No known position, append at end
					arr.push(item)
					return
				}

				// Find where to insert based on the order
				let i = 0
				for (; i < arr.length; i++) {
					const otherIdx = orderToUse.indexOf(arr[i].id)
					if (otherIdx === -1) continue
					if (otherIdx > idx) break
				}
				arr.splice(i, 0, item)
			}

			const clean = () => {
				delete this._columns[key]
				// Use id comparison instead of reference equality to avoid Svelte 5 proxy issues
				this._positionsState.fixed = this._positionsState.fixed.filter((c) => c.id !== key)
				this._positionsState.sticky = this._positionsState.sticky.filter((c) => c.id !== key)
				this._positionsState.scroll = this._positionsState.scroll.filter((c) => c.id !== key)
				this._positionsState.hidden = this._positionsState.hidden.filter((c) => c.id !== key)
			}

			if (column.defaults.sortby && this._dataState && !this._dataState.sortby) {
				this._dataState.sortBy(key)
			}

			const saved = {
				fixed: this._positions.fixed.includes(key),
				sticky: this._positions.sticky.includes(key),
				hidden: this._positions.hidden.includes(key),
				scroll: this._positions.scroll.includes(key)
			}
			const isSaved = Object.values(saved).some(v => v)

			if (
				(!isSaved && column.options.fixed)
				|| saved.fixed
			) {
				insertByOrder(this._positionsState.fixed, column, this._positions.fixed)
				return clean
			}

			if (
				(!isSaved && column.defaults.show === false)
				|| saved.hidden
			) {
				insertByOrder(this._positionsState.hidden, column, this._positions.hidden)
			}

			if (
				(!isSaved && column.defaults.sticky)
				|| saved.sticky
			) {
				insertByOrder(this._positionsState.sticky, column, this._positions.sticky)
			} else {
				insertByOrder(this._positionsState.scroll, column, this._positions.scroll)
			}

			return clean
		}

		// Otherwise it's a PanelInstance
		if ('backdrop' in state && 'children' in state) {
			const panel = state as PanelInstance
			const key = panel.id
			this._panels[key] = panel
			return () => delete this._panels[key]
		}
	},

	async toCSV(_options: CSVOptions<T> = {}): Promise<string> {
		return ''
	}
}, function() {
	this._cssId = Array.from({ length: 12 }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('')

	// Create data state
	const dataState = Data<T>()({
		_table: this,
		_data: this.props.data,
		_filters: this.props.filters,
		_reorderable: this.props.reorderable
	})
	this._dataState = dataState

	// LocalStorage persistence (browser-only to avoid SSR hydration mismatch)
	type SavedPositions = {
		fixed: string[]
		sticky: string[]
		hidden: string[]
		scroll: string[]
	}
	type SavedState = {
		positions?: SavedPositions
		columnWidths?: Record<string, number>
	}
	const storageKey = this.props.id ? `svelte-tably:${this.props.id}` : null

	// Load saved state from localStorage (runs once on init, synchronously)
	if (storageKey && typeof window !== 'undefined') {
		try {
			const saved = localStorage.getItem(storageKey)
			if (saved) {
				const parsed = JSON.parse(saved) as SavedState
				if (parsed.positions) {
					this._positions = parsed.positions
				}
				if (parsed.columnWidths) {
					this._columnWidths = parsed.columnWidths
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Save state on changes to localStorage
	$effect(() => {
		// Tracked: position arrays and column widths
		const currentIds = {
			fixed: this._positionsState.fixed.map(c => c.id),
			sticky: this._positionsState.sticky.map(c => c.id),
			hidden: this._positionsState.hidden.map(c => c.id),
			scroll: this._positionsState.scroll.map(c => c.id)
		}
		const widths = { ...this._columnWidths }

		untrack(() => {
			if (!storageKey) return
			if (typeof window === 'undefined') return

			localStorage.setItem(storageKey, JSON.stringify({
				positions: currentIds,
				columnWidths: widths
			}))
		})
	})

	setContext('svelte-tably', this)
})

export function getTableContext<_T>() {
	return getContext('svelte-tably') as TableInstance<_T> | undefined
}

// Internal column reference type for TableInstance to avoid circular dependency
interface TableColumnRef {
	readonly id: string
	readonly options: {
		sort: boolean | ((a: unknown, b: unknown) => number)
		value: ((item: unknown) => unknown) | undefined
		filter: ((value: unknown) => boolean) | undefined
		fixed: boolean
		resizeable: boolean
		style: string | undefined
		class: string | undefined
		onclick: ((event: MouseEvent, ctx: unknown) => void) | undefined
		padRow: boolean
		padHeader: boolean
		padStatusbar: boolean
	}
	readonly defaults: {
		readonly sticky: boolean
		readonly show: boolean
		readonly sortby: boolean
		readonly width: number
	}
	readonly snippets: {
		readonly title: Snippet | undefined
		readonly header: Snippet<[ctx: unknown]> | undefined
		readonly row: Snippet<[item: unknown, ctx: unknown]> | undefined
		readonly statusbar: Snippet<[ctx: unknown]> | undefined
	}
	toggleVisiblity(): void
}

/** 
 * TableInstance interface - defined explicitly to avoid circular ReturnType issues.
 * Note: Generic T is optional since TypeScript's ReturnType loses generics.
 */
export interface TableInstance<T = unknown> {
	readonly id: string | undefined
	readonly cssId: string
	dataState: DataInstance<T>
	readonly data: T[]
	columns: Record<string, TableColumnRef>
	panels: Record<string, PanelInstance>
	expandable: ExpandableInstance | undefined
	row: RowInstance | undefined
	selected: T[]
	positions: {
		fixed: TableColumnRef[]
		sticky: TableColumnRef[]
		scroll: TableColumnRef[]
		hidden: TableColumnRef[]
	}
	columnWidths: Record<string, number>
	readonly options: {
		panel: string | undefined
		filters: ((item: T) => boolean)[] | false
		resizeable: boolean
		reorderable: boolean
		select: boolean | SelectOptions<T>
		auto: boolean
	}
	add(state: TableColumnRef | PanelInstance): (() => void) | undefined
	toCSV(options?: CSVOptions<T>): Promise<string>
}

export type TableProps<T = unknown> = $attrs.Of<ReturnType<typeof TableState<T>>>
