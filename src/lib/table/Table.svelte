<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang="ts">
		
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'
	import reorder, { type ItemState } from 'runic-reorder'
	import { Virtualization } from './virtualization.svelte.js'
	import { TableState, type HeaderSelectCtx, type RowSelectCtx, type TableProps } from './table.svelte.js'
	import Panel, { PanelTween } from '$lib/panel/Panel.svelte'
	import Column from '$lib/column/Column.svelte'
	import { fromProps, mounted } from '$lib/utility.svelte.js'
	import { conditional } from '$lib/conditional.svelte.js'
	import { ColumnState } from '$lib/column/column.svelte.js'

	type T = $$Generic<Record<PropertyKey, unknown>>

	type ConstructorReturnType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer K ? K : never
	type ConstructorParams<T extends new (...args: any[]) => any> = T extends new (...args: infer K) => any ? K : never

	type ContentCtx<T extends Record<PropertyKey, unknown>> = {
		Column: {
			new <V>(...args: ConstructorParams<typeof Column<T, V>>): ConstructorReturnType<typeof Column<T, V>>
			<V>(...args: Parameters<typeof Column<T, V>>): ReturnType<typeof Column<T, V>>
		}
		Panel: typeof Panel
		readonly table: TableState<T>
		readonly data: T[]
	}

	type ContentSnippet = Snippet<[context: ContentCtx<T>]>

	let {
		content,
		selected: _selected = $bindable([]),
		panel: _panel = $bindable(),
		data: _data = $bindable([]),
		...restProps
	}: TableProps<T> & { content: ContentSnippet } = $props()

	const properties = fromProps(restProps, {
		selected: [() => _selected, v => _selected = v],
		panel: [() => _panel, v => _panel = v],
		data: [() => _data, v => _data = v]
	}) as TableProps<T>

	const mount = mounted()

	const reorderArea = reorder(rowSnippet)

	const elements = $state({}) as Record<
		'headers' | 'statusbar' | 'rows' | 'virtualTop' | 'virtualBottom' | 'selects',
		HTMLElement
	>
	
	const table = new TableState<T>(properties) as TableState<T>
	const data = table.data
	
	const virtualization = new Virtualization(table)
	
	const panelTween = new PanelTween(() => properties.panel, 24)

	let hoveredRow: T | null = $state(null)

	/** Order of columns */
	const fixed = $derived(table.positions.fixed)
	const hidden = $derived(table.positions.hidden)
	const notHidden = (column: ColumnState) => !table.positions.hidden.includes(column)
	const sticky = $derived(table.positions.sticky.filter(notHidden))
	const scrolled = $derived(table.positions.scroll.filter(notHidden))
	const columns = $derived([...fixed, ...sticky, ...scrolled])

	/** Width of each column */
	const columnWidths = $state({}) as Record<string, number>

	const getWidth = (key: string, def: number = 150) =>
		columnWidths[key] || table.columns[key]?.defaults.width || def

	/** grid-template-columns for widths */
	const style = $derived.by(() => {
		if (!mount.isMounted) return ''
		const templateColumns = `
	#${table.id} > .headers,
	tr.row[data-svelte-tably='${table.id}'],
	#${table.id} > tfoot > tr,
	#${table.id} > .content > .virtual.bottom {
		grid-template-columns: ${columns
			.map((column, i, arr) => {
				const width = getWidth(column.id)
				if (i === arr.length - 1) return `minmax(${width}px, 1fr)`
				return `${width}px`
			})
			.join(' ')};
	}
		`

		let sum = 0
		const stickyLeft = [...fixed, ...sticky]
			.map((column, i, arr) => {
				sum += getWidth(arr[i - 1]?.id, i === 0 ? 0 : undefined)
				return `
		#${table.id} .column.sticky[data-column='${column.id}'],
		[data-svelte-tably='${table.id}'] .column.sticky[data-column='${column.id}'] {
			left: ${sum}px;
		}
		`
			})
			.join('')

		return templateColumns + stickyLeft
	})

	function observeColumnWidth(node: HTMLDivElement, isHeader = false) {
		if (!isHeader) return

		const key = node.getAttribute('data-column')!
		node.style.width = getWidth(key) + 'px'

		let mouseup = false

		const observer = new MutationObserver(() => {
			const width = parseFloat(node.style.width)
			if(width === columnWidths[key]) return
			columnWidths[key] = width
			if(!mouseup) {
				mouseup = true
				window.addEventListener('click', (e) => {
					e.preventDefault()
					e.stopPropagation()
					mouseup = false
				}, { once: true, capture: true })
			}
		})

		observer.observe(node, { attributes: true })
		return { destroy: () => observer.disconnect() }
	}

	async function onscroll() {
		const target = virtualization.viewport.element!
		if (target.scrollTop !== virtualization.scrollTop) {
			virtualization.scrollTop = target?.scrollTop ?? virtualization.scrollTop
		}

		if (elements.selects) {
			elements.selects.scrollTop = target?.scrollTop
		}

		if (!elements.headers) return
		elements.headers.scrollLeft = target.scrollLeft
		elements.statusbar.scrollLeft = target.scrollLeft
	}

	let csv = $state(false)
	let csvElement = $state() as undefined | HTMLTableElement
	interface CSVOptions {
		semicolon?: boolean
	}
	export async function toCSV(opts: CSVOptions = {}) {
		csv = true
		let resolve: (value: HTMLTableElement) => void
		const promise = new Promise<HTMLTableElement>(r => resolve = r)

		const clean = $effect.root(() => {
			$effect(() => {
				if(csvElement) {
					resolve(csvElement)
				}
			})
		})

		let table = await promise
		clean()

		const separator = opts.semicolon ? ";" : ","
		const rows = Array.from(table.rows)
		const csvRows = []

		for (const row of rows) {
			const cells = Array.from(row.cells)
			const csvCells = cells.map(cell => {
				let text = cell.textContent?.trim() || ''

				// Escape double quotes and wrap in quotes if needed
				if(text.includes('"')) {
					text = text.replace(/"/g, '""')
				}
				if(text.includes(separator) || text.includes('"') || text.includes('\n')) {
					text = `"${text}"`
				}
				
				return text
			})
			csvRows.push(csvCells.join(separator))
		}

		csv = false
		return csvRows.join("\n")
	}
</script>

<!---------------------------------------------------->

{#if csv === true}
	{@const renderedColumns = columns.filter(v => v.id !== '__fixed')}
	<table bind:this={csvElement} hidden>
		<thead>
			<tr>
				{#each renderedColumns as column}
					<th>{@render column.snippets.title()}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.current as row, i}
				<tr>
					{#each renderedColumns as column}
						<td>
							{@render column.snippets.row?.(row, {
								index: i,
								value: column.options.value?.(row),
								isHovered: false,
								itemState: { index: i, dragging: false, positioning: false } as ItemState<any>,
								selected: false
							})}
							<!-- {@render row[column.id]} -->
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

{#snippet chevronSnippet(reversed: boolean)}
	<svg
		class="sorting-icon"
		class:reversed
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		style="margin: auto; margin-right: var(--tably-padding-x, 1rem);"
	>
		<path
			fill="currentColor"
			d="M3.2 5.74a.75.75 0 0 1 1.06-.04L8 9.227L11.74 5.7a.75.75 0 1 1 1.02 1.1l-4.25 4a.75.75 0 0 1-1.02 0l-4.25-4a.75.75 0 0 1-.04-1.06"
		></path>
	</svg>
{/snippet}

{#snippet dragSnippet()}
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
		<path
			fill="currentColor"
			d="M5.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m0 4.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m1.5 3a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0M10.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3M12 8a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m-1.5 6a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"
		></path>
	</svg>
{/snippet}

{#snippet columnsSnippet(
	renderable: (column: ColumnState) => Snippet<[arg0?: any, arg1?: any]> | undefined,
	arg: null | ((column: ColumnState) => any[]) = null,
	isHeader = false
)}
	{#each fixed as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && column.options.sort && !table.options.reorderable}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column sticky fixed"
				data-column={column.id}
				class:header={isHeader}
				class:sortable
				use:conditional={[isHeader, (node) => data.sortAction(node, column.id)]}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && data.sortby === column.id && sortable}
					{@render chevronSnippet(data.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
	{#each sticky as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && column.options.sort && !table.options.reorderable}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column sticky"
				use:observeColumnWidth={isHeader}
				data-column={column.id}
				class:header={isHeader}
				class:resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:border={i == sticky.length - 1}
				class:sortable
				use:conditional={[isHeader, (node) => data.sortAction(node, column.id)]}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && data.sortby === column.id && sortable}
					{@render chevronSnippet(data.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
	{#each scrolled as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && column!.options.sort && !table.options.reorderable}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column"
				data-column={column.id}
				use:observeColumnWidth={isHeader}
				class:resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:sortable
				use:conditional={[isHeader, (node) => data.sortAction(node, column.id)]}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && data.sortby === column.id && sortable}
					{@render chevronSnippet(data.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
{/snippet}

{#snippet rowSnippet(item: T, itemState?: ItemState<T>)}
	{@const i = itemState?.index ?? 0}
	{@const index = (itemState?.index ?? 0)}
	<svelte:element
		this={table.options.href ? 'a' : 'tr'}
		aria-rowindex={index + 1}
		data-svelte-tably={table.id}
		style:opacity={itemState?.positioning ? 0 : 1}
		class="row"
		class:hover={hoveredRow === item}
		class:dragging={itemState?.dragging}
		class:selected={table.selected?.includes(item)}
		class:first={i === 0}
		class:last={i === virtualization.area.length - 1}
		{...(table.options.href ? { href: table.options.href(item) } : {})}
		{...(itemState?.dragging ? { 'data-svelte-tably': table.id } : {})}
		onpointerenter={() => (hoveredRow = item)}
		onpointerleave={() => (hoveredRow = null)}
	>
		{@render columnsSnippet(
			(column) => column.snippets.row,
			(column) => {
				return [
					item,
					{
						get index() {
							return index
						},
						get value() {
							return column.options.value ? column.options.value(item) : undefined
						},
						get isHovered() {
							return hoveredRow === item
						},
						get selected() {
							return table.selected?.includes(item)
						},
						set selected(value) {
							value ?
								table.selected!.push(item)
							:	table.selected!.splice(table.selected!.indexOf(item), 1)
						},
						get itemState() {
							return itemState
						}
					}
				]
			}
		)}
	</svelte:element>
{/snippet}

<table
	id={table.id}
	class="table svelte-tably"
	style="--t: {virtualization.virtualTop}px; --b: {virtualization.virtualBottom}px;"
	aria-rowcount={data.current.length}
>
	<thead class="headers" bind:this={elements.headers}>
		{@render columnsSnippet(
			(column) => column.snippets.header,
			() => [{ 
				get header() { return true } ,
				get data() { return data.current }
			}],
			true
		)}
	</thead>

	<tbody
		class="content"
		use:reorderArea={{ axis: 'y' }}
		bind:this={virtualization.viewport.element}
		onscrollcapture={onscroll}
		bind:clientHeight={virtualization.viewport.height}
	>
		{#if table.options.reorderable}
			{@render reorderArea({
				get view() {
					return virtualization.area
				},
				get modify() {
					return data.origin
				},
				get startIndex() {
					return virtualization.topIndex
				}
			})}
		{:else}
		{#each virtualization.area as item, i (item)}
			{@render rowSnippet(item, { index: i + virtualization.topIndex } as ItemState)}
		{/each}
		{/if}
	</tbody>

	<tfoot class="statusbar" bind:this={elements.statusbar}>
		<tr>
			{@render columnsSnippet(
				(column) => column.snippets.statusbar,
				() => [{
					get data() { return data.current }
				}]
			)}
		</tr>
	</tfoot>

	<caption
		class="panel"
		style="width: {panelTween.current}px;"
		style:overflow={panelTween.transitioning ? 'hidden' : 'auto'}
	>
		{#if properties.panel && properties.panel in table.panels}
			<div
				class="panel-content"
				bind:clientWidth={panelTween.width}
				in:fly={{ x: 100, easing: sineInOut, duration: 300 }}
				out:fly={{ x: 100, duration: 200, easing: sineInOut }}
			>
				{@render table.panels[properties.panel].children({
					get table() {
						return table
					},
					get data() {
						return data.current
					}
				})}
			</div>
		{/if}
	</caption>
	<caption class="backdrop" aria-hidden={properties.panel && table.panels[properties.panel]?.backdrop ? false : true}>
		<button aria-label="Panel backdrop" class="btn-backdrop" tabindex="-1" onclick={() => (properties.panel = undefined)}
		></button>
	</caption>
</table>

{#snippet headerSelected(ctx: HeaderSelectCtx<T>)}
	<input type="checkbox" indeterminate={ctx.indeterminate} bind:checked={ctx.isSelected} />
{/snippet}

{#snippet rowSelected(ctx: RowSelectCtx<T>)}
	<input type="checkbox" bind:checked={ctx.isSelected} />
{/snippet}

{#if table.options.select || table.options.reorderable}
	{@const { select, reorderable } = table.options}
	{@const {
		show = 'hover',
		style = 'column',
		rowSnippet = rowSelected,
		headerSnippet = headerSelected
	} = typeof select === 'boolean' ? {} : select}
	{#if show !== 'never' || reorderable}
		<Column
			id="__fixed"
			{table}
			fixed
			width={Math.max(56, (select && show !== 'never' ? 34 : 0) + (reorderable ? 34 : 0))}
			resizeable={false}
		>
			{#snippet header()}
				<div class="__fixed">
					{#if reorderable}
						<span style="width: 16px; display: flex; align-items: center;"></span>
					{/if}
					{#if select}
						{@render headerSnippet({
							get isSelected() {
								return data.current.length === table.selected?.length && data.current.length > 0
							},
							set isSelected(value) {
								if (value) {
									table.selected = data.current
								} else {
									table.selected = []
								}
							},
							get selected() {
								return table.selected!
							},
							get indeterminate() {
								return (
									(table.selected?.length || 0) > 0 &&
									data.current.length !== table.selected?.length
								)
							}
						})}
					{/if}
				</div>
			{/snippet}
			{#snippet row(item, row)}
				<div class="__fixed">
					{#if reorderable}
						<span style="width: 16px; display: flex; align-items: center;" use:row.itemState.handle>
							{#if (row.isHovered && !row.itemState?.area.isTarget) || row.itemState.dragging}
								{@render dragSnippet()}
							{/if}
						</span>
					{/if}
					{#if select && (row.selected || show === 'always' || (row.isHovered && show === 'hover'))}
						{@render rowSnippet({
							get isSelected() {
								return row.selected
							},
							set isSelected(value) {
								row.selected = value
							},
							get row() {
								return row
							},
							get item() {
								return item
							},
							get data() {
								return data.current
							}
						})}
					{/if}
				</div>
			{/snippet}
		</Column>
	{/if}
{/if}

{@render content?.({
	Column,
	Panel,
	get table() {
		return table
	},
	get data() {
		return data.current
	}
})}

<!---------------------------------------------------->
<style>
	.svelte-tably *,
	.svelte-tably {
		box-sizing: border-box;
		background-color: inherit;
	}

	.svelte-tably {
		position: relative;
		overflow: visible;
	}

	caption {
		all: unset;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	button.btn-backdrop {
		outline: none;
		border: none;
		cursor: pointer;
	}

	.sorting-icon {
		transition: transform 0.15s ease;
		transform: rotateZ(0deg);
		&.reversed {
			transform: rotateZ(-180deg);
		}
	}

	.__fixed {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
	}

	.first .__fixed {
		top: var(--tably-padding-y, 0.5rem);
	}
	.last .__fixed {
		bottom: var(--tably-padding-y, 0.5rem);
	}

	tbody::before,
	tbody::after,
	selects::before,
	selects::after {
		content: '';
		display: grid;
		min-height: 100%;
	}

	tbody::before,
	selects::before {
		height: var(--t);
	}
	tbody::after,
	selects::after {
		height: var(--b);
	}

	a.row {
		color: inherit;
		text-decoration: inherit;
	}

	.backdrop {
		position: absolute;
		left: 0px;
		top: 0px;
		bottom: 0px;
		right: 0px;
		background-color: hsla(0, 0%, 0%, 0.3);
		z-index: 3;
		opacity: 1;
		transition: 0.15s ease;
		border: none;
		outline: none;
		cursor: pointer;

		> button {
			position: absolute;
			left: 0px;
			top: 0px;
			bottom: 0px;
			right: 0px;
		}

		&[aria-hidden='true'] {
			opacity: 0;
			pointer-events: none;
		}
	}

	.headers,
	.statusbar {
		/* So that the scrollbar doesn't cause the headers/statusbar to shift */
		padding-right: 11px;
	}

	.table {
		color: var(--tably-color, hsl(0, 0%, 0%));
		background-color: var(--tably-bg, hsl(0, 0%, 100%));
	}

	.sticky {
		position: sticky;
		/* right: 100px; */
		z-index: 1;
	}

	.sticky.border {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
	}

	.headers > .column {
		border-right: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		overflow: hidden;
		padding: var(--tably-padding-y, 0.5rem) 0;
		cursor: default;
		user-select: none;

		&.sortable {
			cursor: pointer;
		}

		&.resizeable {
			resize: horizontal;
		}
	}

	.table {
		display: grid;
		height: 100%;
		position: relative;

		grid-template-areas:
			'headers     panel'
			'rows        panel'
			'statusbar   panel';

		grid-template-columns: auto min-content;
		grid-template-rows: auto 1fr auto;

		border: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		border-radius: var(--tably-radius, 0.25rem);

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
		display: grid;
		grid-auto-rows: max-content;

		grid-area: rows;
		scrollbar-width: thin;
		overflow: auto;
		/* height: 100%; */
	}

	.statusbar {
		grid-area: statusbar;
		overflow: hidden;
		background-color: var(--tably-statusbar, hsl(0, 0%, 98%));
	}

	.statusbar > tr > .column {
		border-top: 1px solid var(--tably-border, hsl(0, 0%, 90%));
		padding: calc(var(--tably-padding-y, 0.5rem) / 2) 0;
	}

	.headers,
	.row,
	.statusbar > tr {
		position: relative;
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

	.row:first-child:not(.dragging) > * {
		padding-top: calc(var(--tably-padding-y, 0.5rem) + calc(var(--tably-padding-y, 0.5rem) / 2));
	}
	.row:last-child:not(.dragging) > * {
		padding-bottom: calc(var(--tably-padding-y, 0.5rem) + calc(var(--tably-padding-y, 0.5rem) / 2));
	}

	.row > * {
		padding: calc(var(--tably-padding-y, 0.5rem) / 2) 0;
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
			padding: var(--tably-padding-y, 0.5rem) 0;
		}
	}
</style>
