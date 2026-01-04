import { on } from 'svelte/events'
import { untrack } from 'svelte'

// Minimal interface for what Data needs from Table to avoid circular dependency
interface TableLike {
	columns: Record<
		string,
		{
			options: {
				sort: boolean | ((a: unknown, b: unknown) => number)
				value: ((item: unknown) => unknown) | undefined
				filter: ((value: unknown) => boolean) | undefined
			}
		}
	>
}

/** Exported interface for DataInstance to avoid circular ReturnType issues */
export interface DataInstance<T = unknown> {
	readonly origin: T[]
	sorted: T[]
	filtered: T[]
	sortby: string | undefined
	sortReverse: boolean
	readonly current: T[]
	sortBy(column: string): void
	sortAction(node: HTMLElement, column: string): void
	sortTable(): void
}

export type DataProps<T = unknown> = $origin.Props<ReturnType<typeof Data<T>>>

export const Data = <T>() =>
	$origin(
		{
			props: $origin.props({
				_table: undefined as TableLike | undefined,
				_data: [] as T[],
				_filters: undefined as ((item: T) => boolean)[] | undefined,
				_reorderable: false as boolean
			}),

			// Exposed fields with $state() for reactivity
			sorted: $state([] as T[]),
			filtered: $state([] as T[]),
			sortby: $state(undefined as string | undefined),
			sortReverse: $state(false),

			get origin() {
				return this.props._data
			},

			// NOTE: `current` is accessed frequently by Virtualization
			// The getter now just returns filtered or _data directly - these are reactive
			get current() {
				return this.props._reorderable ? this.props._data : this.filtered
			},

			sortBy(column: string) {
				const table = this.props._table
				if (!table) return
				if (this.props._reorderable) return

				const columnInstance = table.columns[column]
				if (!columnInstance) return
				const { sort, value } = columnInstance.options
				if (!sort || !value) return

				if (this.sortby === column) {
					this.sortReverse = !this.sortReverse
				} else {
					this.sortReverse = false
					this.sortby = column
				}
			},

			sortAction(node: HTMLElement, column: string) {
				$effect(() =>
					on(node, 'click', () => {
						// Inline sortBy logic to work around svelte-origin transformation issue
						const table = this.props._table
						if (!table) return
						if (this.props._reorderable) return

						const columnInstance = table.columns[column]
						if (!columnInstance) return
						const { sort, value } = columnInstance.options
						if (!sort || !value) return

						if (this.sortby === column) {
							this.sortReverse = !this.sortReverse
						} else {
							this.sortReverse = false
							this.sortby = column
						}
					}),
				)
			},

			sortTable() {
				const table = this.props._table
				if (!table) return

				if (!this.sortby || this.props._reorderable) {
					this.sorted = [...this.props._data]
					return
				}

				const column = table.columns[this.sortby]
				let { sort, value } = column?.options ?? {}

				if (!sort || !value) {
					this.sorted = [...this.props._data]
					return
				}

				if (sort === true) {
					sort = (a, b) => String(a).localeCompare(String(b))
				}

				if (this.sortReverse) {
					this.sorted = this.props._data.toSorted((a, b) => sort(value(b), value(a)))
				} else {
					this.sorted = this.props._data.toSorted((a, b) => sort(value(a), value(b)))
				}
			},
		},
		function() {
			const table = this.props._table
			if (!table) return

			// Initialize from props
			this.sorted = [...this.props._data]
			this.filtered = this.sorted

			// React to data changes
			$effect(() => {
				// Track data array - both reference AND length for mutation tracking
				this.props._data
				this.props._data.length

				if (this.props._reorderable) return

				// Track sort state
				this.sortby
				this.sortReverse

				untrack(() => this.sortTable())
			})

			$effect(() => {
				if (this.props._reorderable) return

				// Track dependencies explicitly - both reference AND length for mutation tracking
				this.props._filters
				this.props._filters?.length

				const sortedArray = this.sorted
				sortedArray.length

				// Track column additions/removals by reading the keys array
				const columnKeys = Object.keys(table.columns)
				columnKeys.length
				for (const key of columnKeys) {
					table.columns[key]?.options?.filter
					table.columns[key]?.options?.value
				}

				const filters = untrack(() => {
					const all = [...(this.props._filters ?? [])] as ((item: T) => boolean)[]
					for (const key of columnKeys) {
						const col = table.columns[key]
						if (!col) continue
						const filter = col.options?.filter
						const valueOf = col.options?.value
						if (filter && valueOf) {
							all.push((item) => filter(valueOf(item)))
						}
					}
					return all
				})

				untrack(() => {
					// Always create a new array to avoid shared references
					this.filtered =
						filters.length === 0
							? [...sortedArray]
							: sortedArray.filter((value) => filters.every((filter) => filter(value)))
				})
			})
		},
	)
