<script lang='ts'>
	import Table from 'svelte-tably'

	import {faker} from '@faker-js/faker'

	function createData(size: number) {
		return Array(size).fill(null).map((_, i) => ({
			name: faker.person.fullName(),
			age: Math.floor(Math.random() * 60) + 18,
			email: faker.internet.email()
		}))
	} 

	let data = $state(createData(500))

	let panel = $state('columns') as undefined | string

</script>
<!---------------------------------------------------->

<button style='margin: 1rem;' onclick={() => panel = panel ? undefined : 'columns'}>Toggle panel</button>

<button onclick={() => data = createData(5)}>5</button>
<button onclick={() => data = createData(50)}>50</button>
<button onclick={() => data = createData(500)}>500</button>
<button onclick={() => data = createData(5000)}>5000</button>
<button onclick={() => data = createData(50000)}>50000</button>

<div class='container' style='resize:both; overflow:auto; border: 1px solid hsla(0,0,95%); width: clamp(0px, 1200px, 95vw); height: clamp(0px, 800px, 80vh);'>
	<Table {data} bind:panel>
	<!-- <Table href={item => `?id={${item.id}}`}>  left-clickable rows  -->
		{#snippet content({ Column, Panel, state, data })}
			<Column id='id' sticky width={100}>
				{#snippet row(item, row)}
					<span class:hovered={row.isHovered}>{row.index}</span>
				{/snippet}
			</Column>
			<Column id='name' sticky sort>
				{#snippet header()}
					Name
				{/snippet}
				{#snippet row(item, row)}
					{item.name}
				{/snippet}
				{#snippet statusbar()}
					<small>{data.length} people</small>
				{/snippet}
			</Column>
			<Column id='age'>
				{#snippet header()}
					Age
				{/snippet}
				{#snippet row(item)}
					{item.age}
				{/snippet}
				{#snippet statusbar()}
					<small>{data.reduce((a, b) => a + b.age, 0) / data.length} avg. age</small>
				{/snippet}
			</Column>
			<Column id='email'>
				{#snippet header()}
					E-mail
				{/snippet}
				{#snippet row(item)}
					{item.email}
				{/snippet}
			</Column>
			<Column id='virtual-item-that-does-not-exist-in-data' value={row => row.age > 18} show={false}>
				{#snippet header()}
					Maturity
				{/snippet}
				{#snippet row(item, row)}
					{row.value ? 'Adult' : 'Adolescent'}
				{/snippet}
			</Column>

			<Panel id='columns'>
				<div style='width: clamp(0%, 200px, 200px);'>
					<h3 style='margin: 0 0 1rem;'>Columns</h3>

					<h4 style='margin: .25rem 0'>Sticky</h4>
					{#each state.positions.sticky as column}
						<div class='order'>
							<span>{@render state.columns[column]?.header?.()}</span>
							<button onclick={() => state.positions.toggle(column)}>
								{#if state.positions.hidden.includes(column)}
									Show
								{:else}
									Hide
								{/if}
							</button>
						</div>
					{/each}

					<h4 style='margin: 1rem 0 .25rem'>Scroll</h4>
					{#each state.positions.scroll as column}
						<div class='order'>
							<span>{@render state.columns[column]?.header?.()}</span>
							<button onclick={() => state.positions.toggle(column)}>
								{#if state.positions.hidden.includes(column)}
									Show
								{:else}
									Hide
								{/if}
							</button>
						</div>
					{/each}
				</div>
			</Panel>
		{/snippet}
	</Table>
</div>


<!---------------------------------------------------->
<style>

	.hovered {
		color: skyblue;
		font-weight: bold;

		&::after {
			content: ' 🦒';
		}
	}
	
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