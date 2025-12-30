<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts'>
	import { onDestroy } from 'svelte'
	import { ExpandableState, type ExpandableProps } from './expandable-state.svelte.js'

	type T = $$Generic

	type $$Props = ExpandableProps<T>
	let expandable = $attrs.origin(ExpandableState<T>())

	// Workaround for svelte-origin not calling cleanup on component destroy
	onDestroy(() => {
		if (typeof expandable.cleanup === 'function') {
			expandable.cleanup()
		}
	})
</script>
