import { tick, untrack } from 'svelte'
import type { TableState } from './table-state.svelte.js'

export class Virtualization<T extends Record<PropertyKey, unknown>> {
	scrollTop = $state(0)

	viewport = $state({
		height: 0,
		element: null as HTMLDivElement | null
	})

	get topIndex() { return this.#topIndex }
	get virtualTop() { return this.#virtualTop }
	get virtualBottom() { return this.#virtualBottom }
	get area() { return this.#area }

	#topIndex = 0
	#heightPerItem = $state(8)
	#virtualTop = $state(0)
	#virtualBottom = $state(0)
	#area = $state([]) as T[]
	#spacing = $derived(this.viewport.height / 2)
	#renderItemLength = $derived(Math.ceil(Math.max(30, (this.viewport.height / this.#heightPerItem) * 2)))

	constructor(table: TableState<T>) {
		let ticked = $state(false)
		$effect.pre(() => {
			table.dataState.origin
			untrack(() => {
				ticked = false
				requestAnimationFrame(() => ticked = true)
			})
		})

		$effect(() => {
			if (!ticked) return
			table.dataState.current
			untrack(() => {
				if (!this.viewport.element) {
					this.#heightPerItem = 8
					return
				}
				tick().then(() => {
					const target = this.viewport.element!
					if (target.children.length === 0) return
					const firstRow = target.children[0]?.getBoundingClientRect().top
					const lastRow =
						target.children[target.children.length - 1].getBoundingClientRect().bottom
					this.#heightPerItem = (lastRow - firstRow) / this.#area.length
				})
			})
		})

		let waitAnimationFrame = false

		$effect(() => {
			if (!ticked) return
			this.scrollTop
			this.#heightPerItem
			table.dataState.current.length
			table.dataState.current
			untrack(() => {
				if (!waitAnimationFrame) {
					setTimeout(() => {
						waitAnimationFrame = false

						let virtualTop = Math.max(this.scrollTop - this.#spacing, 0)
						virtualTop -= virtualTop % this.#heightPerItem

						this.#virtualTop = virtualTop

						let virtualBottom = this.#heightPerItem * table.dataState.current.length - virtualTop - this.#spacing * 4
						virtualBottom = Math.max(virtualBottom, 0)
						this.#virtualBottom = virtualBottom
					}, 1000 / 60)
				}
				waitAnimationFrame = true
			})
		})

		$effect(() => {
			if (!ticked) return
			table.dataState.sortReverse
			table.dataState.sortby
			this.#heightPerItem
			this.#virtualTop
			table.dataState.current.length
			table.dataState.current
			untrack(() => {
				this.#topIndex = Math.round(this.#virtualTop / this.#heightPerItem || 0)
				const end = this.#topIndex + this.#renderItemLength
				this.#area = table.dataState.current.slice(this.#topIndex, end)
			})
		})
	}
}
