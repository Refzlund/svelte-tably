<script lang='ts'>
	
	import Table from 'svelte-tably'
	
	let data = $state([
		{ name: 'Giraffe', age: 26 },
		{ name: 'Shiba', age: 21 },
		{ name: 'Cat', age: 16 },
		{ name: 'Dog', age: 12 },
		{ name: 'Pig', age: 10 },
	])

</script>


<div class="container">
	<div>{data.map(v => v.name)}</div>

	<Table {data} reorderable resizeable={false}>
		{#snippet content({ Column })}
			<Column id='name'>
				{#snippet header()}
					Name
				{/snippet}
				{#snippet row(item)}
					{item.name}
				{/snippet}
			</Column>
			<Column id='age'>
				{#snippet header()}
					Age
				{/snippet}
				{#snippet row(item)}
					{item.age}
				{/snippet}
			</Column>
		{/snippet}
	</Table>
</div>

<style>

	.container {
		padding: 2.5rem;
	}

</style>