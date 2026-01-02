import { untrack } from 'svelte'
import type { TableInstance } from './table-state.svelte.js'

export class Virtualization<T> {
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

	constructor(table: TableInstance<T>) {
		/**
		 * Version counter that increments when a tick cycle completes.
		 * Used in combination with `ticked` to defer virtualization calculations
		 * until after DOM updates have flushed. Incrementing the version ensures
		 * effects re-run even if ticked was already true from a previous cycle.
		 */
		let tickVersion = $state(0)
		let ticked = $state(false)
		$effect.pre(() => {
			if (!table.dataState) return
			// Track current instead of origin - current is what we actually render
			table.dataState.current
			untrack(() => {
				ticked = false
				requestAnimationFrame(() => {
					ticked = true
					tickVersion++
				})
			})
		})

		let measureRaf = 0
		let measureRun = 0
		$effect(() => {
			// Track version BEFORE early returns to ensure effect re-runs when tick completes
			void tickVersion
			if (!ticked) return
			if (!table.dataState) return
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
			// Track version BEFORE early returns to ensure effect re-runs when tick completes
			void tickVersion
			if (!ticked) return
			if (!table.dataState) return
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
			// Track version BEFORE early returns to ensure effect re-runs when tick completes
			void tickVersion
			if (!ticked) return
			if (!table.dataState) return
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
