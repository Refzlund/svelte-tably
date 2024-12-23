<!-- @component

	This is a description, \
	on how to use this.

@example
<Component />

-->

<script module lang="ts">
	export interface TableState<
		T extends Record<PropertyKey, any> = Record<PropertyKey, any>
	> {
		columns: Record<string, ColumnState<T>>
		panels: Record<string, TPanel<T>>
		selected: T[] | null
		sortby?: string
		sortReverse: boolean
		positions: {
			sticky: string[]
			scroll: string[]
			hidden: string[]
			toggle(key: string): void
		}
		readonly resizeable: boolean
		readonly data: T[]
		/** Rows become anchors */
		readonly href?: (item: T) => string
		addColumn(key: string, options: ColumnState<T>): void
		removeColumn(key: string): void
	}

	export function getTableState<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>() {
		return getContext<TableState<T>>('svelte5-table')
	}

	export type HeaderSelectCtx<T = any> = {
		isSelected: boolean
		/** The list of selected items */
		readonly selected: T[]
		/**
		 * See [MDN :indeterminate](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate)
		 */
		readonly indeterminate: boolean
	}

	export type RowSelectCtx<T = any> = {
		readonly item: T
		readonly row: RowCtx<unknown>
		data: T[]
		isSelected: boolean
	}
</script>

<script lang="ts">
	import { getContext, onMount, setContext, tick, untrack, type Snippet } from 'svelte'
	import Column, { type ColumnProps, type RowCtx, type ColumnState } from './Column.svelte'
	import Panel, { PanelTween, type Panel as TPanel } from './Panel.svelte'
	import { fly } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'
	import { on } from 'svelte/events'

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

	interface Props {
		content: Snippet<[context: ContentCtx<T>]>

		panel?: string
		data?: T[]
		id?: string
		href?: (item: T) => string
		/**
		 * Can you change the width of the columns?
		 * @default true
		 */
		resizeable?: boolean

		selected?: T[]
		select?:
			| boolean
			| {
					/**
					 * The style, in which the selection is shown
					 *
					 * NOTE: If using `edge` | 'side', "show" will always be `hover`. This is due to
					 * an inconsistency/limitation of matching the scroll between the selection div and the rows.
					 *
					 * @default 'column'
					 */
					style?: 'column'
					/**
					 * When to show the row-select, when not selected?
					 * @default 'hover'
					 */
					show?: 'hover' | 'always' | 'never'
					/**
					 * Custom snippet
					 */
					headerSnippet?: Snippet<[context: HeaderSelectCtx]>
					rowSnippet?: Snippet<[context: RowSelectCtx<T>]>
			  }
		// | {
		// 	/**
		// 	 * The style, in which the selection is shown
		// 	 *
		// 	 * NOTE: If using `edge` | 'side', "show" will always be `hover`. This is due to
		// 	 * an inconsistency/limitation of matching the scroll between the selection div and the rows.
		// 	 *
		// 	 * @default 'column'
		// 	*/
		// 	style?: 'edge' | 'side'
		// 	/**
		// 	 * When to show the row-select, when not selected?
		// 	 * @default 'hover'
		// 	*/
		// 	show?: 'hover'
		// 	/**
		// 	 * Custom snippet
		// 	*/
		// 	snippet?: Snippet<[context: { item: T, data: T[], selected: boolean }]>
		// }

		/*
		ordered?: {
			style?: 'column' | 'side' // combine with select if both use 'column'
			show?: 'hover' | 'always'
			// snippet?: Snippet<[context: { item: T, data: T[], selected: boolean }]>
		}
		*/
	}

	let {
		content,
		selected = $bindable([]),
		panel = $bindable(),
		data: _data = [],
		id = Array.from({ length: 12 }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join(''),
		href,
		resizeable = true,
		select
	}: Props = $props()

	let mounted = $state(false)
	onMount(() => (mounted = true))

	const data = $derived([..._data])

	const elements = $state({}) as Record<
		'headers' | 'statusbar' | 'rows' | 'virtualTop' | 'virtualBottom' | 'selects',
		HTMLElement
	>

	let cols: TableState<T>['columns'] = $state({})
	let positions: TableState<T>['positions'] = $state({
		fixed: [],
		sticky: [],
		scroll: [],
		hidden: [],
		toggle(key) {
			if (table.positions.hidden.includes(key))
				table.positions.hidden = table.positions.hidden.filter((column) => column !== key)
			else table.positions.hidden.push(key)
		}
	})

	const table: TableState<T> = $state({
		columns: cols,
		selected,
		panels: {},
		positions,
		sortReverse: false,
		get href() {
			return href
		},
		get data() {
			return data
		},
		get resizeable() {
			return resizeable
		},
		addColumn(key, column) {
			table.columns[key] = column

			if (column.defaults.sort) sortBy(key)

			if (column.fixed) {
				// @ts-expect-error
				table.positions.fixed.push(key)
				return
			}

			if (!column.defaults.show) table.positions.hidden.push(key)

			if (column.defaults.sticky) table.positions.sticky.push(key)
			else table.positions.scroll.push(key)
		},
		removeColumn(key) {
			delete table.columns[key]
			// @ts-expect-error fixed is not typed
			table.positions.fixed = table.positions.fixed.filter((column) => column !== key)
			table.positions.sticky = table.positions.sticky.filter((column) => column !== key)
			table.positions.scroll = table.positions.scroll.filter((column) => column !== key)
			table.positions.hidden = table.positions.hidden.filter((column) => column !== key)
		}
	})

	setContext('svelte5-table', table)

	// * --- *

	// * --- Virtualization --- *
	// #region Virtualization
	let scrollTop = $state(0)
	let viewportHeight = $state(0)

	let heightPerItem = $state(8)

	const spacing = () => viewportHeight / 2

	let virtualTop = $derived.by(() => {
		let result = Math.max(scrollTop - spacing(), 0)
		result -= result % heightPerItem
		return result
	})
	let virtualBottom = $derived.by(() => {
		let result = heightPerItem * data.length - virtualTop - spacing() * 4
		result = Math.max(result, 0)
		return result
	})

	let renderItemLength = $derived(Math.ceil(Math.max(30, (viewportHeight / heightPerItem) * 2)))

	/** The area of data being rendered */
	let area = $derived.by(() => {
		table.sortReverse
		table.sortby
		const index = virtualTop / heightPerItem || 0
		const end = index + renderItemLength
		const result = data.slice(index, end)
		return result
	})

	function calculateHeightPerItem() {
		if (!elements.rows) {
			heightPerItem = 8
			return
		}
		tick().then(() => {
			const firstRow = elements.rows.children[0].getBoundingClientRect().top
			const lastRow =
				elements.rows.children[elements.rows.children.length - 1].getBoundingClientRect().bottom
			heightPerItem = (lastRow - firstRow) / area.length
		})
	}

	$effect(() => {
		data
		untrack(calculateHeightPerItem)
	})
	// #endregion
	// * --- Virtualization --- *

	

	function sortBy(column: string) {
		const { sorting, value } = table.columns[column]!.options
		if(!sorting || !value) return

		if (table.sortby === column) {
			table.sortReverse = !table.sortReverse
		}
		else {
			table.sortReverse = false
			table.sortby = column
		}
	}
	function sortAction(node: HTMLElement, column: string) {
		$effect(() => on(node, 'click', () => sortBy(column)))
	}

	function sortTable() {
		if (!table.sortby) return
		const column = table.columns[table.sortby]
		let { sorting, value } = column.options
		if(!sorting || !value) return
		if(sorting === true) {
			sorting = (a, b) => String(a).localeCompare(String(b))
		}
		if(table.sortReverse) {
			data.sort((a, b) => sorting(value(b), value(a)))
		} else {
			data.sort((a, b) => sorting(value(a), value(b)))
		}
	}

	$effect.pre(() => {
		data
		table.sortby
		table.sortReverse
		untrack(sortTable)
	})

	const panelTween = new PanelTween(() => panel, 24)

	let hoveredRow: T | null = $state(null)

	/** Order of columns */
	const fixed = $derived(
		// @ts-expect-error
		positions.fixed
	) as string[]
	const hidden = $derived(positions.hidden)
	const notHidden = (key: string) => !positions.hidden.includes(key)
	const sticky = $derived(positions.sticky.filter(notHidden))
	const scrolled = $derived(positions.scroll.filter(notHidden))
	const columns = $derived([...fixed, ...sticky, ...scrolled])

	/** Width of each column */
	const columnWidths = $state({}) as Record<string, number>

	const getWidth = (key: string, def: number = 150) =>
		columnWidths[key] || table.columns[key]?.defaults.width || def

	/** grid-template-columns for widths */
	const style = $derived.by(() => {
		if (!mounted) return ''
		const templateColumns = `
	#${id} > .headers,
	#${id} > tbody > .row,
	#${id} > tfoot > tr,
	#${id} > .content > .virtual.bottom {
		grid-template-columns: ${columns
			.map((key, i, arr) => {
				const width = getWidth(key)
				if (i === arr.length - 1) return `minmax(${width}px, 1fr)`
				return `${width}px`
			})
			.join(' ')};
	}
		`

		let sum = 0
		const stickyLeft = [...fixed, ...sticky]
			.map((key, i, arr) => {
				sum += getWidth(arr[i - 1], i === 0 ? 0 : undefined)
				return `
		#${id} .column.sticky[data-column='${key}'] {
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

		const observer = new MutationObserver(() => {
			columnWidths[key] = parseFloat(node.style.width)
		})

		observer.observe(node, { attributes: true })
		return { destroy: () => observer.disconnect() }
	}

	async function onscroll() {
		const target = elements.rows
		if (target.scrollTop !== scrollTop) {
			scrollTop = target?.scrollTop ?? scrollTop
		}

		if (elements.selects) {
			elements.selects.scrollTop = target?.scrollTop
		}

		if (!elements.headers) return
		elements.headers.scrollLeft = target.scrollLeft
		elements.statusbar.scrollLeft = target.scrollLeft
	}

	export { selected, positions, data, href, cols as columns }
</script>

<!---------------------------------------------------->

<svelte:head>
	{@html `<style>${style}</style>`}
</svelte:head>

{#snippet chevronSnippet(reversed: boolean)}
	<svg
		class='sorting-icon'
		class:reversed
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		style='margin: auto; margin-right: var(--tably-padding-x, 1rem);'
	>
		<path
			fill="currentColor"
			d="M3.2 5.74a.75.75 0 0 1 1.06-.04L8 9.227L11.74 5.7a.75.75 0 1 1 1.02 1.1l-4.25 4a.75.75 0 0 1-1.02 0l-4.25-4a.75.75 0 0 1-.04-1.06"
		/>
	</svg>
{/snippet}

{#snippet columnsSnippet(
	renderable: (column: string) => Snippet<[arg0?: any, arg1?: any]> | undefined,
	arg: null | ((column: string) => any[]) = null,
	isHeader = false
)}
	{#each fixed as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && table.columns[column]!.options.sorting}
			{@const sortClick = isHeader ? sortAction : ()=>{}}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column sticky fixed"
				data-column={column}
				class:header={isHeader}
				class:sortable={sortable}
				use:sortClick={column}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.sortby === column && sortable}
					{@render chevronSnippet(table.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
	{#each sticky as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && table.columns[column]!.options.sorting}
			{@const sortClick = isHeader ? sortAction : ()=>{}}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column sticky"
				use:observeColumnWidth={isHeader}
				data-column={column}
				class:header={isHeader}
				class:resizeable={isHeader && table.columns[column].options.resizeable && table.resizeable}
				class:border={i == sticky.length - 1}
				class:sortable={sortable}
				use:sortClick={column}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.sortby === column && sortable}
					{@render chevronSnippet(table.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
	{#each scrolled as column, i (column)}
		{#if !hidden.includes(column)}
			{@const args = arg ? arg(column) : []}
			{@const sortable = isHeader && table.columns[column]!.options.sorting}
			{@const sortClick = isHeader ? sortAction : ()=>{}}
			<svelte:element
				this={isHeader ? 'th' : 'td'}
				class="column"
				data-column={column}
				use:observeColumnWidth={isHeader}
				class:resizeable={isHeader && table.columns[column].options.resizeable && table.resizeable}
				class:sortable={sortable}
				use:sortClick={column}
			>
				{@render renderable(column)?.(args[0], args[1])}
				{#if isHeader && table.sortby === column && sortable}
					{@render chevronSnippet(table.sortReverse)}
				{/if}
			</svelte:element>
		{/if}
	{/each}
{/snippet}

<table
	{id}
	class="table svelte-tably"
	style="--t: {virtualTop}px; --b: {virtualBottom}px;"
	aria-rowcount={data.length}
>
	<thead class="headers" bind:this={elements.headers}>
		{@render columnsSnippet(
			(column) => table.columns[column]?.header,
			() => [true],
			true
		)}
	</thead>

	<tbody class="content" bind:this={elements.rows} onscrollcapture={onscroll} bind:clientHeight={viewportHeight}>
		{#each area as item, i (item)}
			{@const props = table.href ? { href: table.href(item) } : {}}
			{@const index = data.indexOf(item) + 1}
			<svelte:element
				this={table.href ? 'a' : 'tr'}
				class="row"
				class:hover={hoveredRow === item}
				class:selected={table.selected?.includes(item)}
				class:first={i === 0}
				class:last={i === area.length - 1}
				{...props}
				aria-rowindex={index}
				onpointerenter={() => (hoveredRow = item)}
				onpointerleave={() => (hoveredRow = null)}
			>
				{@render columnsSnippet(
					(column) => table.columns[column]!.row,
					(column) => {
						const col = table.columns[column]!
						return [
							item,
							{
								get index() {
									return index - 1
								},
								get value() {
									return col.options.value ? col.options.value(item) : undefined
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
								}
							}
						]
					}
				)}
			</svelte:element>
		{/each}
	</tbody>

	<tfoot class="statusbar" bind:this={elements.statusbar}>
		<tr>
			{@render columnsSnippet((column) => table.columns[column]?.statusbar)}
		</tr>
	</tfoot>

	<caption
		class="panel"
		style="width: {panelTween.current}px;"
		style:overflow={panelTween.transitioning ? 'hidden' : 'auto'}
	>
		{#if panel && panel in table.panels}
			<div
				class="panel-content"
				bind:clientWidth={panelTween.width}
				in:fly={{ x: 100, easing: sineInOut, duration: 300 }}
				out:fly={{ x: 100, duration: 200, easing: sineInOut }}
			>
				{@render table.panels[panel].content({
					get table() {
						return table
					},
					get data() {
						return data
					}
				})}
			</div>
		{/if}
	</caption>
	<caption class="backdrop" aria-hidden={panel && table.panels[panel]?.backdrop ? false : true}>
		<button aria-label="Panel backdrop" tabindex="-1" onclick={() => (panel = undefined)}></button>
	</caption>
</table>

{#snippet headerSelected(ctx: HeaderSelectCtx<T>)}
	<input type="checkbox" indeterminate={ctx.indeterminate} bind:checked={ctx.isSelected} />
{/snippet}

{#snippet rowSelected(ctx: RowSelectCtx<T>)}
	<input type="checkbox" bind:checked={ctx.isSelected} />
{/snippet}

{#if select}
	{@const {
		show = 'hover',
		style = 'column',
		rowSnippet = rowSelected,
		headerSnippet = headerSelected
	} = typeof select === 'boolean' ? {} : select}
	{#if show !== 'never'}
		<Column id="__fixed" {table} fixed width={56} resizeable={false}>
			{#snippet header()}
				<div class="__fixed">
					{@render headerSnippet({
						get isSelected() {
							return table.data.length === table.selected?.length
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
							return (table.selected?.length || 0) > 0 && table.data.length !== table.selected?.length
						}
					})}
				</div>
			{/snippet}
			{#snippet row(item, row)}
				<div class="__fixed">
					{#if row.selected || show === 'always' || (row.isHovered && show === 'hover')}
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
		return data
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

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.sorting-icon {
		transition: transform .15s ease;
		transform: rotateZ(0deg);
		&.reversed {
			transform: rotateZ(-180deg);
		}
	}

	.__fixed {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
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

	.row:first-child > * {
		padding-top: calc(var(--tably-padding-y, 0.5rem) + calc(var(--tably-padding-y, 0.5rem) / 2));
	}
	.row:last-child > * {
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
