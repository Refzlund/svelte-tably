import { TableState, type RowCtx } from '../table/table-state.svelte.js'
import type { Snippet } from 'svelte'

type ContextOptions<_T> = {
	/**
	 * Only show the context *content* when hovering the row?
	 *
	 * Note: the context column still reserves its width in the grid.
	 * Hover mode only hides the contents / disables interaction.
	 * @default true
	*/
	hover?: boolean
	/**
	 * @default 'max-content'
	 */
	width?: string
	/**
	 * Align the header context cell (if any) with the row context cell.
	 *
	 * When enabled, the table measures the rendered context cell width
	 * (from header and rows) and uses a shared fixed width so they line up.
	 * @default false
	 */
	alignHeaderToRows?: boolean
	/** Class name for the context column element */
	class?: string
}

export interface RowProps<T> {
	/** Class name for the row element */
	class?: string
	/**
	 * A sticky context column on the right of each table
	*/
	context?: Snippet<[item: T, ctx: RowCtx<T>]>
	contextOptions?: ContextOptions<T>
	contextHeader?: Snippet

	onclick?: (event: MouseEvent, ctx: RowCtx<T>) => void
	oncontextmenu?: (event: MouseEvent, ctx: RowCtx<T>) => void
}

export class RowState<T> {
	#table: TableState<T>
	#props = {} as RowProps<T>

	snippets = $derived({
		context: this.#props.context,
		contextHeader: this.#props.contextHeader
	})

	events = $derived({
		onclick: this.#props.onclick,
		oncontextmenu: this.#props.oncontextmenu
	})

	options = $derived({
		class: this.#props.class,
		context: {
			class: this.#props.contextOptions?.class,
			hover: this.#props.contextOptions?.hover ?? true,
			width: this.#props.contextOptions?.width ?? 'max-content',
			alignHeaderToRows: this.#props.contextOptions?.alignHeaderToRows ?? false
		}
	})

	constructor(props: RowProps<T>) {
		this.#props = props
		this.#table = TableState.getContext<T>()!
		if (!this.#table) {
			throw new Error('svelte-tably: Row must be associated with a Table')
		}

		this.#table.row = this
		$effect(() => () => this.#table.row === this && (this.#table.row = undefined))
	}
}

