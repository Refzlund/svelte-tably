import { getContext, setContext, type Snippet } from 'svelte'
import { ColumnState, type RowColumnCtx } from '../column/column-state.svelte.js'
import { PanelState } from '../panel/panel-state.svelte.js'
import { Data } from './data.svelte.js'
import { type AnyRecord } from '../utility.svelte.js'
import type { ExpandableState } from '../expandable/expandable-state.svelte.js'
import type { ItemState } from 'runic-reorder'
import type { RowState } from '../row/row-state.svelte.js'

export type HeaderSelectCtx<T extends AnyRecord = any> = {
	isSelected: boolean
	/** The list of selected items */
	readonly selected: T[]
	/**
	 * See [MDN :indeterminate](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate)
	 */
	readonly indeterminate: boolean
}

export type RowSelectCtx<T extends AnyRecord = any> = {
	readonly item: T
	readonly row: RowColumnCtx<T, unknown>
	data: T[]
	isSelected: boolean
}

export interface RowCtx<T extends AnyRecord> {
	readonly rowHovered: boolean
	readonly index: number
	readonly itemState: ItemState<T> | undefined
	selected: boolean
	expanded: boolean
}

type SelectOptions<T extends AnyRecord> = {
	/**
	 * The style, in which the selection is shown
	 *
	 * NOTE: If using `edge` | 'side', "show" will always be `hover`. This is due to
	 * an inconsistency/limitation of matching the scroll between the selection div and the rows.
	 *
	 * @default 'column'
	 */
	style?: 'column'
	/**
	 * When to show the row-select, when not selected?
	 * @default 'hover'
	 */
	show?: 'hover' | 'always' | 'never'
	/**
	 * Custom snippet
	 */
	headerSnippet?: Snippet<[context: HeaderSelectCtx]>
	rowSnippet?: Snippet<[context: RowSelectCtx<T>]>
}

export type TableProps<T extends AnyRecord> = {
	id?: string
	data: T[]
	selected?: T[]
	/** Current visible panel */
	panel?: string
	filters?: ((item: T) => boolean)[]
	/**
	 * **For a reorderable table, the data is mutated when reordered.**
	 * 
	 * Reorderable tables cannot
	 * - Be filtered
	 * - Be sorted
	 * @default false
	*/
	reorderable?: boolean
	/** Whether columns in this table can be resized */
	resizeable?: boolean
	/** Whether to enable selection */
	select?: boolean | SelectOptions<T>
	/** Create missing columns automatically. */
	auto?: boolean
}

export class TableState<T extends AnyRecord> {
	#props = {} as TableProps<T>

	id = $state() as string

	dataState: Data<T> = $state({} as Data<T>)

	data = $derived(
		this.dataState.current ?? []
	)

	columns = $state({}) as Record<string, ColumnState<T, any>>
	panels = $state({}) as Record<string, PanelState<T>>
	expandable = $state() as undefined | ExpandableState<T>
	row = $state() as undefined | RowState<T>

	/** Currently selected items */
	get selected(): T[] { return this.#props.selected ??= [] }
	set selected(items: T[]) { this.#props.selected = items }

	/** Column positions based on column ids */
	positions = $state({
		fixed: [] as ColumnState<T, any>[],
		sticky: [] as ColumnState<T, any>[],
		scroll: [] as ColumnState<T, any>[],
		hidden: [] as ColumnState<T, any>[]
	})

	/** Primarily externally managed options */
	options = $derived({
		panel: this.#props.panel,
		filters: this.#props.reorderable ? false : (this.#props.filters ?? []),
		resizeable: this.#props.resizeable ?? true,
		reorderable: this.#props.reorderable ?? false,
		select: this.#props.select ?? false,
		auto: this.#props.auto ?? false
	})

	add(state: ColumnState<T, any> | PanelState<T>) {
		if (state instanceof ColumnState) {
			const key = state.id
			this.columns[key] = state

			const clean = () => {
				delete this.columns[key]
				this.positions.fixed = this.positions.fixed.filter((column) => column !== state)
				this.positions.sticky = this.positions.sticky.filter((column) => column !== state)
				this.positions.scroll = this.positions.scroll.filter((column) => column !== state)
				this.positions.hidden = this.positions.hidden.filter((column) => column !== state)
			}

			if (state.defaults.sortby)
				this.dataState.sortBy(key)

			if (state.options.fixed) {
				this.positions.fixed.push(state)
				return clean
			}

			if (state.defaults.show === false) {
				this.positions.hidden.push(state)
			}

			if (state.defaults.sticky) {
				this.positions.sticky.push(state)
			}
			else {
				this.positions.scroll.push(state)
			}

			return clean
		}

		if (state instanceof PanelState) {
			const key = state.id
			this.panels[key] = state
			return () => delete this.panels[key]
		}
	}

	static getContext<T extends AnyRecord>() {
		return getContext('svelte-tably') as TableState<T> | undefined
	}

	constructor(tableProps: TableProps<T>) {
		this.#props = tableProps
		this.id = tableProps.id ?? Array.from({ length: 12 }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('')
		this.dataState = new Data(this, tableProps)

		setContext('svelte-tably', this)
	}
}