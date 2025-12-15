<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang="ts">
	import type { Snippet } from 'svelte'
	import {
		TableState,
		type HeaderSelectCtx,
		type RowCtx,
		type RowSelectCtx,
		type TableProps
	} from './table-state.svelte.js'
	import Column from '../column/Column.svelte'
	import Panel from '../panel/Panel.svelte'
	import Expandable from '../expandable/Expandable.svelte'
	import Row from '../row/Row.svelte'

	type ConstructorReturnType<C extends new (...args: any[]) => any> =
		C extends new (...args: any[]) => infer K ? K : never
	type ConstructorParams<C extends new (...args: any[]) => any> =
		C extends new (...args: infer K) => any ? K : never

	export type ContentCtx<Item = any> = {
		Column: {
			new <V>(...args: ConstructorParams<typeof Column<Item, V>>): ConstructorReturnType<typeof Column<Item, V>>
			<V>(...args: Parameters<typeof Column<Item, V>>): ReturnType<typeof Column<Item, V>>
		}
		Panel: typeof Panel<Item>
		Expandable: typeof Expandable<Item>
		Row: typeof Row<Item>
		readonly table: TableState<Item>
	}

	export type ContentSnippet<Item = any> = Snippet<[context: ContentCtx<Item>]>
</script>

<script lang="ts">
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'
	import reorder, { type ItemState } from 'runic-reorder'
	import { Virtualization } from './virtualization.svelte.js'
	import { assignDescriptors, capitalize, fromProps, mounted, segmentize } from '../utility.svelte.js'
	import { conditional } from '../conditional.svelte.js'
	import { ColumnState, type RowColumnCtx } from '../column/column-state.svelte.js'
	import { SizeTween } from '../size-tween.svelte.js'
	import { on } from 'svelte/events'
	import type { CSVOptions } from './csv.js'

	type T = $$Generic

	let {
		content,
		selected: _selected = $bindable([]),
		panel: _panel = $bindable(),
		data: _data = $bindable([]),
		table: _table = $bindable(),
		...restProps
	}: TableProps<T> & { content?: ContentSnippet<T> } = $props()

	const properties = fromProps(restProps, {
		selected: [() => _selected, (v) => (_selected = v)],
		panel: [() => _panel, (v) => (_panel = v)],
		data: [() => _data, (v) => (_data = v)]
	}) as TableProps<T>

	const mount = mounted()


	const getRowLabel = (item: T, index: number) => {
		const labelColumn = columns.find((c) => c.id !== '__fixed')
		const raw = labelColumn?.options.value?.(item)

		if (raw === null || raw === undefined) return `Row ${index + 1}`
		if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
			const text = String(raw).trim()
			return text ? text : `Row ${index + 1}`
		}

		return `Row ${index + 1}`
	}

	const reorderArea = reorder(rowSnippet)

	const elements = $state({}) as Record<'headers' | 'statusbar', HTMLElement>

	const table = new TableState<T>(properties) as TableState<T>
	const uid = table.cssId
	let expandIdCounter = 0
	const expandIds = new WeakMap<object, string>()
	const getExpandId = (item: T) => {
		if (item && typeof item === 'object') {
			let id = expandIds.get(item)
			if (!id) {
				id = `${uid}-expand-${++expandIdCounter}`
				expandIds.set(item, id)
			}
			return id
		}
		return `${uid}-expand-${String(item)}`
	}

	const virtualization = new Virtualization(table)

	const panelTween = new SizeTween(() => !!properties.panel)

	let hoveredRow: T | null = $state(null)
	let hoveredColumn: ColumnState | null = $state(null)

	/** Order of columns */
	const isColumn = (value: unknown): value is ColumnState =>
		value instanceof ColumnState
	const fixed = $derived(table.positions.fixed.filter(isColumn))
	const hidden = $derived(table.positions.hidden.filter(isColumn))
	const notHidden = (column: ColumnState | undefined) =>
		!!column && !table.positions.hidden.includes(column)
	const sticky = $derived(table.positions.sticky.filter(notHidden))
	const scrolled = $derived(table.positions.scroll.filter(notHidden))
	const columns = $derived([...fixed, ...sticky, ...scrolled])

	const autoSchema = $derived.by(() => {
		const rows = table.dataState.origin as any[]
		const keys = [] as string[]
		const seen = new Set<string>()
		const sample = {} as Record<string, unknown>

		for (const row of rows.slice(0, 50)) {
			if (!row || typeof row !== 'object') continue
			for (const key of Object.keys(row)) {
				if (!seen.has(key)) {
					seen.add(key)
					keys.push(key)
				}
				if (sample[key] === undefined && row[key] !== undefined) {
					sample[key] = row[key]
				}
			}
		}

		return { keys, sample }
	})

	const getWidth = (key: string, def: number = 150) =>
		table.columnWidths[key] ??= table.columns[key]?.defaults.width ?? def

	const measureContextCellWidth = (cell: HTMLElement | null) => {
		if (!cell) return 0
		const inner = cell.querySelector(':scope > .context-inner') as HTMLElement | null
		const content = inner?.firstElementChild as HTMLElement | null
		const candidates = [cell, inner, content].filter(Boolean) as HTMLElement[]
		let width = 0
		for (const el of candidates) {
			width = Math.max(
				width,
				Math.ceil(el.getBoundingClientRect().width),
				Math.ceil(el.scrollWidth)
			)
		}
		return width
	}

	let contextWidth = $state(0)
	let contextWidthRaf = 0
	$effect(() => {
		if (!mount.isMounted) {
			contextWidth = 0
			if (contextWidthRaf) cancelAnimationFrame(contextWidthRaf)
			return
		}
		if (!table.row?.snippets.context) {
			contextWidth = 0
			if (contextWidthRaf) cancelAnimationFrame(contextWidthRaf)
			return
		}
		if (!table.row?.options.context.alignHeaderToRows) {
			contextWidth = 0
			if (contextWidthRaf) cancelAnimationFrame(contextWidthRaf)
			return
		}

		virtualization.topIndex
		if (contextWidthRaf) cancelAnimationFrame(contextWidthRaf)
		contextWidthRaf = requestAnimationFrame(() => {
			const headerCell = elements.headers?.querySelector(
				'[data-tably-context-measure="header"]'
			) as HTMLElement | null
			const rowCell = virtualization.viewport.element?.querySelector(
				'[data-tably-context-measure="row"]'
			) as HTMLElement | null

			const width = Math.max(
				measureContextCellWidth(headerCell),
				measureContextCellWidth(rowCell)
			)
			if (width > 0 && width !== contextWidth) {
				contextWidth = width
			}
		})

		return () => {
			if (contextWidthRaf) cancelAnimationFrame(contextWidthRaf)
		}
	})

	/** grid-template-columns for widths */
	let style = $state('')
	$effect(() => {
		if (!mount.isMounted) {
			style = ''
			return
		}

		const context = table.row?.snippets.context ? ' var(--tably-context-width)' : ''

		const templateColumns =
			columns
				.map((column, i, arr) => {
					const width = getWidth(column.id)
					if (i === arr.length - 1) return `minmax(${width}px, 1fr)`
					return `${width}px`
				})
				.join(' ') + context

		const theadTemplateColumns = `
	[data-svelte-tably="${table.cssId}"] > thead > tr,
	[data-svelte-tably="${table.cssId}"] > tfoot > tr {
		grid-template-columns: ${templateColumns};
	}
		`

		const tbodyTemplateColumns = `
	[data-area-class='${table.cssId}'] tr.tably-row,
	[data-area-class='${table.cssId}'] tr.tably-expandable,
	[data-area-class='${table.cssId}'] tr.tably-filler,
	[data-svelte-tably="${table.cssId}"] > tbody::after {
		grid-template-columns: ${templateColumns};
	}
		`

		let sum = 0
		const stickyLeft = [...fixed, ...sticky]
			.map((column, i, arr) => {
				sum += getWidth(arr[i - 1]?.id, i === 0 ? 0 : undefined)
				return `
		[data-svelte-tably="${table.cssId}"] .tably-column.tably-sticky[data-column='${column.id}'],
		[data-svelte-tably-row='${table.cssId}'] .tably-column.tably-sticky[data-column='${column.id}'] {
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
		[data-area-class='${table.cssId}'] .tably-column[data-column='${column.id}'] {
			${column.options.style}
		}
		`
			)
			.join('')

		style = theadTemplateColumns + tbodyTemplateColumns + stickyLeft + columnStyling
	})

	function observeColumnWidth(node: HTMLDivElement, isHeader = false) {
		if (!isHeader) return

		const key = node.getAttribute('data-column')!
		node.style.width = getWidth(key) + 'px'

		let mouseup = false

		const observer = new MutationObserver(() => {
			const width = parseFloat(node.style.width)
			if (width === table.columnWidths[key]) return
			table.columnWidths[key] = width
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
		scrollbar: 0,
		viewportWidth: 0
	})

	function observeScrollbar(node: HTMLElement) {
		if (typeof ResizeObserver === 'undefined') return

		const update = () => {
			// Reserve the same gutter in header/footer as the scrollable body
			tbody.scrollbar = Math.max(0, node.offsetWidth - node.clientWidth)
			tbody.viewportWidth = node.clientWidth
		}

		update()
		const observer = new ResizeObserver(update)
		observer.observe(node)

		return {
			destroy() {
				observer.disconnect()
			}
		}
	}
	function onscroll() {
		const target = virtualization.viewport.element
		if (!target) return
		if (target.scrollTop !== virtualization.scrollTop) {
			virtualization.scrollTop = target?.scrollTop ?? virtualization.scrollTop
		}

		if (elements.headers) {
			elements.headers.scrollLeft = target.scrollLeft
		}

		if (elements.statusbar) {
			elements.statusbar.scrollLeft = target.scrollLeft
		}
	}

	// * --- CSV --- *
	let csv = $state(false) as false | {
		selected: CSVOptions<T>['selected']
		filters: CSVOptions<T>['filters']
		columns: CSVOptions<T>['columns']
	}
	let csvElement = $state() as undefined | HTMLTableElement
	
	export async function toCSV(options: CSVOptions<T> = {}) {
		csv = {
			selected: !!options.selected,
			filters: options.filters ?? true,
			columns: options.columns ?? false
		}
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

		const separator = options.semicolon ? ';' : ','
		const rows = Array.from(table.rows)
		const csvRows = [] as string[]

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
	table.toCSV = toCSV
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

	_table = table
</script>

<!---------------------------------------------------->

{#if csv !== false}
	{@const exportedColumns = 
		csv.columns === false || csv.columns === undefined ? columns.filter((v) => v.id !== '__fixed')
		: csv.columns === true ? [
			...table.positions.fixed.filter(v => v.id !== '__fixed'),
			...table.positions.sticky,
			...table.positions.scroll
		]
		: csv.columns.map(id => table.columns[id]) 
	}
	{@const exportedData = 
		csv.filters === true || csv.filters === undefined ? table.dataState.current
		: table.dataState.origin /* Filtering happens on the row itself via {#if} */
	}
	{@const filters = Array.isArray(csv.filters) ? (csv as { filters: Array<(item: T) => boolean> }).filters : undefined}
	<table bind:this={csvElement} hidden>
		<thead>
			<tr>
				{#each exportedColumns as column}
					<th>{@render column.snippets.title()}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each exportedData as row, i}
				{@const isSelected = !csv.selected || table.selected.includes(row)}
				{@const isFiltered = filters ? filters.every((fn) => fn(row)) : true}
				{#if isSelected && isFiltered}
					<tr>
						{#each exportedColumns as column}
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
										expanded: false
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
	{@html `<`+`style>${style}</style>`}
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
				class:tably-column={true}
				class:tably-sticky={true}
				class:tably-fixed={true}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				data-column={column.id}
				class:tably-pad={
					(where === 'header' && column.options.padHeader) ||
					(where === 'row' && column.options.padRow) ||
					(where === 'statusbar' && column.options.padStatusbar)
				}
				class:tably-header={isHeader}
				class:tably-sortable={sortable}
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class="sorting-icon">
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
				class:tably-column={true}
				class:tably-sticky={true}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				use:observeColumnWidth={isHeader}
				data-column={column.id}
				class:tably-pad={
					(where === 'header' && column.options.padHeader) ||
					(where === 'row' && column.options.padRow) ||
					(where === 'statusbar' && column.options.padStatusbar)
				}
				class:tably-header={isHeader}
				class:tably-resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:tably-border={i == sticky.length - 1}
				class:tably-sortable={sortable}
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class="sorting-icon">
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
				class:tably-column={true}
				data-column={column.id}
				class:tably-pad={
					(where === 'header' && column.options.padHeader) ||
					(where === 'row' && column.options.padRow) ||
					(where === 'statusbar' && column.options.padStatusbar)
				}
				use:addRowColumnEvents={[where, column, () => args[1]]}
				use:observeColumnWidth={isHeader}
				class:tably-resizeable={isHeader && column.options.resizeable && table.options.resizeable}
				class:tably-sortable={sortable}
				use:conditional={[isHeader, (node) => table.dataState.sortAction(node, column.id)]}
				onpointerenter={() => (hoveredColumn = column)}
				onpointerleave={() => (hoveredColumn = null)}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.dataState.sortby === column.id && sortable}
					<span class="sorting-icon">
						{@render chevronSnippet(table.dataState.sortReverse ? 0 : 180)}
					</span>
				{/if}
			</svelte:element>
		{/if}
	{/each}
{/snippet}

{#snippet defaultRow(item: any, ctx: RowColumnCtx<any, any>)}
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
			const current = table.selected
			if (value) {
				if (!current.includes(item)) {
					table.selected = [...current, item]
				}
				return
			}
			if (current.includes(item)) {
				table.selected = current.filter((v) => v !== item)
			}
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
		class="tably-row"
		class:tably-dragging={itemState?.dragging}
		class:tably-selected={table.selected?.includes(item)}
		class:tably-first={index === 0}
		class:tably-last={index === virtualization.area.length - 1}
		{...itemState?.dragging ? { 'data-svelte-tably-row': table.cssId } : {}}
		onpointerenter={() => (hoveredRow = item)}
		onpointerleave={() => (hoveredRow = null)}
		use:addRowEvents={ctx}
		onclick={(e) => {
			if (table.expandable?.options.click === true) {
				const target = e.target
				if (target instanceof Element && target.closest('input, textarea, button, a')) return
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
			<td
				class="context-col"
				class:tably-hidden={table.row?.options.context.hover && hoveredRow !== item}
				data-tably-context-measure={
					table.row?.options.context.alignHeaderToRows &&
					index === virtualization.topIndex ?
						'row'
					:	undefined
				}
			>
				<div class="context-inner">
					{@render table.row?.snippets.context?.(item, ctx)}
				</div>
			</td>
		{/if}
	</tr>

	{@const expandableTween = new SizeTween(() => !!table.expandable && expandedRow.includes(item), {
		min: 0,
		duration: table.expandable?.options.slide.duration,
		easing: table.expandable?.options.slide.easing
	})}
	{@const expanded = !!table.expandable && expandedRow.includes(item)}
	{#if table.expandable && (expanded || expandableTween.current > 0 || expandableTween.transitioning)}
		{@const expandId = getExpandId(item)}
		{@const expandLabelId = `${expandId}-label`}
		<tr class="tably-expandable">
			<td
				class="tably-expandable-cell"
				colspan={columns.length + (table.row?.snippets.context ? 1 : 0)}
				style="padding: 0"
			>
				<div class="tably-expandable-sticky">
					<div
						class="tably-expandable-clip"
						style="height: {Math.round(expandableTween.current)}px"
						id={expandId}
						role="region"
						aria-labelledby={expandLabelId}
						aria-hidden={!expanded}
					>
						<span class="tably-sr-only" id={expandLabelId}>
							Expanded content for {getRowLabel(item, index)}
						</span>
						<div
							class="tably-expandable-content"
							bind:offsetHeight={expandableTween.size}
						>
							{@render table.expandable?.snippets.content?.(item, ctx)}
						</div>
					</div>
				</div>
			</td>
		</tr>
	{/if}
{/snippet}

<table
	id={table.id}
	data-svelte-tably={table.cssId}
	class="tably-table svelte-tably"
	style="--t: {virtualization.virtualTop}px; --b: {virtualization.virtualBottom}px; --scrollbar: {tbody.scrollbar}px; --viewport-width: {tbody.viewportWidth}px; --tably-context-width: {table.row?.options.context.alignHeaderToRows && contextWidth > 0 ? `${contextWidth}px` : (table.row?.options.context.width ?? 'max-content')};"
	aria-rowcount={table.data.length}
>
	{#if columns.some((v) => v.snippets.header)}
		<thead class="tably-headers" bind:this={elements.headers}>
			<tr>
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
				{#if table.row?.snippets.context}
					<th
						class="context-col"
						data-tably-context-measure={table.row?.options.context.alignHeaderToRows ? 'header' : undefined}
						aria-hidden={table.row?.snippets.contextHeader ? undefined : true}
						role={table.row?.snippets.contextHeader ? undefined : 'presentation'}
					>
						{#if table.row?.snippets.contextHeader}
							<div class="context-inner">
								{@render table.row?.snippets.contextHeader()}
							</div>
						{/if}
					</th>
				{/if}
			</tr>
		</thead>
	{/if}

	<tbody
		class="tably-content"
		use:reorderArea={{ axis: 'y', class: table.cssId }}
		use:observeScrollbar
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

		{#if columns.length > 0 && virtualization.virtualTop === 0 && virtualization.virtualBottom === 0}
			<tr class="tably-filler" aria-hidden="true">
				{#each fixed as column (column)}
					{#if !hidden.includes(column)}
						<td
							class={`tably-column tably-sticky tably-fixed ${column.options.class ?? ''}`}
							data-column={column.id}
						></td>
					{/if}
				{/each}
				{#each sticky as column, i (column)}
					{#if !hidden.includes(column)}
						<td
							class={`tably-column tably-sticky ${column.options.class ?? ''}`}
							class:tably-border={i == sticky.length - 1}
							data-column={column.id}
						></td>
					{/if}
				{/each}
				{#each scrolled as column (column)}
					{#if !hidden.includes(column)}
						<td
							class={`tably-column ${column.options.class ?? ''}`}
							data-column={column.id}
						></td>
					{/if}
				{/each}
				{#if table.row?.snippets.context}
					<td class="context-col" aria-hidden="true"></td>
				{/if}
			</tr>
		{/if}
	</tbody>

	{#if columns.some((v) => v.snippets.statusbar)}
		<tfoot class="tably-statusbar" bind:this={elements.statusbar}>
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
				{#if table.row?.snippets.context}
					<td class="context-col" aria-hidden="true"></td>
				{/if}
			</tr>
		</tfoot>
	{/if}

	<caption class="tably-panel" style="width: {panelTween.current}px;">
		{#if properties.panel && properties.panel in table.panels}
			<div
				class="tably-panel-content"
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
		class="tably-backdrop"
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

{#snippet headerSelected(ctx: HeaderSelectCtx<any>)}
	<input type="checkbox" indeterminate={ctx.indeterminate} bind:checked={ctx.isSelected} />
{/snippet}

{#snippet rowSelected(ctx: RowSelectCtx<any>)}
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
						{@const expandId = getExpandId(item)}
						{@const expanded = row.expanded}
						{@const label = expanded ? 'Collapse row' : 'Expand row'}
						<button
							class="expand-row"
							tabindex="-1"
							type="button"
							aria-label={label}
							aria-expanded={expanded}
							aria-controls={expandId}
							onclick={() => (row.expanded = !row.expanded)}
						>
							{#if expanded || expandable.options.chevron === 'always' || (row.rowHovered && expandable.options.chevron === 'hover')}
								{@render chevronSnippet(expanded ? 180 : 90)}
							{/if}
						</button>
					{/if}
				</div>
			{/snippet}
		</Column>
	{/if}
{/if}

{#if table.options.auto}
	{#each autoSchema.keys as key}
		<Column
			id={key}
			value={(r) => (r as any)?.[key]}
			header={capitalize(segmentize(key))}
			sort={typeof autoSchema.sample?.[key] === 'number' ?
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
		z-index: 3;
		padding: 0;
		border-left: 1px solid var(--tably-border);
		&.tably-hidden {
			pointer-events: none;
			user-select: none;
			border-left: none;
			> .context-inner {
				visibility: hidden;
			}
		}
	}

	.context-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: calc(var(--tably-padding-y) / 2) 0;
		overflow: clip;
		width: 100%;
	}

	.tably-table::before {
		content: '';
		grid-area: headers;
		justify-self: end;
		align-self: stretch;
		width: var(--scrollbar, 0px);
		background-color: var(--tably-bg);
		border-bottom: 1px solid var(--tably-border);
		border-right: 1px solid var(--tably-border);
		margin-right: -1px;
		pointer-events: none;
		position: relative;
		z-index: 4;
	}

	.tably-table::after {
		content: '';
		grid-area: statusbar;
		justify-self: end;
		align-self: stretch;
		width: var(--scrollbar, 0px);
		background-color: var(--tably-statusbar);
		border-right: 1px solid var(--tably-border);
		margin-right: -1px;
		pointer-events: none;
		position: relative;
		z-index: 4;
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
		overflow: hidden;
		border-collapse: collapse;
		border-spacing: 0;
	}

	.tably-expandable {
		& > td {
			padding: 0;
			border: none;
		}
	}

	.tably-expandable-cell {
		grid-column: 1 / -1;
		display: block;
		min-width: 0;
		width: 100%;
	}

	.tably-expandable-sticky {
		position: sticky;
		left: 0;
		width: var(--viewport-width, 100%);
		min-width: 0;
		display: block;
		background-color: var(--tably-bg);
		z-index: 1;
	}

	.tably-expandable-clip {
		overflow: hidden;
		width: 100%;
		background-color: var(--tably-bg);
		border-bottom: 1px solid var(--tably-border-grid);
	}

	.tably-expandable-content {
		overflow: auto;
		width: 100%;
		background-color: var(--tably-bg);
		box-sizing: border-box;
		min-width: 0;
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
		background-color: transparent;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
	}

	.__fixed > * {
		background-color: transparent;
	}

	thead {
		position: relative;
	}

	tbody::before,
	tbody::after {
		content: '';
		display: block;
		flex: 0 0 auto;
	}

	tbody::before {
		height: var(--t);
	}
	tbody::after {
		height: var(--b);
	}

	.tably-row:global(:is(a)) {
		color: inherit;
		text-decoration: inherit;
	}

	.tably-backdrop {
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

	.tably-sticky {
		position: sticky;
		/* right: 100px; */
		z-index: 1;
	}

	.tably-sticky.tably-border {
		border-right: 1px solid var(--tably-border);
	}

	.tably-headers > tr > .tably-column {
		overflow: hidden;
		padding: var(--tably-padding-y) 0;
		cursor: default;
		user-select: none;

		&:last-child {
			border-right: none;
		}

		&.tably-sortable {
			cursor: pointer;
		}

		&.tably-resizeable {
			resize: horizontal;
		}
	}

	.tably-table {
		display: grid;
		width: 100%;
		min-width: 0;
		min-height: 0;
		height: 100%;
		max-height: 100%;
		position: relative;

		color: var(--tably-color);
		background-color: var(--tably-bg);

		grid-template-areas:
			'headers    panel'
			'rows       panel'
			'statusbar  panel';

		grid-template-columns: 1fr min-content;
		grid-template-rows: auto minmax(0, 1fr) auto;

		border: 1px solid var(--tably-border);
		border-radius: var(--tably-radius);
	}

	.tably-headers {
		display: flex;
		grid-area: headers;
		z-index: 2;
		overflow: hidden;
		min-width: 0;
		padding-right: var(--scrollbar, 0px);
		border-bottom: 1px solid var(--tably-border);
	}

	.tably-headers > tr > .tably-column {
		width: auto !important;
	}
	.tably-headers > tr > .tably-column:not(:first-child) {
		border-left: 1px solid var(--tably-border-grid);
	}

	.tably-headers > tr > .context-col {
		border-left: 1px solid var(--tably-border);
		background-color: var(--tably-bg);
	}

	.tably-content {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;

		grid-area: rows;
		scrollbar-width: thin;
		overflow-x: auto;
		overflow-y: scroll;
	}

	.tably-content > tr.tably-row,
	.tably-content > tr.tably-expandable {
		flex: 0 0 auto;
	}

	.tably-content > tr.tably-filler {
		flex: 1 0 0px;
		min-height: 0;
	}

	.tably-statusbar {
		display: flex;
		grid-area: statusbar;
		overflow: hidden;
		background-color: var(--tably-statusbar);
		min-width: 0;
		padding-right: var(--scrollbar, 0px);
	}

	.tably-statusbar > tr > .tably-column {
		border-top: 1px solid var(--tably-border);
		padding: calc(var(--tably-padding-y) / 2) 0;
	}
	.tably-statusbar > tr > .context-col {
		border-top: 1px solid var(--tably-border);
		border-left: 1px solid var(--tably-border);
	}

	.tably-statusbar > tr > .context-col {
		background-color: var(--tably-statusbar);
	}

	.tably-headers > tr,
	.tably-row,
	.tably-expandable,
	.tably-filler,
	.tably-statusbar > tr {
		display: grid;
		width: 100%;
		min-width: max-content;

		& > .tably-column {
			display: flex;
			overflow: hidden;

			&:not(.tably-pad),
			&.tably-pad > :global(*:first-child) {
				padding-left: var(--tably-padding-x);
			}
		}

		& > *:last-child:not(.context-col) {
			width: 100%;

			&:not(.tably-pad),
			&.tably-pad > :global(*:first-child) {
				padding-right: var(--tably-padding-x);
			}
		}
	}

	.tably-row > .tably-column {
		background-color: var(--tably-bg);
		&:not(.tably-pad),
		&.tably-pad > :global(*:first-child) {
			padding-top: var(--tably-padding-y);
			padding-bottom: var(--tably-padding-y);
		}
	}

	.tably-row > .context-col {
		background-color: var(--tably-bg);
	}

	.tably-row > .context-col.tably-hidden {
		background-color: transparent;
	}

	:global(#runic-drag .tably-row) {
		border: 1px solid var(--tably-border-grid);
		border-top: 2px solid var(--tably-border-grid);
	}

	.tably-headers > tr > .tably-column:not(:first-child),
	.tably-row > .tably-column:not(:first-child),
	.tably-filler > .tably-column:not(:first-child),
	.tably-statusbar > tr > .tably-column:not(:first-child) {
		border-left: 1px solid var(--tably-border-grid);
	}

	.tably-row,
	.tably-filler {
		border-bottom: 1px solid var(--tably-border-grid);
	}

	.tably-filler {
		pointer-events: none;
		user-select: none;
		background: none;
	}

	.tably-sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.tably-panel {
		position: relative;
		grid-area: panel;
		height: 100%;
		overflow: hidden;
		border-left: 1px solid var(--tably-border);

		z-index: 4;

		> .tably-panel-content {
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
