<script lang='ts'>
	import { Table, Panel } from '$lib/index.js'

	import {faker} from '@faker-js/faker'

	function createData(size: number) {
		return Array(size).fill(null).map((_, i) => ({
			name: faker.person.fullName(),
			age: Math.floor(Math.random() * 60) + 18,
			email: faker.internet.email()
		}))
	} 

	let data = $state(createData(500))

	let panel = $state('Columns') as undefined | string

</script>
<!---------------------------------------------------->

<button style='margin: 1rem;' onclick={() => panel = panel ? undefined : 'Columns'}>Toggle panel</button>

<button onclick={() => data = createData(5)}>5</button>
<button onclick={() => data = createData(500)}>500</button>
<button onclick={() => data = createData(5000)}>5000</button>
<button onclick={() => data = createData(50000)}>50000</button>

<div class='container' style='resize:both; overflow:auto; border: 1px solid hsla(0,0,95%); width: clamp(0px, 1200px, 95vw); height: clamp(0px, 800px, 80vh);'>
	<Table {data} {panel}>
		<!-- 
		{#snippet content({ Column, Panel, table, sort })}
			<Column.Name sticky sort sorting={sort.localeCompare(item => item.name)} sorting={(a, b) => a.name.localeCompare(b.name)}>
			<Column id='Name' ...> <--- Is better, restrict to this.
		-->
		<Table.Name sticky sort>
			{#snippet header()}
				Name
			{/snippet}
			{#snippet row(item)}
				{item.name}
			{/snippet}
			{#snippet statusbar(data)}
				<small>{data.length} people</small>
			{/snippet}
		</Table.Name>
		<Table.Age>
			{#snippet header()}
				Age
			{/snippet}
			{#snippet row(item)}
				{item.age}
			{/snippet}
			{#snippet statusbar(data)}
				<small>{data.reduce((a, b) => a + b.age, 0) / data.length} avg. age</small>
			{/snippet}
		</Table.Age>
		<Table.Email>
			{#snippet header()}
				E-mail
			{/snippet}
			{#snippet row(item)}
				{item.email}
			{/snippet}
		</Table.Email>
		<Table.Virtual show={false} value={(row) => row.age > 18}>
			{#snippet header()}
				Maturity
			{/snippet}
			{#snippet row(row, virtual)}
				{virtual ? 'Adult' : 'Adolescent'}
			{/snippet}
		</Table.Virtual>
		<Panel.Columns>
			{#snippet children(table)}
				<div style='width: clamp(0%, 200px, 200px);'>
					<h3 style='margin: 0 0 1rem;'>Columns</h3>

					<h4 style='margin: .25rem 0'>Sticky</h4>
					{#each table.positions.sticky as column}
						<div class='order'>
							<span>{column}</span>
							<button onclick={() => table.positions.toggle(column)}>
								{#if table.positions.hidden.includes(column)}
									Show
								{:else}
									Hide
								{/if}
							</button>
						</div>
					{/each}

					<h4 style='margin: 1rem 0 .25rem'>Scroll</h4>
					{#each table.positions.scroll as column}
						<div class='order'>
							<span>{column}</span>
							<button onclick={() => table.positions.toggle(column)}>
								{#if table.positions.hidden.includes(column)}
									Show
								{:else}
									Hide
								{/if}
							</button>
						</div>
					{/each}
				</div>
			{/snippet}
		</Panel.Columns>
	</Table>
</div>


<!---------------------------------------------------->
<style>
	
	.container {
		padding: 1rem;
	}

	.order {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: .5rem;
	}

</style>