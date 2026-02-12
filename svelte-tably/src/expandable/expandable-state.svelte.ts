import type { Snippet } from 'svelte'
import { sineInOut } from 'svelte/easing'
import type { EasingFunction } from 'svelte/transition'
import type { RowCtx } from '../table/table-state.svelte.js'

// Minimal interface for what Expandable needs from Table
export interface ExpandableTableRef {
	expandable: ExpandableInstance | undefined
}

type SlideOptions = {
	/** In milliseconds @default 150 */
	duration?: number
	/** @default sineInOut */
	easing?: EasingFunction
}

export const ExpandableState = <T>() => $origin({
	props: $origin.props({
		content: undefined as Snippet<[item: T, ctx: RowCtx<T>]> | undefined,
		slide: undefined as SlideOptions | undefined,
		click: true as boolean,
		chevron: 'hover' as 'always' | 'hover' | 'never',
		multiple: false as boolean,
		_table: undefined as ExpandableTableRef | undefined
	}),

	/** Stored cleanup function */
	_cleanup: undefined as (() => void) | undefined,

	/** Call to remove this expandable from the table */
	cleanup() {
		if (typeof this._cleanup === 'function') {
			this._cleanup()
			this._cleanup = undefined
		}
	},

	get snippets() {
		return {
			content: this.props.content
		}
	},

	get options() {
		return {
			slide: {
				duration: this.props.slide?.duration ?? 150,
				easing: this.props.slide?.easing ?? sineInOut
			},
			click: this.props.click ?? true,
			chevron: this.props.chevron ?? 'hover',
			multiple: this.props.multiple ?? false
		}
	},

	init(tableFromContext?: ExpandableTableRef) {
		// Get table from argument, props, or context fallback
		const table = tableFromContext ?? this.props._table
		if (!table) {
			throw new Error('svelte-tably: Expandable must be associated with a Table')
		}

		table.expandable = this as unknown as ExpandableInstance
		this._cleanup = () => {
			if ((table.expandable as unknown) === (this as unknown)) {
				table.expandable = undefined
			}
		}
	}
})

export type ExpandableInstance = $origin.Of<ReturnType<typeof ExpandableState>>
export type ExpandableProps<T = unknown> = $origin.Props<ReturnType<typeof ExpandableState<T>>>

