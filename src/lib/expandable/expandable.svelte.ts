import { TableState } from '$lib/table/table.svelte.js'
import type { AnyRecord } from '$lib/utility.svelte.js'
import type { Snippet } from 'svelte'

interface ExpandableCtx<T> {
	close(): void
}

export interface ExpandableProps<T extends AnyRecord> {
	content: Snippet<[item: T, ctx: ExpandableCtx<T>]>
	/**
	 * How many ms to slide open?
	 * @default 200
	*/
	slide?: number
}

export class ExpandableState<T extends AnyRecord> {
	#table: TableState<T>
	#props = $state({}) as ExpandableProps<T>

	snippets = $derived({
		content: this.#props.content
	})

	options = $derived({
		slide: this.#props.slide ?? 200
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

