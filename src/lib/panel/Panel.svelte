<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import { Tween } from 'svelte/motion'
	import { sineInOut } from 'svelte/easing'
	import { PanelState, type PanelProps } from './panel.svelte.js'
	import { fromProps } from '$lib/utility.svelte.js'

	let {...props}: PanelProps<T> = $props()
	const properties = fromProps(props)

	new PanelState<T>(properties)

</script>