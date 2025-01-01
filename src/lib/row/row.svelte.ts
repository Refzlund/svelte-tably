import { TableState, type RowCtx } from '$lib/table/table.svelte.js'
import type { AnyRecord } from '$lib/utility.svelte.js'
import type { Snippet } from 'svelte'

type ContextOptions<T extends AnyRecord> = {
	/**
	 * Only show when hovering the row?
	 * @default true
	*/
	hover?: boolean
	/**
	 * @defualt 'max-content'
	 */
	width?: string
}

export interface RowProps<T extends AnyRecord> {
	/**
	 * A sticky context column on the right of each table
	*/
	context?: Snippet<[item: T, ctx: RowCtx<T>]>
	contextOptions?: ContextOptions<T>
	contextHeader?: Snippet

	onclick?: (event: MouseEvent, ctx: RowCtx<T>) => void
	oncontextmenu?: (event: MouseEvent, ctx: RowCtx<T>) => void
}

export class RowState<T extends AnyRecord> {
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
		context: {
			hover: this.#props.contextOptions?.hover ?? true,
			width: this.#props.contextOptions?.width ?? 'max-content'
		}
	})

	constructor(props: RowProps<T>) {
		this.#props = props
		this.#table = TableState.getContext<T>()!
		if(!this.#table) {
			throw new Error('svelte-tably: Expandable must be associated with a Table')
		}

		this.#table.row = this
		$effect(() => () => this.#table.row === this && (this.#table.row = undefined))
	}
}

