<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>

	export function getDefaultHeader<T extends AnyRecord,V>(title: string) {
		return (
			(anchor: Comment) => snippetLiteral(defaultHeader)(anchor, () => title)
		) as unknown as () => any
	}

</script>

<script lang='ts'>

	import { fromProps, snippetLiteral, type AnyRecord } from '../utility.svelte.js'
	import { ColumnState, type ColumnProps, type HeaderCtx, type ColumnSnippets } from './column-state.svelte.js'

	type T = $$Generic<Record<PropertyKey, any>>
	type V = $$Generic

	let {...props}: ColumnProps<T, V> = $props()
	const properties = fromProps(props)
	
	new ColumnState<T, V>(properties)
	
</script>


{#snippet defaultHeader(title: string)}
	{title}
{/snippet}