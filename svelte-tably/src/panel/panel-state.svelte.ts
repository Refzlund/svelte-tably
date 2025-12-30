import type { Snippet } from 'svelte'
import { getTableContext } from '../table/table-state.svelte.js'

// Minimal interface for what Panel needs from Table
export interface PanelTableRef {
	panels: Record<string, PanelInstance>
}

export type PanelCtx<T> = {
	readonly table: PanelTableRef
	readonly data: T[]
}

export const PanelState = <T>() => $origin({
	props: $attrs({
		id: '' as string,
		/**
		 * A darkened backdrop?
		 * @default true
		*/
		backdrop: true as boolean,
		children: undefined as Snippet<[ctx: PanelCtx<T>]> | undefined,

		/** @internal */
		_table: undefined as PanelTableRef | undefined
	}),

	/** Stored cleanup function */
	_cleanup: undefined as (() => void) | undefined,

	/** Call to remove this panel from the table */
	cleanup() {
		if (typeof this._cleanup === 'function') {
			this._cleanup()
			this._cleanup = undefined
		}
	},

	get id() {
		return $derived(this.props.id)
	},

	get backdrop() {
		return $derived(this.props.backdrop ?? true)
	},

	get children() {
		return $derived(this.props.children)
	}
}, function() {
	// Get table from context or from props (for programmatic usage)
	const table = this.props._table ?? getTableContext<T>()
	if (!table) {
		throw new Error('svelte-tably: Panel must be associated with a Table')
	}

	const key = this.props.id
	table.panels[key] = this as PanelInstance
	this._cleanup = () => {
		delete table.panels[key]
	}
})

export type PanelInstance = ReturnType<ReturnType<typeof PanelState>>
export type PanelProps<T = unknown> = $attrs.Of<ReturnType<typeof PanelState<T>>>