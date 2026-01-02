<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts' generics='T'>
	import { onMount, onDestroy } from 'svelte'
	import { PanelState, type PanelProps } from './panel-state.svelte.js'

	type $$Props = PanelProps<T>
	let panel = $origin.component(PanelState<T>())

	// Initialize panel on mount (runs once)
	onMount(() => {
		if (typeof panel.init === 'function') {
			panel.init()
		}
	})

	onDestroy(() => {
		if (typeof panel.cleanup === 'function') {
			panel.cleanup()
		}
	})
</script>