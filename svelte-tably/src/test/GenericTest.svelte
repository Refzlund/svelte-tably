<script lang="ts" generics="T">
	import { TestOrigin } from './generic-test-state.svelte.js'

	let state = $origin.component(TestOrigin<T>())
</script>

<p>{state.props.label}</p>
