<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface Panel<T extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>> {
		/** A darkened backdrop? */
		backdrop: boolean
		content: Snippet<[context: { readonly table: TableState<T>, readonly data: T[] }]>
	}

	export class PanelTween {
		#tween = new Tween(0, { duration: 300, easing: sineInOut })
		current = $derived(this.#tween.current)
		transitioning = $state(false)

		/** bind:clientWidth */
		width = $state(0)

		set target(value: number) {
			this.transitioning = true
			this.#tween.set(value).then(() => this.transitioning = false)
		}

		constructor(cb: () => string | undefined, added = 0) {
			$effect.pre(() => {
				this.target = cb() ? this.width + added : 0
			})
		}
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import { onDestroy, type Snippet } from 'svelte'
	import Table, { getTableState, type TableState } from './Table.svelte'
	import { Tween } from 'svelte/motion'
	import { sineInOut } from 'svelte/easing'

	interface Props {
		id: string

		/** A darkened backdrop? */
		backdrop?: boolean
		children: Snippet<[context: { readonly table: TableState<T>, readonly data: T[] }]>
	}

	let {
		backdrop = true,
		children,
		id
	}: Props = $props()

	const panel: Panel<T> = $state({
		backdrop,
		content: children
	})

	const table = getTableState()
	table.panels[id] = panel

	onDestroy(() => {
		delete table.panels[id]
	})

</script>