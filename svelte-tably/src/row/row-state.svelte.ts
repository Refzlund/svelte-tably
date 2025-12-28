import type { Snippet } from 'svelte'
import { getTableContext, type RowCtx } from '../table/table-state.svelte.js'

// Minimal interface for what Row needs from Table
export interface RowTableRef {
	row: RowInstance | undefined
}

type ContextOptions = {
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

export const RowState = <T>() => $origin({
	props: $attrs({
		/** Class name for the row element */
		class: undefined as string | undefined,
		/**
		 * A sticky context column on the right of each table
		*/
		context: undefined as Snippet<[item: T, ctx: RowCtx<T>]> | undefined,
		contextOptions: undefined as ContextOptions | undefined,
		contextHeader: undefined as Snippet | undefined,

		onclick: undefined as ((event: MouseEvent, ctx: RowCtx<T>) => void) | undefined,
		oncontextmenu: undefined as ((event: MouseEvent, ctx: RowCtx<T>) => void) | undefined,

		/** @internal */
		_table: undefined as RowTableRef | undefined
	}),

	/** Stored cleanup function */
	_cleanup: undefined as (() => void) | undefined,

	/** Call to remove this row config from the table */
	cleanup() {
		if (typeof this._cleanup === 'function') {
			this._cleanup()
			this._cleanup = undefined
		}
	},

	get snippets() {
		return $derived({
			context: this.props.context,
			contextHeader: this.props.contextHeader
		})
	},

	get events() {
		return $derived({
			onclick: this.props.onclick,
			oncontextmenu: this.props.oncontextmenu
		})
	},

	get options() {
		return $derived({
			class: this.props.class,
			context: {
				class: this.props.contextOptions?.class,
				hover: this.props.contextOptions?.hover ?? true,
				width: this.props.contextOptions?.width ?? 'max-content',
				alignHeaderToRows: this.props.contextOptions?.alignHeaderToRows ?? false
			}
		})
	}
}, function() {
	// Get table from context or from props (for programmatic usage)
	const table = this.props._table ?? getTableContext<T>()
	if (!table) {
		throw new Error('svelte-tably: Row must be associated with a Table')
	}

	table.row = this as RowInstance
	this._cleanup = () => {
		if (table.row === this) {
			table.row = undefined
		}
	}
})

export type RowInstance = ReturnType<ReturnType<typeof RowState>>
export type RowProps<T = unknown> = $attrs.Of<ReturnType<typeof RowState<T>>>

