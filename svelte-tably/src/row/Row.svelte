<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts'>

	import { RowState, type RowProps } from './row-state.svelte.js'
	import type { AnyRecord } from '../utility.svelte.js'
	import { fromProps } from '../utility.svelte.js'

	type T = $$Generic<AnyRecord>

	let { ...restProps }: RowProps<T> = $props()
	
	const properties = fromProps(restProps)
	new RowState<T>(properties)

</script>
