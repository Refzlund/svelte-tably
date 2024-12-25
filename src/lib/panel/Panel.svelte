<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>

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

	import { Tween } from 'svelte/motion'
	import { sineInOut } from 'svelte/easing'
	import { PanelState, type PanelProps } from './panel.svelte.js'
	import { fromProps } from '$lib/utility.svelte.js'

	let {...props}: PanelProps<T> = $props()
	const properties = fromProps(props)

	new PanelState<T>(properties)

</script>