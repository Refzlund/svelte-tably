import { TableState, type RowCtx } from '../table/table.svelte.js'
import type { AnyRecord } from '../utility.svelte.js'
import type { Snippet } from 'svelte'
import { sineInOut } from 'svelte/easing'
import type { EasingFunction } from 'svelte/transition'

export interface ExpandableProps<T extends AnyRecord> {
	content: Snippet<[item: T, ctx: RowCtx<T>]>
	/**
	 * How many ms to slide open?
	 * @default { duration: 200, easing: sineInOut }
	*/
	slide?: {
		/** In milliseconds @default 150 */
		duration?: number
		/** @default sineInOut */
		easing?: EasingFunction
	}

	/**
	 * Whether you can click on a row to expand/collapse it
	 * @default true
	*/
	click?: boolean

	/**
	 * Whether to show the chevron on the left?
	 * @default 'hover'
	 */
	chevron?: 'always' | 'hover' | 'never'

	/**
	 * Whether multiple can be open at a time?
	 * @default false
	*/
	multiple?: boolean
}

export class ExpandableState<T extends AnyRecord> {
	#table: TableState<T>
	#props = {} as ExpandableProps<T>

	snippets = $derived({
		content: this.#props.content
	})

	options = $derived({
		slide: {
			duration: this.#props.slide?.duration ?? 150,
			easing: this.#props.slide?.easing ?? sineInOut
		},
		click: this.#props.click ?? true,
		chevron: this.#props.chevron ?? 'hover',
		multiple: this.#props.multiple ?? false
	})

	constructor(props: ExpandableProps<T>) {
		this.#props = props
		this.#table = TableState.getContext<T>()!
		if(!this.#table) {
			throw new Error('svelte-tably: Expandable must be associated with a Table')
		}

		this.#table.expandable = this
		$effect(() => () => this.#table.expandable === this && (this.#table.expandable = undefined))
	}
}

