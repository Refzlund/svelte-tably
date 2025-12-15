<script lang="ts">
	import Table, { type ColumnState } from 'svelte-tably'
	import reorder, { type ItemState } from 'runic-reorder'

	import { faker } from '@faker-js/faker'
	import Icon from './Icon.svelte'

	function createData(size: number) {
		return Array(size).fill(null).map(person)
	}

	function person() {
		return {
			name: faker.person.fullName(),
			age: Math.floor(Math.random() * 60) + 8,
			email: faker.internet.email()
		}
	}

	function download(filename: string, text: string) {
		var element = document.createElement('a')
		element.setAttribute('href', 'data:text/plaincharset=utf-8,' + encodeURIComponent(text))
		element.setAttribute('download', filename)

		element.style.display = 'none'
		document.body.appendChild(element)

		element.click()

		document.body.removeChild(element)
	}

	type T = ReturnType<typeof createData>[number]
	type Person = {
		name: string
		age: number
		email: string
	}
	let data = $state(createData(500)) as Person[]

	let panel = $state() as undefined | string

	let selectable = $state(true)

	let search = $state('')

	let filters = $state([]) as ((item: (typeof data)[number]) => boolean)[]

	type TableElement = {
		toCSV: (options?: any) => Promise<string>
	}
	let tableElement = $state() as TableElement | undefined

	let edit = $state({}) as ReturnType<typeof person>
</script>

<!---------------------------------------------------->

<div class='controls' style="margin: 1rem;">
	<button
		onclick={() => 
			tableElement?.toCSV({
				semicolon: true
			})?.then((v) => download('table.csv', v))
		}
	> Get CSV </button>
	<button
		onclick={() => 
			tableElement?.toCSV({
				semicolon: true,
				filters: [(c: (typeof data)[number]) => c.email.endsWith('@gmail.com')],
				columns: ['name', 'email'],
			})?.then((v) => download('table.csv', v))
		}
	> Get CSV (gmail only) </button>
	<button onclick={() => (panel = panel ? undefined : 'columns')}>Toggle panel</button>
	<button onclick={() => (selectable = !selectable)}>Toggle selectability</button>

	<button onclick={() => (data = createData(0))}>0</button>
	<button onclick={() => (data = createData(5))}>5</button>
	<button onclick={() => (data = createData(50))}>50</button>
	<button onclick={() => (data = createData(500))}>500</button>
	<button onclick={() => (data = createData(5000))}>5000</button>
	<button onclick={() => (data = createData(50000))}>50000</button>


	<div>
		<input bind:value={search} placeholder="Search name" />
		<button
			onclick={() => {
				if (filters.length > 0) {
					return (filters = [])
				}
				filters = [(item) => item.age < 18, (item) => item.email.endsWith('gmail.com')]
			}}
		>
			Toggle filter array
		</button>
	</div>
</div>

<div class="container">
	<Table
		id='a-table'
		bind:this={tableElement}
		{data}
		{filters}
		{panel}
		select={selectable}
	>
		{#snippet content({ Column, Panel, Expandable, Row, table })}
			<Column
				id="id"
				sticky
				show={false}
				width={100}
				resizeable={false}
				onclick={(_, r) => (r.expanded = !r.expanded)}
			>
				{#snippet header(ctx)}
					{#if !ctx.header}
						<!-- Only show when rendered elsewhere -->
						ID
					{/if}
				{/snippet}
				{#snippet row(item, row)}
					<span
						style="width: 100%; text-align: right; padding-right: 1rem;"
						class:hovered={row.rowHovered}
					>
						{row.index + 1}
						<!-- {row.itemState.position?.y.toFixed(0)} -->
					</span>
				{/snippet}
			</Column>
			<Column
				id='name'
				width={200}
				sticky
				sortby
				header='Name'
				value={(r) => r.name}
				sort
				filter={(v) => v.includes(search)}
				style='font-weight: 500; cursor: pointer;'
				pad='row'
			>
				{#snippet row(item, ctx)}
					<a class='href' href='https://youtu.be/dQw4w9WgXcQ' target='_blank' style='width: 100%;'>
						{ctx.value}
						{#if ctx.rowHovered}
							<span><Icon icon='href' /></span>
						{/if}
					</a>
				{/snippet}
				{#snippet statusbar()}
					<small>{table.data.length} people</small>
				{/snippet}
			</Column>
			<Column id="age" width={100} value={(r) => r.age} sort={(a, b) => a - b}>
				{#snippet header()}
					Age
				{/snippet}
				{#snippet row(item)}
					<span
						style="width: 100%; text-align: right; padding-right: 1rem; font-variant-numeric: tabular-nums;"
						>{item.age}</span
					>
				{/snippet}
				{#snippet statusbar()}
					<small>{(table.data.reduce((a, b) => a + b.age, 0) / table.data.length).toFixed(2)} avg.</small
					>
				{/snippet}
			</Column>
			<Column id="email" width={275} header="E-mail" value={(r) => r.email} sort />
			<Column
				id="virtual-item-that-does-not-exist-in-data"
				value={(r) => r.age > 18}
				sort={(a, b) => Number(a) - Number(b)}
			>
				{#snippet header()}
					Maturity
				{/snippet}
				{#snippet row(item, ctx)}
					{ctx.value ? 'Adult' : 'Adolescent'}
				{/snippet}
			</Column>

			<Row
				contextOptions={{ hover: true }}
				oncontextmenu={(e) => {
					e.preventDefault()
				}}
			>
				{#snippet contextHeader()}
					<button class="more add" tabindex="-1" onclick={() => { panel = 'modify'; edit = {} as any }}>
						<Icon icon="add" />
					</button>
				{/snippet}
				{#snippet context(item, ctx)}
					<button class="more" tabindex="-1" onclick={() => { panel = 'modify'; edit = item }}>
						<Icon icon="more" />
					</button>
				{/snippet}
			</Row>

			<Expandable click={false}>
				{#snippet content(item, ctx)}
					<div class="details">
						<div>
							<h5>Name</h5>
							{item.name}
						</div>
						<div>... and so on</div>
					</div>
				{/snippet}
			</Expandable>

			<Panel id="columns">
				{#snippet children()}
					{#snippet item(column: ColumnState, itemState: ItemState)}
						<div
							class="order"
							class:dragging={itemState.dragging}
							class:positioning={itemState.positioning}
						>
							<span use:itemState.handle style="display: flex; align-items: center; gap: .5rem;">
								<Icon icon="handle" />
								{@render column.snippets.title()}
							</span>
							<button class="visible" onclick={() => column.toggleVisiblity()}>
								{#if table.positions.hidden.includes(column)}
									<Icon icon="eye-closed" />
								{:else}
									<Icon icon="eye" />
								{/if}
							</button>
						</div>
					{/snippet}
					{#if item}
						{@const area = reorder(item)}

						<div style="width: clamp(0%, 200px, 200px); text-align: center; padding: 1rem;">
							<h3 style="margin: 0 0 1rem;">Columns</h3>

							<div use:area={{ axis: 'y' }} style="padding-bottom: 1rem;">
								<h4 style="margin: .25rem 0">Sticky</h4>
								<div>
									{@render area(table.positions.sticky)}
								</div>
							</div>
							<div use:area={{ axis: 'y' }}>
								<h4 style="margin: .0 0 .25rem 0">Scroll</h4>
								<div>
									{@render area(table.positions.scroll)}
								</div>
							</div>
						</div>
					{/if}
				{/snippet}
			</Panel>
			<Panel id='modify' backdrop={false}>
				{@const adding = !table.dataState.origin.includes(edit)}
				<form onsubmit={e => {
					e.preventDefault()
					data.push(edit)
				}}>
					<h3>{adding ? 'Add Person' : edit.name}</h3>
					<label>Name <input bind:value={edit.name} /></label>
					<label>Age <input type="number" bind:value={edit.age} /></label>
					<label>E-mail <input bind:value={edit.email} /></label>
					{#if adding}
						<button type='submit' style='margin: .5rem 0'>Add Person</button>
					{/if}
					<button type='button' style='margin: .5rem 0' onclick={() => panel = undefined}>Close</button>
				</form>
			</Panel>
		{/snippet}
	</Table>
</div>

<!---------------------------------------------------->
<style lang='postcss'>

	:global(body.dark) {
		--tably-bg: hsla(0, 0%, 15%);
		--tably-color: white;
		--tably-border: hsla(0, 0%, 50%, 0.2);
		--tably-border-grid: hsla(0, 0%, 50%, 0.1);
		--tably-statusbar: hsla(0, 0%, 13%);

		/* Note: Lots of styling stuff. Anything below is kind of irrelevant. */

		.details {
			background-color: hsl(0, 0%, 12%);
		}

		.more:hover {
			background-color: hsl(0, 0%, 20%);
		}

		.controls button, form button {
			background-color: hsl(0, 0%, 20%);
			border: 1px solid hsl(0, 0%, 40%);
			&:hover {
				background-color: hsl(0, 0%, 25%);
			}
			&[type='submit'] {
				background-color: hsl(220, 50%, 47%);
				&:hover {
					background-color: hsl(220, 50%, 52%);
				}
			}
		}
		input {
			border: 1px solid hsl(0, 0%, 40%);
			&:focus {
				border: 1px solid hsl(220, 50%, 60%);
			}
		}
	}

	.container :global(table) {
		height: 100%;
	}

	input {
		padding: .5rem;
		font-size: 1rem;
		border-radius: var(--tably-radius);
		border: 1px solid hsl(0, 0%, 80%);
		&:focus {
			border: 1px solid hsl(220, 50%, 60%);
			outline: none;
		}
	}

	.controls button, form button {
		padding: .5rem 1rem;
		outline: none;
		border-radius: var(--tably-radius);
		border: 1px solid hsl(0, 0%, 80%);
		background-color: hsl(0, 00%, 97%);
		cursor: pointer;

		&[type='submit'] {
			background-color: hsl(220, 50%, 55%);
			color: white;
			&:hover {
				background-color: hsl(220, 50%, 50%);
			}
		}
	}

	.controls button:hover, form button:hover {
		background-color: hsl(0, 0%, 95%);
	}
	
	form {
		padding: 1rem;
		width: 240px;

		h3 {
			margin: .5rem 0;
		}

		label {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			margin-bottom: .5rem;
		}

		button {
			width: 100%;
		}
	}

	a {
		text-decoration: none;
		color: inherit;
		position: relative;
		display: flex;
		align-items: center;
		justify-items: left;
		text-align: left;
		gap: 0.5rem;
		border: none;
		background: none;
		padding: 0;
		font-size: inherit;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
			color: cornflowerblue;
		}

		> span {
			z-index: 3;
			position: absolute;
			opacity: 0.5;
			right: var(--tably-padding-x);
			top: 50%;
			transform: translateY(-50%);
			display: flex;
			align-items: center;
		}
	}

	.details {
		display: flex;
		gap: 2rem;
		align-items: center;
		padding: 1rem 2rem;
		background-color: hsl(0, 0%, 98%);
		h5 {
			margin: 0;
		}
	}

	.more {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: transparent;
		border: none;
		cursor: pointer;
		height: 24px;
		width: 24px;
		padding: 0;
		margin: 0 0.5rem;
		transition: 0.1s ease;
		border-radius: 0.25rem;
		color: hsl(0, 0%, 50%);

		&.add :global(svg) {
			transform: scale(0.85);
		}
	}
	.more:hover {
		background-color: hsl(0, 0%, 90%);
	}

	button.visible {
		border: none;
		transition: 0.15s ease;
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
		resize: both;
		overflow: auto;
		border: 1px solid hsla(0, 0, 95%);
		width: clamp(0px, 1200px, 90vw);
		height: clamp(0px, 800px, 80vh);
	}

	.order {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
</style>
