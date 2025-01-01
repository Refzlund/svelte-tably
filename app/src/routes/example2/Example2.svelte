<script lang='ts'>
	
	import Table from 'svelte-tably'
	
	let data = $state([
		{ name: 'Dog', age: 12 },
		{ name: 'Shiba', age: 21 },
		{ name: 'Cat', age: 28 },
		{ name: 'Pig', age: 10 },
		{ name: 'Crow', age: 30 },
		{ name: 'Giraffe', age: 26 },
	])

</script>


<div class="container">
	<Table auto {data} reorderable resizeable={false} />
</div>

<ol>
	{#each data.map(v => v.name) as name}
		<li>{name}</li>
	{/each}
</ol>

<style>

	.container {
		padding: 2.5rem;
	}

</style>