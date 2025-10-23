import { TableState } from '../table/table-state.svelte.js'
import type { Snippet } from 'svelte'

export type PanelProps<T> = {
	id: string
	/**
	 * A darkened backdrop?
	 * @default true
	*/
	backdrop?: boolean
	table?: TableState<T>
	children: Snippet<[ctx: PanelCtx<T>]>
}

export type PanelCtx<T> = {
	readonly table: TableState<T>
	readonly data: T[]
}

export class PanelState<T> {
	#props = {} as PanelProps<T>
	table: TableState<T>

	id = $derived(this.#props.id)

	backdrop = $derived(this.#props.backdrop ?? true)
	children = $derived(this.#props.children)

	constructor(
		props: PanelProps<T>
	) {
		this.#props = props

		const table = props.table ?? TableState.getContext()
		if (!table) {
			throw new Error('svelte-tably: Panel must be associated with a Table')
		}

		this.table = table
		const remove = table.add(this)
		$effect(() => remove)
	}
}