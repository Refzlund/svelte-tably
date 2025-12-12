<script lang='ts'>
	import Table from 'svelte-tably'

	type Row = {
		id: number
		name: string
		value: number
	}

	function createRows(count: number) {
		return Array.from({ length: count }, (_, i) => ({
			id: i,
			name: `Row ${i + 1}`,
			value: i % 10
		}))
	}

	let open = $state(true)
	let data = $state(createRows(2000))
	let ready = $state(false)
	let lastAction = $state('')
	let enableFiltersRepro = $state(false)
	let filters = $state([]) as ((row: Row) => boolean)[]

	function toggleFilterRepro() {
		// This is intentionally here to reproduce the reported "await in flush_sync" infinite-loop scenario.
		filters =
			filters.length === 0 ?
				[(row) => row.value % 2 === 0]
			:	[]
	}

	function updateRows() {
		// Reassign to trigger table updates and virtualization re-measurement
		data = data
			.slice()
			.reverse()
	}

	function openTable() {
		open = true
		ready = false
	}

	function closeTable() {
		open = false
		ready = false
	}

	function triggerRace() {
		if (!open) {
			lastAction = 'Ignored: table is closed'
			return
		}

		if (!ready) {
			lastAction = 'Ignored: wait one frame after opening'
			return
		}

		lastAction = 'Updated rows, then closed in microtask'
		updateRows()

		// Intentionally unmount between scheduling `tick()` and `tick().then(...)`.
		// This attempts to reproduce the runtime exception described in the issue.
		queueMicrotask(() => {
			closeTable()
		})
	}

	$effect(() => {
		if (!open) return
		ready = false
		requestAnimationFrame(() => {
			if (open) ready = true
		})
	})
</script>

<div class='page'>
	<h2>Issue #20 reproduction: unmount race in virtualization</h2>
	<p>
		This page tries to reproduce a mount/unmount race where virtualization schedules a
		<code>tick().then(...)</code> callback and the table unmounts before the callback runs.
	</p>

	<div class='controls'>
		<button onclick={() => (open ? closeTable() : openTable())}>
			{open ? 'Close table' : 'Open table'}
		</button>
		<button
			onclick={() => {
				enableFiltersRepro = !enableFiltersRepro
				filters = []
				lastAction = enableFiltersRepro ? 'Enabled filter repro (filters cleared)' : 'Disabled filter repro'
			}}
		>
			{enableFiltersRepro ? 'Disable filter repro' : 'Enable filter repro'}
		</button>
		<button
			onclick={() => {
				lastAction = 'Toggled filter (repro)'
				toggleFilterRepro()
			}}
			disabled={!open || !enableFiltersRepro}
			title='Intentionally triggers the infinite loop bug when enabled'
		>
			Toggle filter (repro loop)
		</button>
		<button onclick={updateRows} disabled={!open}>
			Update rows (reruns virtualization)
		</button>
		<button onclick={triggerRace} disabled={!open || !ready}>
			Trigger race (update + microtask close)
		</button>
		<button
			onclick={() => {
				data = createRows(2000)
				enableFiltersRepro = false
				filters = []
				lastAction = 'Reset data'
			}}
		>
			Reset
		</button>
	</div>

	<p class='meta'>
		<strong>State:</strong>
		open={String(open)}, ready={String(ready)}, rows={data.length}, filterRepro={String(enableFiltersRepro)}, filters={filters.length}
	</p>
	{#if lastAction}
		<p class='meta'><strong>Last action:</strong> {lastAction}</p>
	{/if}

	{#if open}
		<div class='modal'>
			<div class='modal-inner'>
				<div class='table-wrap'>
					{#if enableFiltersRepro}
						<Table auto {data} {filters} resizeable={false} />
					{:else}
						<Table auto {data} resizeable={false} />
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<p class='hint'>Table is unmounted. Open it, then press “Trigger race”.</p>
	{/if}
</div>

<style lang='postcss'>
	.page {
		padding: 1rem 1.25rem;
		max-width: 1100px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin: 0.75rem 0;
	}

	.controls button {
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(0, 0%, 80%);
		background: hsl(0, 0%, 98%);
		cursor: pointer;
	}

	.controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.meta {
		margin: 0.25rem 0;
		color: hsl(0, 0%, 35%);
		font-size: 0.9rem;
	}

	.hint {
		color: hsl(0, 0%, 35%);
	}

	.modal {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 0.75rem;
		background: hsl(0, 0%, 99%);
	}

	.table-wrap {
		width: min(100%, 1000px);
		height: 420px;
		border: 1px solid hsl(0, 0%, 92%);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.table-wrap :global(table) {
		height: 100%;
	}
</style>
