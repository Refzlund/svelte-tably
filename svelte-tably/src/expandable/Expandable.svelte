<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts'>

	import { ExpandableState, type ExpandableProps } from './expandable.svelte.js'
	import type { AnyRecord } from '../utility.svelte.js'
	import { fromProps } from '../utility.svelte.js'

	type T = $$Generic<AnyRecord>

	let { ...restProps }: ExpandableProps<T> = $props()
	
	const properties = fromProps(restProps)
	new ExpandableState<T>(properties)

</script>
