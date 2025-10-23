import { getContext, setContext, type Snippet } from 'svelte'
import { ColumnState, type RowColumnCtx } from '../column/column-state.svelte.js'
import { PanelState } from '../panel/panel-state.svelte.js'
import { Data } from './data.svelte.js'
import type { ExpandableState } from '../expandable/expandable-state.svelte.js'
import type { ItemState } from 'runic-reorder'
import type { RowState } from '../row/row-state.svelte.js'
import { untrack } from 'svelte'

export type HeaderSelectCtx<T = any> = {
	isSelected: boolean
	/** The list of selected items */
	readonly selected: T[]
	/**
	 * See [MDN :indeterminate](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate)
	 */
	readonly indeterminate: boolean
}

export type RowSelectCtx<T extends any = any> = {
	readonly item: T
	readonly row: RowColumnCtx<T, unknown>
	data: T[]
	isSelected: boolean
}

export interface RowCtx<T extends any> {
	readonly rowHovered: boolean
	readonly index: number
	readonly itemState: ItemState<T> | undefined
	selected: boolean
	expanded: boolean
}

type SelectOptions<T extends any> = {
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

export type TableProps<T extends any> = {
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

export class TableState<T> {
	#props = {} as TableProps<T>

	id = $state() as string | undefined
	cssId = $state() as string

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

	/** Saved positions */
	#positions: {
		fixed: string[]
		sticky: string[]
		hidden: string[]
	} = $state({
		fixed: [],
		sticky: [],
		hidden: [],
		scroll: []
	})
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

			if (state.defaults.sortby && !this.dataState.sortby) {
				this.dataState.sortBy(key)
			}

			const saved = {
				fixed: this.#positions.fixed.includes(key),
				sticky: this.#positions.sticky.includes(key),
				hidden: this.#positions.hidden.includes(key),
				scroll: this.#positions.scroll.includes(key)
			}
			const isSaved = Object.values(saved).some(v => v)

			if (
				(!isSaved && state.options.fixed)
				|| saved.fixed
			) {
				this.positions.fixed.push(state)
				return clean
			}

			if (
				(!isSaved && state.defaults.show === false)
				|| saved.hidden
			) {
				this.positions.hidden.push(state)
			}

			if (
				(!isSaved && state.defaults.sticky)
				|| saved.sticky
			) {
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

	static getContext<T>() {
		return getContext('svelte-tably') as TableState<T> | undefined
	}

	/** Width of each column */
	columnWidths = $state({}) as Record<string, number>

	#save() {
		const content = {
			columnWidths: this.columnWidths,
			positions: {
				fixed: this.positions.fixed.map(c => c.id),
				sticky: this.positions.sticky.map(c => c.id),
				hidden: this.positions.hidden.map(c => c.id),
				scroll: this.positions.scroll.map(c => c.id)
			},
			sortby: this.dataState.sortby,
			sortReverse: this.dataState.sortReverse
		}

		localStorage.setItem(`svelte-tably:${this.id}`, JSON.stringify(content))
	}

	#saving = false
	#scheduleSave(): void {
		if(this.#saving) return
		if(typeof localStorage === 'undefined') return
		this.#saving = true
		setTimeout(() => {
			this.#saving = false
			this.#save()
		}, 1000)
	}

	#load(): {
		columnWidths: typeof this.columnWidths
		positions: typeof this['#positions']
		sortby: string | undefined
		sortReverse: boolean
	} | null {
		if(typeof localStorage === 'undefined') return null
		const item = JSON.parse(localStorage.getItem(`svelte-tably:${this.id}`) || '{}')
		item.columnWidths ??= {}
		item.positions ??= {}
		item.positions.fixed ??= []
		item.positions.sticky ??= []
		item.positions.hidden ??= []
		item.positions.scroll ??= []
		item.sortby ??= undefined
		item.sortReverse ??= false
		return item
	}

	constructor(tableProps: TableProps<T>) {
		this.#props = tableProps
		this.id = tableProps.id
		this.cssId = Array.from({ length: 12 }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('')
		this.dataState = new Data(this, tableProps)

		if(this.id) {
			// fetch from localstorage
			const saved = this.#load()
			if(saved) {
				this.columnWidths = saved.columnWidths
				this.#positions = saved.positions
				this.dataState.sortby = saved.sortby
				this.dataState.sortReverse = saved.sortReverse
			}
		}
		
		if(typeof window !== 'undefined') {
			window.addEventListener('beforeunload', () => this.#save())
		}
		$effect(() => {
			Object.keys(this.columnWidths)
			Object.values(this.positions).map(v => v.length)
			this.dataState.sortby
			this.dataState.sortReverse
			this.#scheduleSave()
		})

		setContext('svelte-tably', this)
	}
}