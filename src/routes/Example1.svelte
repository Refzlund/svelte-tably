<script lang='ts'>
	import Table from 'svelte-tably'
	import floatingUI from 'floating-runes'
	import reorder, { type ItemState } from 'runic-reorder'

	import {faker} from '@faker-js/faker'
	import Icon from './Icon.svelte'

	function createData(size: number) {
		return Array(size).fill(null).map((_, i) => ({
			name: faker.person.fullName(),
			age: Math.floor(Math.random() * 60) + 8,
			email: faker.internet.email()
		}))
	} 

	let data = $state(createData(500))

	let panel = $state() as undefined | string

	let href = $state(undefined) as undefined | ((item: typeof data[number]) => string)
	$inspect(href)
</script>
<!---------------------------------------------------->

<div style='margin: 1rem;' >
	<button onclick={() => panel = panel ? undefined : 'columns'}>Toggle panel</button>

	<button onclick={() => data = createData(5)}>5</button>
	<button onclick={() => data = createData(50)}>50</button>
	<button onclick={() => data = createData(500)}>500</button>
	<button onclick={() => data = createData(5000)}>5000</button>
	<button onclick={() => data = createData(50000)}>50000</button>
</div>


<div style='margin: 1rem;'>
	<button onclick={() => {
		href = href ? undefined : (item) => `?name=${item.name}`
	}}>{href ? 'disable href rows' : 'enable href rows'}</button>
</div>

<div class='container' style='resize:both; overflow:auto; border: 1px solid hsla(0,0,95%); width: clamp(0px, 1200px, 95vw); height: clamp(0px, 800px, 80vh);'>
	<Table {data} bind:panel {href} selectable='hover'>
		{#snippet content({ Column, Panel, table, data })}
			<Column id='id' sticky width={100} resizeable={false}>
				{#snippet header(header)}
					{#if !header}
						<!-- Only show when rendered elsewhere -->
						ID
					{/if}
				{/snippet}
				{#snippet row(item, row)}
					<span style='width: 100%; text-align: right; padding-right: 1rem;' class:hovered={row.isHovered}>{row.index}</span>
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
			<Column id='age' width={100}>
				{#snippet header()}
					Age
				{/snippet}
				{#snippet row(item)}
					<span style='width: 100%; text-align: right; padding-right: 1rem;'>{item.age}</span>
				{/snippet}
				{#snippet statusbar()}
					<small>{data.reduce((a, b) => a + b.age, 0) / data.length} avg.</small>
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
				{#snippet children({ table })}
					{#snippet item(column: string, itemState: ItemState)}
						<div class='order' class:dragging={itemState.dragging} class:positioning={itemState.positioning}>
							<span use:itemState.handle style='display: flex; align-items: center; gap: .5rem;'>
								<Icon icon='handle' />
								{@render table.columns[column]?.header?.()}
							</span>
							<button class='visible' onclick={() => table.positions.toggle(column)}>
								{#if table.positions.hidden.includes(column)}
									<Icon icon='eye-closed' />
								{:else}
									<Icon icon='eye' />
								{/if}
							</button>
						</div>
					{/snippet}

					{@const area = reorder(item)}

					<div style='width: clamp(0%, 200px, 200px);'>
						<h3 style='margin: 0 0 1rem;'>Columns</h3>

						<div use:area={{ axis: 'y' }} style='padding-bottom: 1rem;'>
							<h4 style='margin: .25rem 0'>Sticky</h4>
							<div>
								{@render area(table.positions.sticky)}
							</div>
						</div>
						<div use:area={{ axis: 'y' }}>
							<h4 style='margin: .25rem 0'>Scroll</h4>
							<div>
								{@render area(table.positions.scroll)}
							</div>
						</div>
					</div>
				{/snippet}
			</Panel>
		{/snippet}
	</Table>
</div>


<!---------------------------------------------------->
<style>

	button.visible {
		border: none; 
		transition: .15s ease;
		cursor: pointer;
	}
	.positioning {
		button {
			opacity: 0;
		}
		span {
			opacity: 0;
		}
	}
	.dragging button {
		opacity: 0;
	}

	.hovered {
		color: skyblue;
		font-weight: bold;

		&::before {
			content: '🦒 ';
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