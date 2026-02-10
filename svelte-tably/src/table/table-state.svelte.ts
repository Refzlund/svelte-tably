import { getContext, setContext, type Snippet, type SvelteComponent, type ComponentConstructorOptions } from 'svelte'
import type { ColumnInstance, RowColumnCtx, ColumnProps } from '../column/column-state.svelte.js'
import { Data, type DataInstance } from './data.svelte.js'
import type { ItemState } from 'runic-reorder'
import type { CSVOptions } from './csv.js'
import type { PanelInstance, PanelProps } from '../panel/panel-state.svelte.js'
import type { ExpandableInstance, ExpandableProps } from '../expandable/expandable-state.svelte.js'
import type { RowInstance, RowProps } from '../row/row-state.svelte.js'

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

/**
 * Column component type with proper generic inference.
 * T is fixed to the table's Item type, V is inferred from the value prop.
 */
type ColumnComponentType<T> = {
	<V>(internal: unknown, props: ColumnProps<T, V>): void
	new <V>(options: ComponentConstructorOptions<ColumnProps<T, V>>): SvelteComponent<ColumnProps<T, V>>
}

/**
 * Panel component type.
 */
type PanelComponentType<T> = {
	(internal: unknown, props: PanelProps<T>): void
	new(options: ComponentConstructorOptions<PanelProps<T>>): SvelteComponent<PanelProps<T>>
}

/**
 * Expandable component type.
 */
type ExpandableComponentType<T> = {
	(internal: unknown, props: ExpandableProps<T>): void
	new(options: ComponentConstructorOptions<ExpandableProps<T>>): SvelteComponent<ExpandableProps<T>>
}

/**
 * Row component type.
 */
type RowComponentType<T> = {
	(internal: unknown, props: RowProps<T>): void
	new(options: ComponentConstructorOptions<RowProps<T>>): SvelteComponent<RowProps<T>>
}

export type ContentCtx<Item = unknown> = {
	/** Column component - use to define table columns */
	readonly Column: ColumnComponentType<Item>
	/** Panel component - use to define side panels */
	readonly Panel: PanelComponentType<Item>
	/** Expandable component - use to define expandable row content */
	readonly Expandable: ExpandableComponentType<Item>
	/** Row component - use to configure row behavior and context menus */
	readonly Row: RowComponentType<Item>
	/** The table state instance */
	readonly table: TableInstance<Item>
	/** Set of hidden column IDs - use for reactive visibility checks */
	readonly hiddenIds: ReadonlySet<string>
	/** Sticky columns array - mutable for reordering */
	readonly sticky: ColumnInstance[]
	/** Scroll columns array - mutable for reordering */
	readonly scroll: ColumnInstance[]
}

export type ContentSnippet<Item = unknown> = Snippet<[context: ContentCtx<Item>]>

export const TableState = <T>() => $origin({
	props: $origin.props({
		id: undefined as string | undefined,
		/** Class name for the table element */
		class: undefined as string | undefined,
		data: $bindable([] as T[]),
		selected: $bindable([] as T[]),
		/** Current visible panel */
		panel: $bindable(undefined as string | undefined),
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
		content: undefined as ContentSnippet<T> | undefined
	}),

	_cssId: '',
	_dataState: $state<DataInstance | undefined>(undefined),
	_columns: {} as Record<string, ColumnInstance>,
	_panels: {} as Record<string, PanelInstance>,
	_expandable: $state<ExpandableInstance | undefined>(undefined),
	_row: undefined as RowInstance | undefined,
	_columnWidths: $state({} as Record<string, number>),
	/** Callback to notify Table.svelte when state changes (for persistence) */
	_saveCallback: undefined as (() => void) | undefined,
	_positions: {
		fixed: [],
		sticky: [],
		hidden: [],
		scroll: []
	} as {
		fixed: string[]
		sticky: string[]
		hidden: string[]
		scroll: string[]
	},
	_positionsState: $state({
		fixed: [],
		sticky: [],
		scroll: [],
		hidden: []
	} as {
		fixed: ColumnInstance[]
		sticky: ColumnInstance[]
		scroll: ColumnInstance[]
		hidden: ColumnInstance[]
	}),
	/**
	 * Version counter to trigger reactivity when columns change.
	 * Increment this whenever _positionsState arrays are modified.
	 */
	_positionsVersion: $state(0),
	/**
	 * Version counter for column widths reactivity.
	 */
	_columnWidthsVersion: $state(0),
	/**
	 * Tracks the order in which columns are first declared/registered.
	 * Used as fallback for positioning when no saved order exists in localStorage.
	 */
	_declarationOrder: [] as string[],

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
		return this._dataState?.current ?? []
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
		this._columnWidthsVersion++
	},

	get options() {
		return {
			panel: this.props!.panel,
			filters: this.props!.reorderable ? false : (this.props!.filters ?? []),
			resizeable: this.props!.resizeable ?? true,
			reorderable: this.props!.reorderable ?? false,
			select: this.props!.select ?? false,
			auto: this.props!.auto ?? false
		}
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
				// Filter Boolean first to guard against any undefined entries
				this._positionsState.fixed = this._positionsState.fixed.filter((c) => c && c.id !== key)
				this._positionsState.sticky = this._positionsState.sticky.filter((c) => c && c.id !== key)
				this._positionsState.scroll = this._positionsState.scroll.filter((c) => c && c.id !== key)
				this._positionsState.hidden = this._positionsState.hidden.filter((c) => c && c.id !== key)
				this._positionsVersion++
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

			// Determine which position array to add the column to
			// Priority: fixed > sticky > scroll
			// Hidden is now just a visibility flag, not a position
			if (
				(!isSaved && column.options.fixed)
				|| saved.fixed
			) {
				insertByOrder(this._positionsState.fixed, column, this._positions.fixed)
				// Also add to hidden if it should start hidden
				if (saved.hidden || (!isSaved && column.defaults.show === false)) {
					this._positionsState.hidden = [...this._positionsState.hidden, column]
				}
				this._positionsVersion++
				return clean
			}

			// Add to sticky or scroll based on defaults/saved position
			if (
				(!isSaved && column.defaults.sticky)
				|| saved.sticky
			) {
				insertByOrder(this._positionsState.sticky, column, this._positions.sticky)
			} else {
				insertByOrder(this._positionsState.scroll, column, this._positions.scroll)
			}

			// Also add to hidden if it should start hidden
			if (saved.hidden || (!isSaved && column.defaults.show === false)) {
				this._positionsState.hidden = [...this._positionsState.hidden, column]
			}

			this._positionsVersion++

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
}, function () {
	// Init callback - runs when origin is created
	const id = this.props.id
	this._cssId = id ? `tably-${id}` : `tably-${Math.random().toString(36).slice(2, 11)}`

	setContext<TableInstance<T>>('svelte-tably', this as TableInstance<T>)

	// Create data state with bound props (uses $origin.create for proper reactivity)
	this._dataState = $origin.create(Data<T>, {
		_table: this,
		_data: $origin.bind(this.props.data),
		_filters: $origin.bind(this.props.filters),
		_reorderable: $origin.bind(this.props.reorderable)
	})

	// LocalStorage persistence
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

	// Note: Save logic is handled in Table.svelte where local $state works properly
	// (svelte-origin strips $state() from origin definitions, so effects here can't track changes)
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
	readonly isHidden: boolean
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
	/** Version counter for column widths reactivity */
	_columnWidthsVersion: number
	/** Callback for origins to notify when state changes (for persistence) */
	_saveCallback: (() => void) | undefined
	/** Internal positions state for reactivity */
	_positionsState: {
		fixed: TableColumnRef[]
		sticky: TableColumnRef[]
		scroll: TableColumnRef[]
		hidden: TableColumnRef[]
	}
	/** Version counter for positions reactivity */
	_positionsVersion: number
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

export type TableProps<T = unknown> = $origin.Props<ReturnType<typeof TableState<T>>>
