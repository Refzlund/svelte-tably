<script lang='ts'>
	import Table from 'svelte-tably'
	import { createSimpleData, createWideData, type SimpleRow, type WideRow } from './repro-data'

	type Tab = 'expandable' | 'context-border' | 'ownership'
	let tab = $state<Tab>('expandable')

	const wideData = createWideData()

	let alignHeaderToRows = $state(true)
	let simpleData = $state<SimpleRow[]>(createSimpleData())

	const uid = 'fix-new-bugs'

	const tabOrder: Tab[] = ['expandable', 'context-border', 'ownership']

	const tabIds: Record<Tab, string> = {
		expandable: uid + '-tab-expandable',
		'context-border': uid + '-tab-context-border',
		ownership: uid + '-tab-ownership'
	}

	const panelIds: Record<Tab, string> = {
		expandable: uid + '-panel-expandable',
		'context-border': uid + '-panel-context-border',
		ownership: uid + '-panel-ownership'
	}

	function onTabKeydown(event: KeyboardEvent) {
		const currentIndex = tabOrder.indexOf(tab)
		if (currentIndex === -1) return

		let nextIndex = currentIndex
		if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabOrder.length
		else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length
		else if (event.key === 'Home') nextIndex = 0
		else if (event.key === 'End') nextIndex = tabOrder.length - 1
		else return

		event.preventDefault()
		const next = tabOrder[nextIndex]
		tab = next
		requestAnimationFrame(() => document.getElementById(tabIds[next])?.focus())
	}
</script>

<div class='page'>
	<h2>Repro: 3 new bugs</h2>
	<p class='lead'>
		Use the tabs below. Each tab is a minimal reproduction and includes quick steps + what to look for.
	</p>

	<div class='tabs' role='tablist' aria-label='Bug reproductions'>
		<button
			id={tabIds.expandable}
			type='button'
			role='tab'
			aria-selected={tab === 'expandable'}
			aria-controls={panelIds.expandable}
			class:selected={tab === 'expandable'}
			onkeydown={onTabKeydown}
			onclick={() => (tab = 'expandable')}
		>1) Expandable horizontal scroll</button>
		<button
			id={tabIds['context-border']}
			type='button'
			role='tab'
			aria-selected={tab === 'context-border'}
			aria-controls={panelIds['context-border']}
			class:selected={tab === 'context-border'}
			onkeydown={onTabKeydown}
			onclick={() => (tab = 'context-border')}
		>2) Row context border</button>
		<button
			id={tabIds.ownership}
			type='button'
			role='tab'
			aria-selected={tab === 'ownership'}
			aria-controls={panelIds.ownership}
			class:selected={tab === 'ownership'}
			onkeydown={onTabKeydown}
			onclick={() => (tab = 'ownership')}
		>3) Ownership + localStorage sandbox</button>
	</div>

	{#if tab === 'expandable'}
		<div
			class='card'
			role='tabpanel'
			id={panelIds.expandable}
			aria-labelledby={tabIds.expandable}
		>
			<h3>Bug 1 — Expandable area scrolls horizontally</h3>
			<ol class='steps'>
				<li>Hover a row to reveal the chevron, then click to expand.</li>
				<li>Scroll the table horizontally (bottom scrollbar).</li>
				<li>Observe the expanded content moving out of view.</li>
			</ol>
			<p class='expected'>Expected: expanded content stays aligned with the viewport while horizontally scrolling.</p>

			<div class='wrap tall'>
				<Table resizeable={false} data={wideData}>
					{#snippet content({ Column, Expandable })}
						<Column id='id' width={70} header='ID' value={(r: WideRow) => r.id} />
						<Column id='name' width={220} header='Name' value={(r: WideRow) => r.name} />
						<Column id='email' width={320} header='E-mail' value={(r: WideRow) => r.email} />
						<Column id='maturity' width={140} header='Maturity' value={(r: WideRow) => r.maturity} />
						<Column id='colA' width={260} header='Col A' value={(r: WideRow) => r.colA} />
						<Column id='colB' width={260} header='Col B' value={(r: WideRow) => r.colB} />
						<Column id='colC' width={260} header='Col C' value={(r: WideRow) => r.colC} />
						<Column id='colD' width={260} header='Col D' value={(r: WideRow) => r.colD} />
						<Column id='colE' width={260} header='Col E' value={(r: WideRow) => r.colE} />
						<Column id='colF' width={260} header='Col F' value={(r: WideRow) => r.colF} />

						<Expandable chevron='hover'>
							{#snippet content(item: WideRow)}
								<div class='expanded'>
									<strong>{item.name}</strong>
									<div class='expanded-sub'>Try horizontal scroll now →</div>
									<div class='expanded-wide'>
										This block is intentionally wide to make the horizontal-scroll behavior obvious.
										It should stay visible instead of sliding away with the scrollable columns.
									</div>
								</div>
						{/snippet}
						</Expandable>
					{/snippet}
				</Table>
			</div>
		</div>
	{:else if tab === 'context-border'}
		<div
			class='card'
			role='tabpanel'
			id={panelIds['context-border']}
			aria-labelledby={tabIds['context-border']}
		>
			<h3>Bug 2 — Row context column border visible when button hidden</h3>
			<ol class='steps'>
				<li>Do not hover any rows.</li>
				<li>Look at the far-right "context" column in the body.</li>
				<li>Notice the border line on the left even though the button is hidden.</li>
			</ol>
			<p class='expected'>Expected: the left border should only show when the context button is visible.</p>

			<label class='toggle'>
				<input type='checkbox' bind:checked={alignHeaderToRows} />
				Align header context to row context
			</label>

			<div class='wrap'>
				<Table data={wideData.slice(0, 20)}>
					{#snippet content({ Column, Row })}
						<Column id='name' width={260} header='Name' value={(r) => r.name} />
						<Column id='email' width={360} header='E-mail' value={(r) => r.email} />
						<Column id='maturity' width={140} header='Maturity' value={(r) => r.maturity} />

						<Row contextOptions={{ hover: true, alignHeaderToRows }}>
							{#snippet contextHeader()}
								<button class='ctx-btn add' tabindex='-1'>+</button>
							{/snippet}
							{#snippet context()}
								<button class='ctx-btn' tabindex='-1'>⋯</button>
							{/snippet}
						</Row>
					{/snippet}
				</Table>
			</div>
		</div>
	{:else}
		<div
			class='card'
			role='tabpanel'
			id={panelIds.ownership}
			aria-labelledby={tabIds.ownership}
		>
			<h3>Bug 3 — Ownership invalid mutation + sandboxed localStorage error</h3>
			<p class='expected'>Open the browser console for both parts below.</p>

			<div class='split'>
				<div>
					<h4>3a) Ownership warning (in-page)</h4>
					<p class='hint'>Expected: warning in console similar to <code>ownership_invalid_mutation</code>.</p>
					<div class='wrap'>
						<Table auto data={simpleData} reorderable resizeable={false} />
					</div>
					<ol class='hint-list'>
						<li>Refresh this page, keep console open.</li>
						<li>Reorder columns (drag header) to provoke column state changes.</li>
					</ol>

					<h4>3b) Sandboxed iframe (localStorage SecurityError)</h4>
					<p class='hint'>Expected: error about <code>Failed to read the 'localStorage' property</code>.</p>
					<iframe
						title='Sandboxed localStorage repro'
						sandbox='allow-scripts allow-forms'
						src='/issues/fix-new-bugs/sandbox'
						class='iframe'
					></iframe>
				</div>

				<div>
					<h4>Data mirror</h4>
					<p class='hint'>This list uses the same reactive array as the table (from the repro snippet).</p>
					<ol class='mirror'>
						{#each simpleData.map((v) => v.name) as name}
							<li>{name}</li>
						{/each}
					</ol>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang='postcss'>
	:global(body) {
		--tably-bg: hsla(0, 0%, 99%);
		--tably-color: black;
		--tably-border: hsla(0, 0%, 50%, 0.4);
		--tably-border-grid: hsla(0, 0%, 50%, 0.2);
		--tably-statusbar: hsla(0, 0%, 13%);
	}

	.page {
		padding: 1rem 1.25rem;
		max-width: 1100px;
	}

	.lead {
		margin: 0.5rem 0 1rem;
		color: hsl(0, 0%, 35%);
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.75rem 0 1rem;
	}

	.tabs button {
		border: 1px solid hsl(0, 0%, 80%);
		background: hsl(0, 0%, 98%);
		border-radius: 0.6rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
	}

	.tabs button.selected {
		background: hsl(210, 80%, 96%);
		border-color: hsl(210, 60%, 70%);
	}

	.card {
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 0.75rem;
		padding: 1rem;
		background: hsl(0, 0%, 99%);
	}

	.steps {
		margin: 0.5rem 0 0.75rem;
		color: hsl(0, 0%, 25%);
	}

	.expected {
		margin: 0.25rem 0 0.75rem;
		color: hsl(0, 0%, 35%);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.25rem 0 0.75rem;
		color: hsl(0, 0%, 30%);
		font-size: 0.95rem;
	}

	.hint {
		margin: 0.25rem 0 0.75rem;
		color: hsl(0, 0%, 35%);
	}

	.hint-list {
		margin: 0.5rem 0 1rem;
		color: hsl(0, 0%, 35%);
		font-size: 0.95rem;
	}

	.wrap {
		height: 320px;
		> :global(table) {
			border-radius: 0.75rem;
		}
		overflow: hidden;
		background: var(--tably-bg, white);
	}

	.wrap.tall {
		height: 420px;
	}

	.wrap :global(table) {
		height: 100%;
	}

	.expanded {
		padding: 0.75rem 0.75rem 1rem;
		display: grid;
		gap: 0.5rem;
		background: color-mix(in oklab, var(--tably-bg, white), black 3%);
		border-radius: 0.5rem;
		margin: 0.5rem;
	}

	.expanded-sub {
		opacity: 0.75;
		font-size: 0.95rem;
	}

	.expanded-wide {
		max-width: 100%;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: color-mix(in oklab, var(--tably-bg, white), black 6%);
		border: 1px solid var(--tably-border, hsl(0, 0%, 85%));
	}

	.ctx-btn {
		border: 1px solid color-mix(in oklab, var(--tably-border, hsl(0, 0%, 70%)), transparent 35%);
		background: color-mix(in oklab, var(--tably-bg, white), black 5%);
		color: var(--tably-color, hsl(0, 0%, 10%));
		border-radius: 0.5rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		line-height: 1;
	}

	.ctx-btn.add {
		font-weight: 700;
	}

	.split {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.split {
			grid-template-columns: 1.2fr 0.8fr;
		}
	}

	.iframe {
		width: 100%;
		height: 360px;
		border: 1px solid hsl(0, 0%, 92%);
		border-radius: 0.75rem;
		background: white;
	}

	.mirror {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
	}
</style>
