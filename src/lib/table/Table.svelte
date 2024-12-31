<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang="ts">
</script>

<script lang="ts">
	import { type Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'
	import reorder, { type ItemState } from 'runic-reorder'
	import { Virtualization } from './virtualization.svelte.js'
	import {
		TableState,
		type HeaderSelectCtx,
		type RowCtx,
		type RowSelectCtx,
		type TableProps
	} from './table.svelte.js'
	import Panel from '$lib/panel/Panel.svelte'
	import Column from '$lib/column/Column.svelte'
	import { assignDescriptors, capitalize, fromProps, mounted, segmentize } from '$lib/utility.svelte.js'
	import { conditional } from '$lib/conditional.svelte.js'
	import { ColumnState, type RowColumnCtx } from '$lib/column/column.svelte.js'
	import Expandable from '$lib/expandable/Expandable.svelte'
	import { SizeTween } from '$lib/size-tween.svelte.js'
	import { on } from 'svelte/events'
	import Row from '$lib/row/Row.svelte'

	type T = $$Generic<Record<PropertyKey, unknown>>

	type ConstructorReturnType<T extends new (...args: any[]) => any> =
		T extends new (...args: any[]) => infer K ? K : never
	type ConstructorParams<T extends new (...args: any[]) => any> =
		T extends new (...args: infer K) => any ? K : never

	type ContentCtx<T extends Record<PropertyKey, unknown>> = {
		Column: {
			new <V>(...args: ConstructorParams<typeof Column<T, V>>): ConstructorReturnType<typeof Column<T, V>>
			<V>(...args: Parameters<typeof Column<T, V>>): ReturnType<typeof Column<T, V>>
		}
		Panel: typeof Panel<T>
		Expandable: typeof Expandable<T>
		Row: typeof Row<T>
		readonly table: TableState<T>
	}

	type ContentSnippet = Snippet<[context: ContentCtx<T>]>

	let {
		content,
		selected: _selected = $bindable([]),
		panel: _panel = $bindable(),
		data: _data = $bindable([]),
		...restProps
	}: TableProps<T> & { content?: ContentSnippet } = $props()

	const properties = fromProps(restProps, {
		selected: [() => _selected, (v) => (_selected = v)],
		panel: [() => _panel, (v) => (_panel = v)],
		data: [() => _data, (v) => (_data = v)]
	}) as TableProps<T>

	const mount = mounted()

	const reorderArea = reorder(rowSnippet)

	const elements = $state({}) as Record<
		'headers' | 'statusbar' | 'rows' | 'virtualTop' | 'virtualBottom' | 'selects',
		HTMLElement
	>

	const table = new TableState<T>(properties) as TableState<T>

	const virtualization = new Virtualization(table)

	const panelTween = new SizeTween(() => !!properties.panel)

	let hoveredRow: T | null = $state(null)
	let hoveredColumn: ColumnState | null = $state(null)

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

		const context = table.row?.snippets.context ? table.row?.options.context.width : ''

		const templateColumns =
			columns
				.map((column, i, arr) => {
					const width = getWidth(column.id)
					if (i === arr.length - 1) return `minmax(${width}px, 1fr)`
					return `${width}px`
				})
				.join(' ') + context

		const theadTempla3teColumns = `
	#${table.id} > thead > tr,
	#${table.id} > tfoot > tr {
		grid-template-columns: ${templateColumns};
	}
		`

		const tbodyTemplateColumns = `
	[data-area-class='${table.id}'] tr.row,
	#${table.id} > tbody::after {
		grid-template-columns: ${templateColumns};
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

		const columnStyling = columns
			.map((column) =>
				!column.options.style ?
					''
				:	`
		[data-area-class='${table.id}'] .column[data-column='${column.id}'] {
			${column.options.style}
		}
		`
			)
			.join('')

		return theadTempla3teColumns + tbodyTemplateColumns + stickyLeft + columnStyling
	})

	function observeColumnWidth(node: HTMLDivElement, isHeader = false) {
		if (!isHeader) return

		const key = node.getAttribute('data-column')!
		node.style.width = getWidth(key) + 'px'

		let mouseup = false

		const observer = new MutationObserver(() => {
			const width = parseFloat(node.style.width)
			if (width === columnWidths[key]) return
			columnWidths[key] = width
			if (!mouseup) {
				mouseup = true
				window.addEventListener(
					'click',
					(e) => {
						e.preventDefault()
						e.stopPropagation()
						mouseup = false
					},
					{ once: true, capture: true }
				)
			}
		})

		observer.observe(node, { attributes: true })
		return { destroy: () => observer.disconnect() }
	}

	let tbody = $state({
		width: 0
	})
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

	// * --- CSV --- *
	let csv = $state(false) as false | { selected?: boolean }
	let csvElement = $state() as undefined | HTMLTableElement
	interface CSVOptions {
		/** Semi-colons as separator? */
		semicolon?: boolean
		/** Only selected rows */
		selected?: boolean
	}
	export async function toCSV(opts: CSVOptions = {}) {
		csv = { selected: !!opts.selected }
		let resolve: (value: HTMLTableElement) => void
		const promise = new Promise<HTMLTableElement>((r) => (resolve = r))

		const clean = $effect.root(() => {
			$effect(() => {
				if (csvElement) {
					resolve(csvElement)
				}
			})
		})

		let table = await promise
		clean()

		const separator = opts.semicolon ? ';' : ','
		const rows = Array.from(table.rows)
		const csvRows = []

		for (const row of rows) {
			const cells = Array.from(row.cells)
			const csvCells = cells.map((cell) => {
				let text = cell.textContent?.trim() || ''

				// Escape double quotes and wrap in quotes if needed
				if (text.includes('"')) {
					text = text.replace(/"/g, '""')
				}
				if (text.includes(separator) || text.includes('"') || text.includes('\n')) {
					text = `"${text}"`
				}

				return text
			})
			csvRows.push(csvCells.join(separator))
		}

		csv = false
		return csvRows.join('\n')
	}
	// * --- CSV --- *

	let expandedRow = $state([]) as T[]
	let expandTick = false
	function toggleExpand(item: T, value?: boolean) {
		if (expandTick) return
		expandTick = true
		requestAnimationFrame(() => (expandTick = false))

		let indexOf = expandedRow.indexOf(item)
		if (value === undefined) {
			value = indexOf === -1
		}
		if (!value) {
			expandedRow.splice(indexOf, 1)
			return
		}
		if (table.expandable?.options.multiple === true) {
			expandedRow.push(item)
		} else {
			expandedRow[0] = item
		}
	}

	function addRowColumnEvents(
		node: HTMLTableColElement,
		opts: ['header' | 'row' | 'statusbar', ColumnState, () => RowColumnCtx<T, any>]
	) {
		const [where, column, value] = opts
		if (where !== 'row') return
		if (column.options.onclick) {
			$effect(() => on(node, 'click', (e) => column.options.onclick!(e, value())))
		}
	}

	function addRowEvents(node: HTMLTableRowElement, ctx: RowCtx<T>) {
		if (table.row?.events.onclick) {
			$effect(() => on(node, 'click', (e) => table.row?.events.onclick!(e, ctx)))
		}
		if (table.row?.events.oncontextmenu) {
			$effect(() => on(node, 'contextmenu', (e) => table.row?.events.oncontextmenu!(e, ctx)))
		}
	}
</script>

<!---------------------------------------------------->

{#if csv !== false}
	{@const renderedColumns = columns.filter((v) => v.id !== '__fixed')}
	<table bind:this={csvElement} hidden>
		<thead>
			<tr>
				{#each renderedColumns as column}
					<th>{@render column.snippets.title()}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each table.data as row, i}
				{#if (csv.selected && table.selected.includes(row)) || !csv.selected}
					<tr>
						{#each renderedColumns as column}
							<td>
								{#if column.snippets.row}
									{@render column.snippets.row(row, {
										index: i,
										value: column.options.value?.(row),
										columnHovered: false,
										rowHovered: false,
										itemState: {
											index: i,
											dragging: false,
											positioning: false
										} as ItemState<any>,
										selected: false,
										expanded: false,
									})}
								{:else}
									{column.options.value?.(row)}
								{/if}
							</td>
						{/each}
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
{/if}

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

{#snippet chevronSnippet(rotation: number = 0)}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		style="transform: rotate({rotation}deg)"
	>
		<path
			fill="currentColor"
			d="M3.2 10.26a.75.75 0 0 0 1.06.04L8 6.773l3.74 3.527a.75.75 0 1 0 1.02-1.1l-4.25-4a.75.75 0 0 0-1.02 0l-4.25 4a.75.75 0 0 0-.04 1.06"
		></path>
	</svg>
{/snippet}

{#snippet dragSnippet()}
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" style="opacity: .3">
		<path
			fill="currentColor"
			d="M5.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m0 4.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m1.5 3a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0M10.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3M12 8a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m-1.5 6a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"
		></path>
	</svg>
{/snippet}

{#snippet columnsSnippet(
	renderable: (column: ColumnState) => Snippet<[arg0?: any, arg1?: any]> | undefined,
	arg: null | ((column: ColumnState) => any[]) = null,
	where: 'header' | 'row' | 'statusbar'
)}
	{@const isHeader = where === 'header'}
	{#each fixed as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && column.options.sort && !table.options.reorderable}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class={column.options.class ?? ''}
				class:column={true}
				class:sticky={true}
				class:fixed={true}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				data-column={column.id}
				class:pad={(isHeader && column.options.padHeader) || (!isHeader && column.options.padRow)}
				class:header={isHeader}
				class:sortable
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class='sorting-icon'>
						{@render chevronSnippet(table.dataState.sortReverse ? 0 : 180)}
					</span>
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
				class={column.options.class ?? ''}
				class:column={true}
				class:sticky={true}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				use:observeColumnWidth={isHeader}
				data-column={column.id}
				class:pad={(isHeader && column.options.padHeader) || (!isHeader && column.options.padRow)}
				class:header={isHeader}
				class:resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:border={i == sticky.length - 1}
				class:sortable
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class='sorting-icon'>
						{@render chevronSnippet(table.dataState.sortReverse ? 0 : 180)}
					</span>
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
				class={column.options.class ?? ''}
				class:column={true}
				data-column={column.id}
				class:pad={(isHeader && column.options.padHeader) || (!isHeader && column.options.padRow)}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				use:observeColumnWidth={isHeader}
				class:resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:sortable
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class='sorting-icon'>
						{@render chevronSnippet(table.dataState.sortReverse ? 0 : 180)}
					</span>
				{/if}
			</svelte:element>
		{/if}
	{/each}
{/snippet}

{#snippet defaultRow(item: T, ctx: RowColumnCtx<T, any>)}
	{ctx.value}
{/snippet}

{#snippet rowSnippet(item: T, itemState?: ItemState<T>)}
	{@const index = itemState?.index ?? 0}

	{@const ctx: RowCtx<T> = {
		get index() {
			return index
		},
		get rowHovered() {
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
		},
		get expanded() {
			return expandedRow.includes(item)
		},
		set expanded(value) {
			toggleExpand(item, value)
		}
	}}

	<tr
		aria-rowindex={index + 1}
		style:opacity={itemState?.positioning ? 0 : 1}
		class="row"
		class:dragging={itemState?.dragging}
		class:selected={table.selected?.includes(item)}
		class:first={index === 0}
		class:last={index === virtualization.area.length - 1}
		{...itemState?.dragging ? { 'data-svelte-tably': table.id } : {}}
		onpointerenter={() => (hoveredRow = item)}
		onpointerleave={() => (hoveredRow = null)}
		use:addRowEvents={ctx}
		onclick={(e) => {
			if (table.expandable?.options.click === true) {
				let target = e.target as HTMLElement
				if (['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName)) {
					return
				}
				ctx.expanded = !ctx.expanded
			}
		}}
	>
		{@render columnsSnippet(
			(column) => column.snippets.row ?? defaultRow,
			(column) => {
				return [
					item,
					assignDescriptors(
						{
							get value() {
								return column.options.value ? column.options.value(item) : undefined
							},
							get columnHovered() {
								return hoveredColumn === column
							}
						},
						ctx
					)
				]
			},
			'row'
		)}
		{#if table.row?.snippets.context}
			{#if table.row?.snippets.contextHeader || !table.row?.options.context.hover || hoveredRow === item}
				<td
					class="context-col"
					class:hover={!table.row?.snippets.contextHeader && table.row?.options.context.hover}
					class:hidden={table.row?.options.context.hover &&
						table.row?.snippets.contextHeader &&
						hoveredRow !== item}
				>
					{@render table.row?.snippets.context?.(item, ctx)}
				</td>
			{/if}
		{/if}
	</tr>

	{@const expandableTween = new SizeTween(() => table.expandable && expandedRow.includes(item), {
		min: 1,
		duration: table.expandable?.options.slide.duration,
		easing: table.expandable?.options.slide.easing
	})}
	{#if expandableTween.current > 0}
		<tr class="expandable" style="height: {expandableTween.current}px">
			<td colspan={columns.length} style="height: {expandableTween.current}px">
				<div bind:offsetHeight={expandableTween.size} style="width: {tbody.width - 3}px">
					{@render table.expandable!.snippets.content?.(item, ctx)}
				</div>
			</td>
		</tr>
	{/if}
{/snippet}

<table
	id={table.id}
	class="table svelte-tably"
	style="--t: {virtualization.virtualTop}px; --b: {virtualization.virtualBottom}px;"
	aria-rowcount={table.data.length}
>
	{#if columns.some((v) => v.snippets.header)}
		<thead class="headers" bind:this={elements.headers}>
			<tr style="min-width: {tbody.width}px">
				{@render columnsSnippet(
					(column) => column.snippets.header,
					() => [
						{
							get header() {
								return true
							},
							get data() {
								return table.data
							}
						}
					],
					'header'
				)}
				{#if table.row?.snippets.contextHeader}
					<th class="context-col">
						{@render table.row?.snippets.contextHeader()}
					</th>
				{/if}
			</tr>
			<tr style="width:400px;background:none;pointer-events:none;"></tr>
		</thead>
	{/if}

	<tbody
		class="content"
		use:reorderArea={{ axis: 'y', class: table.id }}
		bind:this={virtualization.viewport.element}
		onscrollcapture={onscroll}
		bind:clientHeight={virtualization.viewport.height}
		bind:clientWidth={tbody.width}
	>
		{#if table.options.reorderable}
			{@render reorderArea({
				get view() {
					return virtualization.area
				},
				get modify() {
					return table.dataState.origin
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

	{#if columns.some((v) => v.snippets.statusbar)}
		<tfoot class="statusbar" bind:this={elements.statusbar}>
			<tr>
				{@render columnsSnippet(
					(column) => column.snippets.statusbar,
					() => [
						{
							get data() {
								return table.data
							}
						}
					],
					'statusbar'
				)}
			</tr>
			<tr style="width:400px;background:none;pointer-events:none;"></tr>
		</tfoot>
	{/if}

	<caption class="panel" style="width: {panelTween.current}px;">
		{#if properties.panel && properties.panel in table.panels}
			<div
				class="panel-content"
				bind:offsetWidth={panelTween.size}
				in:fly={{ x: 100, easing: sineInOut, duration: 300 }}
				out:fly={{ x: 100, duration: 200, easing: sineInOut }}
			>
				{@render table.panels[properties.panel].children({
					get table() {
						return table
					},
					get data() {
						return table.data
					}
				})}
			</div>
		{/if}
	</caption>
	<caption
		class="backdrop"
		aria-hidden={properties.panel && table.panels[properties.panel]?.backdrop ? false : true}
	>
		<button
			aria-label="Panel backdrop"
			class="btn-backdrop"
			tabindex="-1"
			onclick={() => (properties.panel = undefined)}
		></button>
	</caption>
</table>

{#snippet headerSelected(ctx: HeaderSelectCtx<T>)}
	<input type="checkbox" indeterminate={ctx.indeterminate} bind:checked={ctx.isSelected} />
{/snippet}

{#snippet rowSelected(ctx: RowSelectCtx<T>)}
	<input type="checkbox" bind:checked={ctx.isSelected} tabindex="-1" />
{/snippet}

{#if table.options.select || table.options.reorderable || table.expandable}
	{@const { select, reorderable } = table.options}
	{@const expandable = table.expandable}
	{@const {
		show = 'hover',
		style = 'column',
		rowSnippet = rowSelected,
		headerSnippet = headerSelected
	} = typeof select === 'boolean' ? {} : select}
	{#if show !== 'never' || reorderable || expandable?.options.chevron !== 'never'}
		<Column
			id="__fixed"
			{table}
			fixed
			width={Math.max(
				48,
				0 +
					(select && show !== 'never' ? 34 : 0) +
					(reorderable ? 34 : 0) +
					(expandable && expandable?.options.chevron !== 'never' ? 34 : 0)
			)}
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
								return table.data.length === table.selected?.length && table.data.length > 0
							},
							set isSelected(value) {
								if (value) {
									table.selected = table.data
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
									table.data.length !== table.selected?.length
								)
							}
						})}
					{/if}
				</div>
			{/snippet}
			{#snippet row(item, row)}
				<div class="__fixed">
					{#if reorderable && row.itemState}
						<span style="width: 16px; display: flex; align-items: center;" use:row.itemState.handle>
							{#if (row.rowHovered && !row.itemState.area.isTarget) || row.itemState.dragging}
								{@render dragSnippet()}
							{/if}
						</span>
					{/if}
					{#if select && (row.selected || show === 'always' || (row.rowHovered && show === 'hover') || row.expanded)}
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
								return table.data
							}
						})}
					{/if}
					{#if expandable && expandable?.options.chevron !== 'never'}
						<button class="expand-row" tabindex="-1" onclick={() => (row.expanded = !row.expanded)}>
							{#if row.expanded || expandable.options.chevron === 'always' || (row.rowHovered && expandable.options.chevron === 'hover')}
								{@render chevronSnippet(row.expanded ? 180 : 90)}
							{/if}
						</button>
					{/if}
				</div>
			{/snippet}
		</Column>
	{/if}
{/if}

{#if table.options.auto}
	{#each Object.keys(table.data[0] || {}) as key}
		<Column
			id={key}
			value={(r) => r[key]}
			header={capitalize(segmentize(key))}
			sort={typeof table.data[0]?.[key] === 'number' ?
				(a, b) => a - b
			:	(a, b) => String(a).localeCompare(String(b))}
		/>
	{/each}
{/if}

{@render content?.({
	Column,
	Panel,
	Expandable,
	Row,
	get table() {
		return table
	}
})}

<!---------------------------------------------------->
<style>
	.svelte-tably *,
	.svelte-tably {
		box-sizing: border-box;
		background-color: inherit;
	}

	.context-col {
		display: flex;
		align-items: center;
		justify-content: center;
		position: sticky;
		right: 0;
		height: 100%;
		z-index: 3;
		padding: 0;

		&.hover {
			position: absolute;
		}
		&.hidden {
			pointer-events: none;
			user-select: none;
			border-left: none;
			background: none;
			> :global(*) {
				opacity: 0;
			}
		}
	}

	:global(:root) {
		--tably-color: hsl(0, 0%, 0%);
		--tably-bg: hsl(0, 0%, 100%);
		--tably-statusbar: hsl(0, 0%, 98%);

		--tably-border: hsl(0, 0%, 90%);
		--tably-border-grid: hsl(0, 0%, 98%);

		--tably-padding-x: 1rem;
		--tably-padding-y: 0.5rem;

		--tably-radius: 0.25rem;
	}

	.svelte-tably {
		position: relative;
		overflow: visible;
	}

	.expandable {
		position: relative;

		& > td {
			position: sticky;
			left: 1px;
			> div {
				position: absolute;
				overflow: auto;
				top: -1.5px;
				left: 0;
			}
		}
	}

	.expand-row {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0;
		outline: none;
		border: none;
		cursor: pointer;
		background-color: transparent;
		color: inherit;
		width: 20px;
		height: 100%;

		> svg {
			transition: transform 0.15s ease;
		}
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
		align-items: center;
		justify-items: end;
		margin: 0;
		margin-left: auto;
		> svg {
			transition: transform 0.15s ease;
		}
	}

	th:not(:last-child) .sorting-icon {
		margin-right: var(--tably-padding-x);
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

	.row:global(:is(a)) {
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

	.sticky {
		position: sticky;
		/* right: 100px; */
		z-index: 1;
	}

	.sticky.border {
		border-right: 1px solid var(--tably-border);
	}

	.headers > tr > .column {
		overflow: hidden;
		padding: var(--tably-padding-y) 0;
		cursor: default;
		user-select: none;

		&.sticky.border {
			border-right-color: var(--tably-border);
		}

		&:last-child {
			border-right: none;
		}

		&.sortable {
			cursor: pointer;
		}

		&.resizeable {
			resize: horizontal;
		}
	}

	.table {
		display: grid;
		height: auto;
		max-height: 100%;
		position: relative;

		color: var(--tably-color);
		background-color: var(--tably-bg);

		grid-template-areas:
			'headers    panel'
			'rows       panel'
			'statusbar  panel';

		grid-template-columns: auto min-content;
		grid-template-rows: auto 1fr auto;

		border: 1px solid var(--tably-border);
		border-radius: var(--tably-radius);
	}

	.headers {
		display: flex;
		grid-area: headers;
		z-index: 2;
		overflow: hidden;
	}

	.headers > tr > .column {
		width: auto !important;
		border-bottom: 1px solid var(--tably-border);
	}
	.headers > tr {
		> .column,
		> .context-col {
			border-bottom: 1px solid var(--tably-border);
			border-left: 1px solid var(--tably-border-grid);
		}
	}

	.content {
		display: grid;
		grid-auto-rows: max-content;

		grid-area: rows;
		scrollbar-width: thin;
		overflow: auto;
	}

	.statusbar {
		display: flex;
		grid-area: statusbar;
		overflow: hidden;
		background-color: var(--tably-statusbar);
	}

	.statusbar > tr > .column {
		border-top: 1px solid var(--tably-border);
		padding: calc(var(--tably-padding-y) / 2) 0;
	}

	.headers > tr,
	.row,
	.statusbar > tr {
		position: relative;
		display: grid;
		width: 100%;
		height: 100%;

		& > .column {
			display: flex;
			overflow: hidden;

			&:not(.pad), &.pad > :global(*:first-child) {
				padding-left: var(--tably-padding-x);
			}
		}

		& > *:last-child:not(.context-col) {
			width: 100%;

			&:not(.pad), &.pad > :global(*:first-child) {
				padding-right: var(--tably-padding-x);
			}
		}
	}

	.row > .column {
		background-color: var(--tably-bg);
		&:not(.pad), &.pad > :global(*:first-child)  {
			padding-top: var(--tably-padding-y);
			padding-bottom: var(--tably-padding-y);
		}
	}

	:global(#runic-drag .row) {
		border: 1px solid var(--tably-border-grid);
		border-top: 2px solid var(--tably-border-grid);
	}

	.row > * {
		border-left: 1px solid var(--tably-border-grid);
		border-bottom: 1px solid var(--tably-border-grid);
	}

	.panel {
		position: relative;
		grid-area: panel;
		height: 100%;
		overflow: hidden;
		border-left: 1px solid var(--tably-border);

		z-index: 4;

		> .panel-content {
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			width: min-content;
			overflow: auto;
			scrollbar-width: thin;
			padding: var(--tably-padding-y) 0;
		}
	}
</style>
