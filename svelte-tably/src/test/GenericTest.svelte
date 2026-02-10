<script lang="ts" generics="T">
	// Minimal origin for testing
	const TestOrigin = <T>() => $origin({
		props: $origin.props({
			items: $bindable([] as T[]),
			label: 'test' as string
		})
	})

	let state = $origin.component(TestOrigin<T>())
</script>

<p>{state.props.label}</p>
