<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface Panel {
		/** A darkened backdrop? */
		backdrop: boolean
		content: Snippet<[table: TableState]>
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

		constructor(cb: () => string | undefined) {
			$effect.pre(() => {
				this.target = cb() ? this.width : 0
			})
		}
	}

</script>

<script lang='ts'>

	import { onDestroy, type Snippet } from 'svelte'
	import { getTableState, type TableState } from './Table.svelte'
	import { Tween } from 'svelte/motion'
	import { sineInOut } from 'svelte/easing'

	interface Props {
		/** A darkened backdrop? */
		backdrop?: boolean
		children: Snippet<[table: TableState]>
	}

	let {
		backdrop = true,
		children,
		...rest
	}: Props = $props()
	const key = (rest as unknown as { __key: string }).__key
	
	const panel: Panel = $state({
		backdrop,
		content: children
	})

	const table = getTableState()
	table.panels[key] = panel

	onDestroy(() => {
		delete table.panels[key]
	})

</script>