<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang='ts'>
	
	export interface TableState<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
		columns: Record<string, TColumn<T, unknown>>
		panels: Record<string, TPanel>
		sortby?: string
		positions: {
			sticky: string[]
			scroll: string[]
			hidden: string[]
			toggle(key: string): void
		}
		readonly data: T[]
		/** Rows become anchors */
		readonly href?: (item: T) => string
		addColumn(key: string, options: TColumn<T, unknown>): void
		removeColumn(key: string): void
	}

	export function getTableState<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>() {
		return getContext<TableState<T>>('svelte5-table')
	}

</script>

<script lang='ts' generics='T extends Record<PropertyKey, unknown>'>

	import { getContext, setContext, untrack, type Snippet } from 'svelte'
	import Column, { type Column as TColumn } from './Column.svelte'
	import Panel, { PanelTween, type Panel as TPanel } from './Panel.svelte'
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'

	interface Props {
		content: Snippet<[context: { Column: typeof Column<T>, Panel: typeof Panel, readonly state: TableState<T>, readonly data: T[] }]>

		panel?: string
		data?: T[]
		id?: string
		href?: (item: T) => string
	}

	let {
		content,

		panel = $bindable(),
		data: _data = [],
		id = Array.from({length: 12}, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join(''),
		href
	}: Props = $props()
	
	const data = $derived(_data.toSorted())

	const elements = $state({}) as Record<'headers' | 'statusbar' | 'rows', HTMLElement>


	// * --- Virtualization --- *
	let scrollTop = $state(0)
	let viewportHeight = $state(0)

	let heightPerItem = $derived.by(() => {
		data
		if(!elements.rows)
			return 8
		const result = elements.rows.scrollHeight / elements.rows.childNodes.length
		return result
	})

	let renderItemLength = $derived(Math.ceil(Math.max(30, (viewportHeight / heightPerItem) * 2)))

	const spacing = () => viewportHeight / 2
	let virtualTop = $derived.by(() => {
		let scroll = scrollTop - spacing()
		let virtualTop = Math.max(scroll, 0)
		virtualTop -= virtualTop % heightPerItem
		return virtualTop
	})
	let virtualBottom = $derived.by(() => {
		const virtualBottom = (heightPerItem * data.length) - virtualTop - spacing() * 4
		return Math.max(virtualBottom, 0)
	})
	/** The area of data that is rendered */
	const area = $derived.by(() => {
		const index = (virtualTop / heightPerItem) || 0
		const end = index + untrack(() => renderItemLength)
		return data.slice(
			index, 
			end
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
		get href() {
			return href
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
	
	const panelTween = new PanelTween(() => panel, 24)

	let hoveredRow: T | null = $state(null)

	/** Order of columns */
	const columns = $derived([...table.positions.sticky, ...table.positions.scroll].filter(key => !table.positions.hidden.includes(key)))

	/** Width of each column */
	const columnWidths = $state({}) as Record<string, number>

	/** grid-template-columns for widths */
	const style = $derived(`
	#${id} > .headers,
	#${id} > .content > .rows > .row,
	#${id} > .statusbar,
	#${id} > .content > .virtual.bottom {
		grid-template-columns: ${
			columns.map((key, i, arr) => {
				const width = columnWidths[key] || table.columns[key]?.defaults.width || 150
				if(i === arr.length - 1)
					return `minmax(${width}px, 1fr)`
				return `${width}px`
			}).join(' ')
		};
	}
	`)

	const columnWidthObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(mutations => {
		const target = mutations[0].target as HTMLDivElement
		columnWidths[target.getAttribute('data-column')!] = parseFloat(target.style.width)
	})

	function observeColumnWidth(node: HTMLDivElement, isHeader = false) {
		if(!isHeader) return
		columnWidthObserver?.observe(node, {attributes: true})
		return { destroy: () => columnWidthObserver?.disconnect() }
	}

	function onscroll(event: Event) {
		const target = event.target as HTMLDivElement
		if(target.scrollTop !== scrollTop) {
			scrollTop = target.scrollTop || 0
		}
		
		if(!elements.headers) return
		elements.headers.scrollLeft = target.scrollLeft
		elements.statusbar.scrollLeft = target.scrollLeft
	}

</script>
<!---------------------------------------------------->

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

{#snippet columnsSnippet(
	renderable: (column: string) => Snippet<[arg0?: any, arg1?: any]> | undefined, 
	arg: null | ((column: string) => any[]) = null,
	isHeader = false
)}
	{#each table.positions.sticky as column, i (column)}
		{#if !table.positions.hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const props = isHeader ? { 'data-column': column } : {}}
			<div class='column sticky' {...props} use:observeColumnWidth={isHeader} class:border={i == table.positions.sticky.length - 1}>
				{@render renderable(column)?.(args[0], args[1])}
			</div>
		{/if}
	{/each}
	{#each table.positions.scroll as column, i (column)}
		{#if !table.positions.hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const props = isHeader ? { 'data-column': column } : {}}
			<div class='column' {...props} use:observeColumnWidth={isHeader}>
				{@render renderable(column)?.(args[0], args[1])}
			</div>
		{/if}
	{/each}
{/snippet}

<div id={id} class='table svelte-tably'>

	<div class='headers' bind:this={elements.headers}>
		{@render columnsSnippet((column) => table.columns[column]?.header, () => [true], true)}
	</div>

	<div class='content' {onscroll} bind:clientHeight={viewportHeight}>
		<div class='virtual top' style='height: {virtualTop}px'></div>
		
		<div class='rows' bind:this={elements.rows}>
			{#each area as item, i (item)}
				{@const props = table.href ? { href: table.href(item) } : {}}
				<!-- note: <svelte:element> will break the virtualization for some reason -->
				<a
					class='row'
					{...props}
					onpointerenter={() => hoveredRow = item}
					onpointerleave={() => hoveredRow = null}
				>
					{@render columnsSnippet(
						(column) => table.columns[column]!.row,
						(column) => {
							const col = table.columns[column]!
							return [item, {
								get index() { return data.indexOf(item) },
								get value() { return col.options.value ? col.options.value(item) : undefined },
								get isHovered() { return hoveredRow === item }
							}]
						}
					)}
				</a>
			{/each}
		</div>
		<div class='virtual bottom' style='height: {virtualBottom}px'>
			{@render columnsSnippet(() => undefined)}
		</div>
	</div>
	
	<div class='statusbar' bind:this={elements.statusbar}>
		{@render columnsSnippet((column) => table.columns[column]?.statusbar)}
	</div>

	<div class='panel' style='width: {(panelTween.current)}px;' style:overflow={panelTween.transitioning ? 'hidden' : 'auto'}>
		{#if panel && panel in table.panels}
			<div 
				class='panel-content'
				bind:clientWidth={panelTween.width}
				in:fly={{ x: 100, easing: sineInOut, duration:300 }}
				out:fly={{ x:100, duration:200, easing: sineInOut }}
			>
				{@render table.panels[panel].content()}
			</div>
		{/if}
	</div>
	<button 
		class='backdrop' 
		aria-label='Panel backdrop'
		tabindex='-1'
		aria-hidden={panel && table.panels[panel]?.backdrop ? false : true}
		onclick={() => panel = undefined}
	></button>
</div>


{@render content?.({ Column, Panel, get state() { return table }, get data() { return data } })}



<!---------------------------------------------------->
<style>

	a {
		color: inherit;
		text-decoration: inherit;
	}
	
	.table, .table * {
		box-sizing: border-box;
		background-color: inherit;
	}

	.backdrop {
		position: absolute;
		left: 0px;
		top: 0px;
		bottom: 0px;
		right: 0px;
		background-color: hsla(0, 0%, 0%, .3);
		z-index: 3;
		opacity: 1;
		transition: .15s ease;
		border: none;
		outline: none;
		cursor: pointer;

		&[aria-hidden='true'] {
			opacity: 0;
			pointer-events: none;
		}
	}

	.headers, .statusbar {
		/* So that the scrollbar doesn't cause the headers/statusbar to shift */
		padding-right: 11px;
	}

	.table {
		color: var(--tably-color, hsl(0, 0%, 0%));
		background-color: var(--tably-bg, hsl(0, 0%, 100%));
	}

	.sticky {
		position: sticky;
		left: 0px;
		/* right: 100px; */
		z-index: 1;
	}

	.sticky.border {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
	}

	.headers > .column {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		resize: horizontal;
		overflow: hidden;
		padding: var(--tably-padding-y, .5rem) 0;
	}
	
	.table {
		display: grid;
		height: 100%;
		position: relative;

		grid-template-areas: 
			'headers     panel'
			'rows        panel'
			'statusbar   panel'
		;

		grid-template-columns: auto min-content;
		grid-template-rows: auto 1fr auto;

		border: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		border-radius: var(--tably-radius, .25rem);

		max-height: 100%;
	}

	.headers {
		grid-area: headers;
		z-index: 2;
		overflow: hidden;
	}

	.headers > .column {
		width: auto !important;
		border-bottom: 1px solid var(--tably-border, hsl(0, 0%, 90%));
	}

	.content {
		grid-area: rows;
		display: grid;
		scrollbar-width: thin;
		overflow: auto;
		height: 100%;
		grid-template-rows: auto auto 1fr;

		> .rows, > .virtual.bottom {
			display: grid;
		}
		> .virtual.bottom {
			min-height: 100%;
		}
	}

	.statusbar {
		grid-area: statusbar;
		overflow: hidden;
		background-color: var(--tably-statusbar, hsl(0, 0%, 98%));
	}

	.statusbar > .column {
		border-top: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		padding: calc(var(--tably-padding-y, .5rem) / 2) 0;
	}

	.headers, .row, .statusbar {
		display: grid;
		width: 100%;
		height: 100%;

		& > .column {
			display: flex;
			padding-left: var(--tably-padding-x, 1rem);
			overflow: hidden;
		}

		& > *:last-child {
			width: 100%;
			padding-right: var(--tably-padding-x, 1rem);
		}
	}

	.row:first-child > * {
		padding-top: calc(var(--tably-padding-y, .5rem) + calc(var(--tably-padding-y, .5rem) / 2));
	}
	.row:last-child > * {
		padding-bottom: calc(var(--tably-padding-y, .5rem) + calc(var(--tably-padding-y, .5rem) / 2));
	}

	.row > * {
		padding: calc(var(--tably-padding-y, .5rem) / 2) 0;
	}

	.panel {
		position: relative;
		grid-area: panel;
		height: 100%;

		border-left: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		scrollbar-gutter: stable both-edges;
		scrollbar-width: thin;
		z-index: 4;

		> .panel-content {
			position: absolute;
			top: 0;
			right: 0;
			width: min-content;
			overflow: auto;
			padding: var(--tably-padding-y, .5rem) 0;
		}
	}

	.statusbar {
		grid-area: statusbar;
	}

</style>