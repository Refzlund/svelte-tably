<script lang="ts" generics="T">
	import { ListState } from './list-state.svelte.js'

	let list = $origin.component(ListState<T>())
</script>

<div>
	<h2>{list.props.label}</h2>
	<p>Count: {list.count}</p>
	<ul>
		{#each list.props.items as item}
			<li>{item}</li>
		{/each}
	</ul>
</div>
