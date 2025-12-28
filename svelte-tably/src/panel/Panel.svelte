<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts' generics='T'>
	import { onDestroy } from 'svelte'
	import { PanelState, type PanelProps } from './panel-state.svelte.js'

	type $$Props = PanelProps<T>
	let panel = $attrs.origin(PanelState<T>())

	// Workaround for svelte-origin not calling cleanup on component destroy
	onDestroy(() => {
		if (typeof panel.cleanup === 'function') {
			panel.cleanup()
		}
	})
</script>