import { on } from 'svelte/events'
import { untrack } from 'svelte'
import type { TableProps, TableState } from './table-state.svelte.js'

export class Data<T extends Record<PropertyKey, unknown>> {

	#table = $state() as TableState<T>

	origin: T[] = $state([])
	sorted: T[] = $state([])
	filtered: T[] = $state([])

	sortby = $state() as string | undefined
	sortReverse = $state(false)

	current = $derived(this.#table?.options.reorderable ? this.origin : this.filtered)

	sortBy(column: string) {
		if (this.#table.options.reorderable) return

		const { sort, value } = this.#table.columns[column]!.options
		if (!sort || !value) return

		if (this.sortby === column) {
			this.sortReverse = !this.sortReverse
		}
		else {
			this.sortReverse = false
			this.sortby = column
		}
	}

	sortAction(node: HTMLElement, column: string) {
		$effect(() => on(node, 'click', () => {
			this.sortBy(column)
		}))
	}

	sortTable() {
		if (!this.sortby || this.#table.options.reorderable) {
			this.sorted = [...this.origin]
			return
		}

		const column = this.#table.columns[this.sortby]
		let { sort, value } = column?.options ?? {}

		if (!sort || !value) {
			this.sorted = [...this.origin]
			return
		}

		if (sort === true) {
			sort = (a, b) => String(a).localeCompare(String(b))
		}

		if (this.sortReverse) {
			this.sorted = this.origin.toSorted((a, b) => sort(value(b), value(a)))
		} else {
			this.sorted = this.origin.toSorted((a, b) => sort(value(a), value(b)))
		}
	}

	constructor(
		table: TableState<T>,
		props: TableProps<T>
	) {
		this.#table = table

		this.origin = props.data

		this.sorted = this.origin.toSorted()
		this.filtered = this.sorted

		$effect(() => {
			this.origin = props.data
			if (this.#table.options.reorderable) return
			props.data
			props.data.length
			this.sortby
			this.sortReverse
			untrack(() => this.sortTable())
		})

		$effect(() => {
			const table = this.#table
			if (props.reorderable) return

			const filters = [...props.filters ?? []] as ((item: T) => boolean)[]
			for (const key in table.columns) {
				const filter = table.columns[key].options.filter
				const valueOf = table.columns[key].options.value
				if (filter && valueOf) {
					filters.push((item) => filter(valueOf(item)))
				}
			}


			this.filtered = filters.length === 0 ? this.sorted : this.sorted.filter((value) => filters.every((filter) => filter(value)))
		})
	}

}