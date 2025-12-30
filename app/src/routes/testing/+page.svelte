<script lang='ts'>
	import Table from 'svelte-tably'
	import type { ContentCtx } from 'svelte-tably/table/Table.svelte'

	// ================================
	// Test Data
	// ================================

	type Person = {
		id: number
		name: string
		age: number
		email: string
		active: boolean
	}

	function createData(count: number = 30): Person[] {
		return Array.from({ length: count }, (_, i) => ({
			id: i + 1,
			name: `Person ${i + 1}`,
			age: 18 + (i % 50),
			email: `person${i + 1}@example.com`,
			active: i % 3 !== 0
		}))
	}

	let data = $state<Person[]>(createData())

	// ================================
	// Reactivity Test States
	// ================================

	// Toggle column visibility
	let showEmailColumn = $state(true)
	let showAgeColumn = $state(true)

	// Dynamic column count (iterated columns)
	let extraColumnCount = $state(2)
	const extraColumns = $derived(
		Array.from({ length: extraColumnCount }, (_, i) => ({
			id: `extra-${i}`,
			header: `Extra ${i + 1}`,
			value: (row: Person) => `${row.name}-${i + 1}`
		}))
	)

	// Filter test
	let filterText = $state('')
	const filters = $derived(
		filterText
			? [(row: Person) => row.name.toLowerCase().includes(filterText.toLowerCase())]
			: []
	)

	// Selection test
	let selected = $state<Person[]>([])

	// Data mutation test
	function addRow() {
		const newId = data.length + 1
		data.push({
			id: newId,
			name: `New Person ${newId}`,
			age: Math.floor(Math.random() * 50) + 18,
			email: `new${newId}@example.com`,
			active: true
		})
	}

	function removeRow() {
		if (data.length > 0) {
			data.pop()
		}
	}

	function shuffleData() {
		data = data.toSorted(() => Math.random() - 0.5)
	}

	// Panel test
	let panel = $state<string | undefined>(undefined)

	// Table reference
	let tableRef = $state<ReturnType<typeof Table> | null>(null)

	// Test results
	let testResults = $state<Record<string, boolean | null>>({
		'Column visibility toggle': null,
		'Dynamic columns (iterated)': null,
		'Filter reactivity': null,
		'Data mutations': null,
		'Selection': null,
		'Panel toggle': null,
		'Expandable rows': null,
		'Sorting': null
	})

	function setTestResult(test: string, passed: boolean) {
		testResults[test] = passed
	}
</script>

<div class='page'>
	<h1>svelte-tably Testing Suite</h1>

	<section class='controls'>
		<h2>Test Controls</h2>

		<div class='control-group'>
			<h3>Column Visibility</h3>
			<label>
				<input type='checkbox' bind:checked={showEmailColumn} />
				Show Email Column
			</label>
			<label>
				<input type='checkbox' bind:checked={showAgeColumn} />
				Show Age Column
			</label>
		</div>

		<div class='control-group'>
			<h3>Dynamic Columns</h3>
			<label>
				Extra Columns: {extraColumnCount}
				<input
					type='range'
					min='0'
					max='5'
					bind:value={extraColumnCount}
				/>
			</label>
		</div>

		<div class='control-group'>
			<h3>Filter</h3>
			<input
				type='text'
				placeholder='Filter by name...'
				bind:value={filterText}
			/>
		</div>

		<div class='control-group'>
			<h3>Data Mutations</h3>
			<button onclick={addRow}>Add Row</button>
			<button onclick={removeRow}>Remove Row</button>
			<button onclick={shuffleData}>Shuffle Data</button>
			<span>Rows: {data.length}</span>
		</div>

		<div class='control-group'>
			<h3>Selection</h3>
			<span>Selected: {selected.length} items</span>
			<button onclick={() => selected = []}>Clear Selection</button>
		</div>

		<div class='control-group'>
			<h3>Panel</h3>
			<button onclick={() => panel = panel === 'info' ? undefined : 'info'}>
				Toggle Info Panel
			</button>
		</div>
	</section>

	<section class='test-results'>
		<h2>Test Results</h2>
		<ul>
			{#each Object.entries(testResults) as [test, passed]}
				<li class:passed={passed === true} class:failed={passed === false}>
					{test}: {passed === null ? '⏳ Pending' : passed ? '✅ Passed' : '❌ Failed'}
				</li>
			{/each}
		</ul>
	</section>

	<section class='table-container'>
		<h2>Table Test</h2>
		<div class='table-wrap'>
			<Table
				bind:this={tableRef}
				{data}
				{filters}
				bind:selected
				bind:panel
				select
				resizeable
			>
				{#snippet content({ Column, Panel, Expandable, Row, table }: ContentCtx<Person>)}
					<!-- Fixed column: ID -->
					<Column
						id='id'
						header='ID'
						value={(r) => r.id}
						width={60}
						fixed
					/>

					<!-- Always visible: Name -->
					<Column
						id='name'
						header='Name'
						value={(r) => r.name}
						sort
						width={150}
					>
						{#snippet row(item, ctx)}
							<strong>{item.name}</strong>
						{/snippet}
					</Column>

					<!-- Conditional column: Age -->
					{#if showAgeColumn}
						<Column
							id='age'
							header='Age'
							value={(r) => r.age}
							sort={(a, b) => (a as number) - (b as number)}
							width={80}
						>
							{#snippet row(item)}
								{item.age} years
							{/snippet}
						</Column>
					{/if}

					<!-- Conditional column: Email -->
					{#if showEmailColumn}
						<Column
							id='email'
							header='E-mail'
							value={(r) => r.email}
							width={200}
						/>
					{/if}

					<!-- Always visible: Active -->
					<Column
						id='active'
						header='Active'
						value={(r) => r.active}
						sort={(a, b) => Number(b) - Number(a)}
						width={80}
					>
						{#snippet row(item)}
							{item.active ? '✓' : '✗'}
						{/snippet}
					</Column>

					<!-- Iterated/Dynamic columns -->
					{#each extraColumns as col (col.id)}
						<Column
							id={col.id}
							header={col.header}
							value={col.value}
							width={120}
						/>
					{/each}

					<!-- Expandable content -->
					<Expandable>
						{#snippet content(item, ctx)}
							<div class='expanded-content'>
								<h4>Details for {item.name}</h4>
								<p>ID: {item.id}</p>
								<p>Email: {item.email}</p>
								<p>Age: {item.age}</p>
								<p>Active: {item.active ? 'Yes' : 'No'}</p>
							</div>
						{/snippet}
					</Expandable>

					<!-- Row configuration with context menu -->
					<Row>
						{#snippet context(item, ctx)}
							<button onclick={() => alert(`Context for ${item.name}`)}>
								⋮
							</button>
						{/snippet}
					</Row>

					<!-- Info Panel -->
					<Panel id='info'>
						{#snippet children(ctx)}
							<div class='panel-content'>
								<h3>Info Panel</h3>
								<p>Total rows: {table.data.length}</p>
								<p>Selected: {selected.length}</p>
								<button onclick={() => panel = undefined}>Close</button>
							</div>
						{/snippet}
					</Panel>
				{/snippet}
			</Table>
		</div>
	</section>

	<section class='auto-table'>
		<h2>Auto Mode Test</h2>
		<p>This table uses <code>auto</code> mode to generate columns automatically.</p>
		<div class='table-wrap small'>
			<Table
				auto
				data={data.slice(0, 5)}
			/>
		</div>
	</section>

	<section class='reorderable-table'>
		<h2>Reorderable Test</h2>
		<p>This table has <code>reorderable</code> enabled. Drag rows to reorder.</p>
		<div class='table-wrap small'>
			<Table
				reorderable
				data={data.slice(0, 8)}
			>
				{#snippet content({ Column })}
					<Column id='name' header='Name' value={(r: Person) => r.name} />
					<Column id='age' header='Age' value={(r: Person) => r.age} />
				{/snippet}
			</Table>
		</div>
	</section>
</div>

<style lang='postcss'>
	.page {
		padding: 1rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	h1 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.25rem;
		border-bottom: 1px solid hsl(0, 0%, 90%);
		padding-bottom: 0.5rem;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: hsl(0, 0%, 40%);
	}

	section {
		margin-bottom: 2rem;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		background: hsl(0, 0%, 97%);
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.control-group input[type='text'] {
		padding: 0.5rem;
		border: 1px solid hsl(0, 0%, 80%);
		border-radius: 0.25rem;
	}

	.control-group button {
		padding: 0.4rem 0.75rem;
		background: hsl(210, 100%, 50%);
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;

		&:hover {
			background: hsl(210, 100%, 40%);
		}
	}

	.test-results ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.test-results li {
		padding: 0.4rem 0.75rem;
		background: hsl(0, 0%, 95%);
		border-radius: 0.25rem;
		font-size: 0.9rem;

		&.passed {
			background: hsl(120, 40%, 90%);
			color: hsl(120, 40%, 30%);
		}

		&.failed {
			background: hsl(0, 40%, 90%);
			color: hsl(0, 40%, 30%);
		}
	}

	.table-container {
		grid-column: 1 / -1;
	}

	.table-wrap {
		height: 400px;
		border: 1px solid hsl(0, 0%, 85%);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.table-wrap.small {
		height: 250px;
	}

	.table-wrap :global(table) {
		height: 100%;
	}

	.expanded-content {
		padding: 1rem;
		background: hsl(210, 30%, 97%);
		border-left: 3px solid hsl(210, 100%, 50%);

		h4 {
			margin: 0 0 0.5rem;
		}

		p {
			margin: 0.25rem 0;
		}
	}

	.panel-content {
		padding: 1rem;
		min-width: 200px;

		h3 {
			margin: 0 0 1rem;
		}

		p {
			margin: 0.5rem 0;
		}

		button {
			margin-top: 1rem;
			padding: 0.5rem 1rem;
			background: hsl(0, 0%, 90%);
			border: none;
			border-radius: 0.25rem;
			cursor: pointer;
		}
	}

	.auto-table,
	.reorderable-table {
		code {
			background: hsl(0, 0%, 95%);
			padding: 0.15rem 0.4rem;
			border-radius: 0.25rem;
			font-size: 0.9em;
		}

		p {
			margin: 0 0 0.75rem;
			color: hsl(0, 0%, 40%);
		}
	}
</style>
