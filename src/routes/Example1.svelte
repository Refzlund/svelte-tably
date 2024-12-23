<script lang='ts'>
	import Table from 'svelte-tably'
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

	let data = $state(createData(50))	

	let panel = $state() as undefined | string

	let href = $state(undefined) as undefined | ((item: typeof data[number]) => string)

	let selectable = $state(true)

	let search = $state('')
</script>
<!---------------------------------------------------->

<div style='margin: 1rem;' >
	<button onclick={() => panel = panel ? undefined : 'columns'}>Toggle panel</button>
	<button onclick={() => selectable = !selectable}>Toggle selectability</button>

	<button onclick={() => data = createData(5)}>5</button>
	<button onclick={() => data = createData(50)}>50</button>
	<button onclick={() => data = createData(500)}>500</button>
	<button onclick={() => data = createData(5000)}>5000</button>
	<button onclick={() => data = createData(50000)}>50000</button>

	<div>
		<button onclick={() => {
			href = href ? undefined : (item) => `?name=${item.name}`
		}}>{href ? 'disable href rows' : 'enable href rows'}</button>
	</div>

	<div>
		<input bind:value={search} placeholder="Search name">
	</div>
</div>

<div class='container'>
	<Table {data} bind:panel {href} select={selectable}>
		{#snippet content({ Column, Panel, table, data })}
			<Column id='name' sticky sortby value={r => r.name} sort filter={(v) => v.includes(search)}>
				{#snippet header()}
					Name
				{/snippet}
				{#snippet row(item, row)}
					<span class:hovered={row.isHovered}>{item.name}</span>
				{/snippet}
				{#snippet statusbar()}
					<small>{data.length} people</small>
				{/snippet}
			</Column>
			<Column id='age' width={100} value={r => r.age} sort={(a, b) => a - b}>
				{#snippet header()}
					Age
				{/snippet}
				{#snippet row(item)}
					<span style='width: 100%; text-align: right; padding-right: 1rem; font-variant-numeric: tabular-nums;'>{item.age}</span>
				{/snippet}
				{#snippet statusbar()}
					<small>{data.reduce((a, b) => a + b.age, 0) / data.length} avg.</small>
				{/snippet}
			</Column>
			<Column id='email' value={r => r.email} sort>
				{#snippet header()} E-mail {/snippet}
				{#snippet row(item)} {item.email} {/snippet}
			</Column>
			<Column id='virtual-item-that-does-not-exist-in-data' value={row => row.age > 18} sort={(a,b) => Number(a) - Number(b)}>
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

					<div style='width: clamp(0%, 200px, 200px); text-align: center;'>
						<h3 style='margin: 0 0 1rem;'>Columns</h3>

						<div use:area={{ axis: 'y' }} style='padding-bottom: 1rem;'>
							<h4 style='margin: .25rem 0'>Sticky</h4>
							<div>
								{@render area(table.positions.sticky)}
							</div>
						</div>
						<div use:area={{ axis: 'y' }}>
							<h4 style='margin: .0 0 .25rem 0'>Scroll</h4>
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

	:global(body.dark .svelte-tably) {
		--tably-bg: hsla(0, 0%, 15%);
		--tably-color: white;
		--tably-border: hsla(0, 0%, 50%, .2);
		--tably-statusbar: hsla(0, 0%, 13%);
	}

	button.visible {
		border: none; 
		transition: .15s ease;
		cursor: pointer;
		background-color: transparent;
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
		padding: 1rem 3rem;
		resize:both; 
		overflow:auto; 
		border: 1px solid hsla(0,0,95%); 
		width: clamp(0px, 1200px, 90vw); 
		height: clamp(0px, 800px, 80vh);
	}

	.order {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: .5rem;
	}

</style>