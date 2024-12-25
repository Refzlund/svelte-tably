<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang="ts">

	import { fromProps } from '$lib/utility.svelte.js'
	import { ColumnState, type ColumnProps } from './column.svelte.js'

	type T = $$Generic<Record<PropertyKey, any>>
	type V = $$Generic

	let {...props}: ColumnProps<T, V> = $props()
	const properties = fromProps(props)
	
	new ColumnState<T, V>(properties)
	
</script>