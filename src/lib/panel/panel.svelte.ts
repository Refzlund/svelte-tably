import { TableState } from '$lib/table/table.svelte.js'
import { type AnyRecord } from '$lib/utility.svelte.js'
import type { Snippet } from 'svelte'

export type PanelProps<T extends AnyRecord> = {
	id: string
	/**
	 * A darkened backdrop?
	 * @default true
	*/
	backdrop?: boolean
	table?: TableState<T>
	children: Snippet<[ctx: PanelCtx<T>]>
}

export type PanelCtx<T extends AnyRecord> = {
	readonly table: TableState<T>
	readonly data: T[]
}

export class PanelState<T extends AnyRecord> {
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