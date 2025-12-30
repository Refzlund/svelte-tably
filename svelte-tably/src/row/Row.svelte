<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts'>
	import { onDestroy } from 'svelte'
	import { RowState, type RowProps } from './row-state.svelte.js'

	type T = $$Generic

	type $$Props = RowProps<T>
	let row = $attrs.origin(RowState<T>())

	// Workaround for svelte-origin not calling cleanup on component destroy
	onDestroy(() => {
		if (typeof row.cleanup === 'function') {
			row.cleanup()
		}
	})
</script>
