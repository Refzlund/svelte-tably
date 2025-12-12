import { untrack } from 'svelte'
import type { TableState } from './table-state.svelte.js'

export class Virtualization<T extends any> {
	scrollTop = $state(0)

	viewport = $state({
		height: 0,
		element: null as HTMLElement | null
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

		let measureRaf = 0
		let measureRun = 0
		$effect(() => {
			if (!ticked) return
			table.dataState.current
			this.viewport.element
			this.viewport.height

			let aborted = false
			const run = ++measureRun
			untrack(() => {
				const target = this.viewport.element
				if (!target) {
					this.#heightPerItem = 8
					return
				}

				if (measureRaf) cancelAnimationFrame(measureRaf)
				measureRaf = requestAnimationFrame(() => {
					if (aborted) return
					if (run !== measureRun) return

					const el = this.viewport.element
					if (!el) return

					const rowEls = el.querySelectorAll(':scope > tr.row') as NodeListOf<HTMLElement>
					const children = rowEls.length > 0 ? rowEls : (el.children as unknown as HTMLCollectionOf<HTMLElement>)
					const count = children.length
					if (count === 0) return

					const first = children[0]?.getBoundingClientRect().top
					const last = children[count - 1]?.getBoundingClientRect().bottom
					if (first === undefined || last === undefined) return

					const height = (last - first) / count
					if (!Number.isFinite(height) || height <= 0) return

					// Avoid tiny oscillations causing endless updates.
					if (Math.abs(height - this.#heightPerItem) < 0.25) return
					this.#heightPerItem = height
				})
			})

			return () => {
				aborted = true
				if (measureRaf) cancelAnimationFrame(measureRaf)
			}
		})

		let virtualRaf = 0
		$effect(() => {
			if (!ticked) return
			this.scrollTop
			this.#heightPerItem
			this.viewport.height
			table.dataState.current.length
			untrack(() => {
				if (virtualRaf) cancelAnimationFrame(virtualRaf)
				virtualRaf = requestAnimationFrame(() => {
					virtualRaf = 0
					const heightPerItem = this.#heightPerItem || 8
					const spacing = this.#spacing

					let virtualTop = Math.max(this.scrollTop - spacing, 0)
					if (heightPerItem > 0) {
						virtualTop -= virtualTop % heightPerItem
					}
					this.#virtualTop = virtualTop

					let virtualBottom = heightPerItem * table.dataState.current.length - virtualTop - spacing * 4
					if (!Number.isFinite(virtualBottom)) virtualBottom = 0
					this.#virtualBottom = Math.max(virtualBottom, 0)
				})
			})

			return () => {
				if (virtualRaf) cancelAnimationFrame(virtualRaf)
			}
		})

		$effect(() => {
			if (!ticked) return
			table.dataState.sortReverse
			table.dataState.sortby
			this.#heightPerItem
			this.#virtualTop
			this.viewport.height
			this.#renderItemLength
			table.dataState.current.length
			table.dataState.current
			untrack(() => {
				const heightPerItem = this.#heightPerItem || 8
				this.#topIndex = Math.round(this.#virtualTop / heightPerItem || 0)
				if (this.#topIndex < 0) this.#topIndex = 0
				const end = this.#topIndex + this.#renderItemLength
				this.#area = table.dataState.current.slice(this.#topIndex, end)
			})
		})
	}
}
