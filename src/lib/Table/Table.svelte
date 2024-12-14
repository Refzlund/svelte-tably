<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface TableState<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
		columns: Record<string, Column<T, unknown>>
		panels: Record<string, Panel>
		sortby?: string
		positions: {
			sticky: string[]
			scroll: string[]
			hidden: string[]
			toggle(key: string): void
		}
		readonly data: T[]
		addColumn(key: string, options: Column<T, unknown>): void
		removeColumn(key: string): void
	}

	export function getTableState<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>() {
		return getContext<TableState<T>>('svelte5-table')
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import { getContext, setContext, untrack, type Snippet } from 'svelte'
	import { type Column } from './Column.svelte'
	import { PanelTween, type Panel } from './Panel.svelte'
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'

	interface Props {
		children?: Snippet
		panel?: string
		data?: T[]
		id?: string
	}

	let {
		children,
		panel,
		data: _data = [],
		id = Array.from({length: 12}, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('')
	}: Props = $props()
	
	const data = $derived(_data.toSorted())

	const elements = $state({}) as Record<'headers' | 'statusbar' | 'rows', HTMLElement>


	// * --- Virtualization --- *
	let scrollTop = $state(0)
	let viewportHeight = $state(0)

	let _heightPerItem = 0
	let _virtualBottom = 0
	let _virtualTop = 0

	let renderItemLength = $derived(Math.ceil(Math.max(30, viewportHeight / ((_heightPerItem || 24) / 3))))
	let heightPerItem = $derived.by(() => {
		const result = ((elements.rows?.scrollHeight || 0) - (
			(isNaN(_virtualBottom) ? 0 : _virtualBottom))
			+ (isNaN(_virtualTop) ? 0 : _virtualTop)
		) / renderItemLength
		_heightPerItem = result
		return result
	})
	let virtualTop = $derived.by(() => {
		let spacing = (renderItemLength/3) * heightPerItem
		let scroll = scrollTop - spacing
		let virtualTop = Math.max(scroll, 0)
		virtualTop -= virtualTop % heightPerItem
		_virtualTop = virtualTop
		return virtualTop
	})
	let virtualBottom = $derived.by(() => {
		const virtualBottom = (heightPerItem * data.length) - virtualTop
		_virtualBottom = virtualBottom
		return virtualBottom
	})

	/** The area of data that is rendered */
	const area = $derived.by(() => {
		const index = (virtualTop / heightPerItem) || 0
		return data.slice(
			index, 
			index + renderItemLength
		)
	})
	// * --- Virtualization --- *


	const table: TableState<T> = $state({
		columns: {},
		panels: {},
		positions: {
			sticky: [],
			scroll: [],
			hidden: [],
			toggle(key) {
				if(table.positions.hidden.includes(key))
					table.positions.hidden = table.positions.hidden.filter(column => column !== key)
				else
					table.positions.hidden.push(key)
			}
		},
		get data() {
			return data
		},
		addColumn(key, column) {
			table.columns[key] = column

			if(column.defaults.sort)
				table.sortby = key
			
			if(!column.defaults.show)
				table.positions.hidden.push(key)
			
			if(column.defaults.sticky) 
				table.positions.sticky.push(key)
			else
				table.positions.scroll.push(key)
		},
		removeColumn(key) {
			delete table.columns[key]
			table.positions.sticky = table.positions.sticky.filter(column => column !== key)
			table.positions.scroll = table.positions.scroll.filter(column => column !== key)
			table.positions.hidden = table.positions.hidden.filter(column => column !== key)
		}
	})

	setContext('svelte5-table', table)

	// * --- *
	
	const panelTween = new PanelTween(() => panel)

	/** Order of columns */
	const columns = $derived([...table.positions.sticky, ...table.positions.scroll].filter(key => !table.positions.hidden.includes(key)))

	/** Width of each column */
	const widths = $state({}) as Record<string, number>

	/** grid-template-columns for widths */
	const style = $derived(`
		#${id} > .headers, #${id} > .rows > .row, #${id} > .statusbar {
			grid-template-columns: ${columns.map((key, i, arr) => i === arr.length - 1 ? `minmax(${widths[key] || 150}px, 1fr)` : `${widths[key] || 150}px`).join(' ')};
		}
	`)

	const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(mutations => {
		const target = mutations[0].target as HTMLDivElement
		widths[target.getAttribute('data-column')!] = parseFloat(target.style.width)
	})

	function observe(node: HTMLDivElement, column: string) {
		observer?.observe(node, {attributes: true})
		return { destroy: () => observer?.disconnect() }
	}

	function onscroll(event: Event) {
		const target = event.target as HTMLDivElement
		scrollTop = target.scrollTop || 0
		if(!elements.headers) return
		elements.headers.scrollLeft = target.scrollLeft
		elements.statusbar.scrollLeft = target.scrollLeft
	}

</script>
<!---------------------------------------------------->

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

<div id={id} class='table'>

	<div class='headers' bind:this={elements.headers}>
		{#each table.positions.sticky as column, i (column)}
			{#if !table.positions.hidden.includes(column)}
				<div class='column sticky' data-column="{column}" use:observe={column} class:border={i == table.positions.sticky.length - 1}>
					{@render table.columns[column]?.header()}
				</div>
			{/if}
		{/each}
		{#each table.positions.scroll as column, i (column)}
			{#if !table.positions.hidden.includes(column)}
				<div class='column' data-column="{column}" use:observe={column}>
					{@render table.columns[column]?.header()}
				</div>
			{/if}
		{/each}
	</div>

	<div class='rows' {onscroll} bind:clientHeight={viewportHeight} bind:this={elements.rows}>
		<div style='height: {virtualTop}px'></div>
		{#each area as item, i (item)}
			<div class='row'>
				{#each table.positions.sticky as column, i (column)}
					{#if !table.positions.hidden.includes(column)}
						{@const col = table.columns[column]}
						<div class='column sticky' class:border={i == table.positions.sticky.length - 1}>
							{@render col.row(item, col.options.value ? col.options.value(item) : undefined)}
						</div>
					{/if}
				{/each}
				{#each table.positions.scroll as column, i (column)}
					{#if !table.positions.hidden.includes(column)}
						{@const col = table.columns[column]}
						<div class='column'>
							{@render col.row(item, col.options.value ? col.options.value(item) : undefined)}
						</div>
					{/if}
				{/each}
			</div>
		{/each}
		<div style='height: {virtualBottom}px'></div>
	</div>
	
	<div class='statusbar' bind:this={elements.statusbar}>
		{#each table.positions.sticky as column, i (column)}
			{#if !table.positions.hidden.includes(column)}
				<div class='column sticky' class:border={i == table.positions.sticky.length - 1}>
					{@render table.columns[column]?.statusbar?.(data)}
				</div>
			{/if}
		{/each}
		{#each table.positions.scroll as column, i (column)}
			{#if !table.positions.hidden.includes(column)}
				<div class='column'>
					{@render table.columns[column]?.statusbar?.(data)}
				</div>
			{/if}
		{/each}
	</div>

	<div class='panel' style='width: {panelTween.current}px;' style:overflow={panelTween.transitioning ? 'hidden' : 'auto'}>
		{#if panel && panel in table.panels}
			<div 
				class="panel-content"
				bind:clientWidth={panelTween.width}
				in:fly={{ x: 100, easing: sineInOut, duration:300 }}
				out:fly={{ x:100, duration:200, easing: sineInOut }}
			>
				{@render table.panels[panel].content(table as TableState)}
			</div>
		{/if}
	</div>
</div>


{@render children?.()}



<!---------------------------------------------------->
<style lang='postcss'>
	
	.table, .table * {
		box-sizing: border-box;
	}

	.sticky {
		position: sticky;
		left: 0px;
		/* right: 100px; */
		background-color: var(--tably-bg, hsl(0, 0%, 100%));
		z-index: 1;
	}

	.sticky.border {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
	}

	.headers > .column {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		resize: horizontal;
		overflow: hidden;
		padding: var(--padding-y) 0;
	}
	
	.table {
		--panel: 250px;
		--padding-x: 1rem;
		--padding-y: .5rem;
		--gap: .25rem;
		--header-height: 2.5rem;

		display: grid;

		grid-template-areas: 
			"headers     panel"
			"rows        panel"
			"statusbar   panel"
		;

		grid-template-columns: auto min-content;
		grid-template-rows: auto 1fr auto;

		border: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		border-radius: .25rem;

		max-height: 100%;
	}

	.headers {
		grid-area: headers;
		z-index: 2;
		overflow: hidden;
		padding-right: 1rem;
	}

	.headers > .column {
		width: auto !important;
		background-color: var(--tably-bg, hsl(0, 0%, 100%));
		border-bottom: 1px solid var(--tably-border, hsl(0, 0%, 90%));
	}

	.rows {
		grid-area: rows;
		display: grid;
		scrollbar-width: thin;
		overflow: auto;
	}

	.statusbar {
		grid-area: statusbar;
		overflow: hidden;
		padding-right: 1rem;
	}

	.statusbar > .column {
		background-color: var(--tably-bg-statusbar, hsl(0, 0%, 99%));
		border-top: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		padding: calc(var(--padding-y) / 2) 0;
	}

	.headers, .row, .statusbar {
		display: grid;
		width: 100%;
		height: 100%;

		& > .column {
			display: flex;
			padding-left: var(--padding-x);
			overflow: hidden;
		}

		& > *:last-child {
			width: 100%;
			padding-right: var(--padding-x);
		}
	}

	/* .row:nth-child(1) > * {
		padding-top: calc(var(--padding-y) + var(--gap));
	}
	.row:nth-last-child(1) > * {
		padding-bottom: calc(var(--padding-y) + var(--gap));
	} */

	.row > * {
		padding: var(--gap) 0;
	}

	.panel {
		position: relative;
		grid-area: panel;
		height: 100%;
		background-color: var(--tably-bg, hsl(0, 0%, 100%));

		border-left: 1px solid var(--tably-border, hsl(0, 0%, 90%));

		> .panel-content {
			position: absolute;
			top: 0;
			right: 0;
			width: min-content;
			overflow: hidden;
			padding: var(--padding-y) var(--padding-x);
		}
	}

	.statusbar {
		grid-area: statusbar;
	}

</style>