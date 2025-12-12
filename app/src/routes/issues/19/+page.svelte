<script lang='ts'>
	import Table from 'svelte-tably'

	type Row = {
		id: number
		name: string
	}

	const data: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
		{ id: 3, name: 'Charlie' }
	]

	let clicks = $state(0)
</script>

<div class='page'>
	<h2>Issue #19 reproduction: row context column invisible without contextHeader</h2>
	<p>
		This page renders two identical tables. The left table provides only the row <code>context</code>
		snippet (no <code>contextHeader</code>). The right table adds an “empty” <code>contextHeader</code>
		snippet as a workaround.
	</p>

	<p class='meta'>Clicks: {clicks}</p>

	<div class='grid'>
		<section class='card'>
			<h3>Buggy: context only (no contextHeader)</h3>
			<div class='wrap'>
				<Table {data} resizeable={false}>
					{#snippet content({ Column, Row })}
						<Column id='id' header='ID' value={(row) => row.id} width={80} />
						<Column id='name' header='Name' value={(row) => row.name} width={240} />

						<Row contextOptions={{ hover: false, width: 'max-content' }}>
							{#snippet context(item)}
								<button
									class='action'
									onclick={() => {
										clicks += 1
									}}
								>
									Action
								</button>
							{/snippet}
						</Row>
					{/snippet}
				</Table>
			</div>
			<p class='hint'>Expected: action buttons visible. Actual (bug): buttons exist but column has no width.</p>
		</section>

		<section class='card'>
			<h3>Workaround: context + empty contextHeader</h3>
			<div class='wrap'>
				<Table {data} resizeable={false}>
					{#snippet content({ Column, Row })}
						<Column id='id' header='ID' value={(row) => row.id} width={80} />
						<Column id='name' header='Name' value={(row) => row.name} width={240} />

						<Row contextOptions={{ hover: false, width: 'max-content' }}>
							{#snippet contextHeader()}
								<span></span>
							{/snippet}
							{#snippet context(item)}
								<button
									class='action'
									onclick={() => {
										clicks += 1
									}}
								>
									Action
								</button>
							{/snippet}
						</Row>
					{/snippet}
				</Table>
			</div>
			<p class='hint'>Expected: action buttons visible (and they should be).</p>
		</section>
	</div>
</div>

<style lang='postcss'>
	.page {
		padding: 1rem 1.25rem;
		max-width: 1200px;
	}

	.meta {
		color: hsl(0, 0%, 35%);
		margin: 0.5rem 0 1rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.card {
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 0.75rem;
		padding: 1rem;
		background: hsl(0, 0%, 99%);
	}

	.wrap {
		height: 260px;
		border: 1px solid hsl(0, 0%, 92%);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.wrap :global(table) {
		height: 100%;
	}

	.hint {
		margin: 0.75rem 0 0;
		color: hsl(0, 0%, 45%);
		font-size: 0.9rem;
	}

	.action {
		border: 1px solid hsl(0, 0%, 80%);
		background: hsl(0, 0%, 98%);
		border-radius: 0.5rem;
		padding: 0.35rem 0.5rem;
		cursor: pointer;
	}
</style>
