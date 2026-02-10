<script lang="ts">
	import List from '$lib/List.svelte'

	let numbers = $state([1, 2, 3])
	let strings = $state(['a', 'b', 'c'])
</script>

<h1>Generic Test</h1>

<List items={numbers} label="Numbers" />
<List items={strings} label="Strings" />
