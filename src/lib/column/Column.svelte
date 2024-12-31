<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang="ts">

	import { fromProps, type AnyRecord } from '$lib/utility.svelte.js'
	import type { Snippet } from 'svelte'
	import { ColumnState, type ColumnProps, type HeaderCtx, type ColumnSnippets } from './column.svelte.js'

	type T = $$Generic<Record<PropertyKey, any>>
	type V = $$Generic

	let {...props}: ColumnProps<T, V> = $props()
	const properties = fromProps(props)
	
	new ColumnState<T, V>(properties)
	
</script>

<script module lang='ts'>
	
	declare const defaultHeader: <T extends AnyRecord>(anchor: unknown, title: () => string, ctx: HeaderCtx<T>) => ReturnType<Snippet>
	
	export function getDefaultHeader<T extends AnyRecord,V>(title: string) {
		return (
			(anchor: unknown, ctx: HeaderCtx<T>) => defaultHeader<T>(anchor, () => title, ctx)
		) as Exclude<ColumnSnippets<T, V>['header'], string>
	}

</script>

{#snippet defaultHeader(title: string, ctx: HeaderCtx<T>)}
	{title}
{/snippet}