<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface ColumnOptions {
		sticky(): ColumnOptions
	}

	interface Column<T = unknown> {
		header?: Snippet<[options: ColumnOptions]>
		row?: Snippet<[data: T]>
		statusbar?: Snippet<[data: T[]]>
		defaults?: {
			sticky?: boolean
		}
	}

	export interface TableState<T = unknown> {
		columns: Record<string, Column<T>>
		order: {
			sticky: string[]
			scroll: string[]
		}
		panels: Record<string, Snippet<[table: TableState]>>
		readonly data: T[]
		updateColumn(key: string, options: Column<T>): void
	}

	export function getTableState<T>() {
		return getContext('svelte-dynamic-table') as TableState<T>
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import { getContext, setContext, type Snippet } from 'svelte'
	import { sineInOut } from 'svelte/easing'
	import { Spring, Tween } from 'svelte/motion'
	import { fly } from 'svelte/transition'

	interface Props {
		children?: Snippet
		data: T[]
		panel?: string
	}

	let {
		children,
		data,
		panel = $bindable()
	}: Props = $props()

	const table: TableState<T> = $state({
		columns: {},
		order: {
			sticky: [],
			scroll: []
		},
		panels: {},
		get data() {
			return data
		},
		updateColumn(key, options) {
			if(!(key in table.columns)) {
				const column = $state({})
				table.columns[key] = column
			}
			Object.assign(table.columns[key], options)
		}
	})

	const columns = $derived([...table.order.sticky, ...table.order.scroll])

	/** Passed to header */
	function columnOptions(key: string) {
		const options = $state({}) as NonNullable<Column['defaults']>
		table.updateColumn(key, { defaults: options })
		return {
			sticky() {
				options.sticky = true
				return this
			}
		} as ColumnOptions
	}

	setContext('svelte-dynamic-table', table)

	const widths = $state({}) as Record<string, number>
	const headers = new WeakMap<HTMLDivElement, string>()

	const tableId = Array.from({length: 12}, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('')

	const style = $derived(`
		#${tableId} > .headers, #${tableId} > .rows > .row, #${tableId} > .statusbar {
			grid-template-columns: ${columns.map((key, i, arr) => i === arr.length - 1 ? `minmax(${widths[key] || 150}px, 1fr)` : `${widths[key] || 150}px`).join(' ')};
		}
	`)

	const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(mutations => {
		const target = mutations[0].target as HTMLDivElement
		const column = headers.get(target)
		if (!column) return
		widths[column] = parseFloat(target.style.width)
	})

	function observe(node: HTMLDivElement, column: string) {
		observer?.observe(node, {attributes: true})
		headers.set(node, column)
		return {
			destroy: () => observer?.disconnect()
		}
	}

	let elements = $state({}) as Record<string, HTMLElement>
	function onscroll(event: Event) {
		const target = event.target as HTMLDivElement
		elements.headers.scrollLeft = target.scrollLeft
		elements.statusbar.scrollLeft = target.scrollLeft
	}

	const panelTween = new Tween(0, { duration: 300, easing: sineInOut })
	let panelWidth = $state(0)
	let panelTransitioning = $state(false)
	$effect(() => {
		panelTransitioning = true
		panelTween.set(panel ? panelWidth : 0).then(() => panelTransitioning = false)
	})

</script>
<!---------------------------------------------------->

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

<div id={tableId} class='table'>

	<div class='headers' bind:this={elements.headers}>
		{#each table.order.sticky as column, i (column)}
			<div class='column sticky' use:observe={column}>
				{@render table.columns[column]?.header?.({ sticky() {} } as ColumnOptions)}
			</div>
		{/each}
		{#each table.order.scroll as column, i (column)}
			<div class='column' use:observe={column}>
				{@render table.columns[column]?.header?.({ sticky() {} } as ColumnOptions)}
			</div>
		{/each}

	</div>

	<div class="rows" {onscroll}>
		{#each data as item}
			<div class='row'>
				{#each table.order.sticky as column, i (column)}
					<div class='column sticky' class:border={i == table.order.sticky.length - 1}>
						{@render table.columns[column]?.row?.(item)}
					</div>
				{/each}
				{#each table.order.scroll as column, i (column)}
					<div class='column'>
						{@render table.columns[column]?.row?.(item)}
					</div>
				{/each}
			</div>
		{/each}
	</div>
	
	<div class='statusbar' bind:this={elements.statusbar}>
		{#each table.order.sticky as column, i (column)}
			<div class='column sticky' class:border={i == table.order.sticky.length - 1}>
				{@render table.columns[column]?.statusbar?.(data)}
			</div>
		{/each}
		{#each table.order.scroll as column, i (column)}
			<div class='column'>
				{@render table.columns[column]?.statusbar?.(data)}
			</div>
		{/each}
	</div>

	<div class='panel' style='width: {panelTween.current}px;' style:overflow={panelTransitioning ? 'hidden' : 'auto'}>
		{#if panel && table.panels[panel]}
			<div class="panel-content" bind:clientWidth={panelWidth} in:fly={{ x: 100, easing: sineInOut, duration:300 }} out:fly={{ x:100, duration:200, easing: sineInOut }}>
				{@render table.panels[panel](table as TableState)}
			</div>
		{/if}
	</div>
</div>



{@render children?.()}



<!---------------------------------------------------->
<style>

	.table, .table * {
		box-sizing: border-box;
	}

	.sticky {
		position: sticky;
		left: 0px;
		/* right: 100px; */
		background-color: white;
		z-index: 1;
		&.border {
			border-right: 1px solid hsla(0, 0%, 90%);
		}
	}

	.headers > .column {
		border-right: 1px solid hsla(0, 0%, 90%);
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

		border: 1px solid hsla(0, 0%, 90%);
		border-radius: .25rem;

		max-height: 100%;
	}

	.headers {
		grid-area: headers;
		z-index: 2;
		overflow: hidden;
		padding-right: 1rem;
		> .column {
			width: auto !important;
			background-color: white;
			border-bottom: 1px solid hsla(0, 0%, 90%);
		}
	}

	.rows {
		grid-area: rows;
		display: grid;
		overflow: auto;
		scrollbar-width: thin;
	}

	.statusbar {
		grid-area: statusbar;
		overflow: hidden;
		padding-right: 1rem;
		> .column {
			background-color: hsla(0, 0%, 99%);
			border-top: 1px solid hsla(0, 0%, 90%);
			padding: calc(var(--padding-y) / 2) 0;
		}
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

	.row:nth-child(1) > * {
		padding-top: calc(var(--padding-y) + var(--gap));
	}
	.row:nth-last-child(1) > * {
		padding-bottom: calc(var(--padding-y) + var(--gap));
	}

	.row > * {
		padding: var(--gap) 0;
	}

	.panel {
		position: relative;
		grid-area: panel;
		width: var(--panel);
		height: 100%;
		background-color: white;

		border-left: 1px solid hsla(0, 0%, 90%);

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