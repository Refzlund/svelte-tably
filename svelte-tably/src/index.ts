import Table from './table/Table.svelte'
import type { TableState, TableProps } from './table/table-state.svelte.js'
import type { ContentCtx as TableContentCtx, ContentSnippet as TableContentSnippet } from './table/Table.svelte'

namespace Table {
	export type State<T = unknown> = TableState<T>
	export type Props<T = unknown> = TableProps<T>
	export type ContentCtx<T = unknown> = TableContentCtx<T>
	export type ContentSnippet<T = unknown> = TableContentSnippet<T>
}

export default Table

export { default as Panel } from './panel/Panel.svelte'
export { default as Column } from './column/Column.svelte'
export { default as Row } from './row/Row.svelte'
export { default as Expandable } from './expandable/Expandable.svelte'

export type { TableState, TableProps } from './table/table-state.svelte.js'
export type { ContentCtx, ContentSnippet } from './table/Table.svelte'
export type { RowState, RowProps } from './row/row-state.svelte.js'
export type { ColumnState, ColumnProps } from './column/column-state.svelte.js'
export type { ExpandableState, ExpandableProps } from './expandable/expandable-state.svelte.js'
export type { PanelState, PanelProps } from './panel/panel-state.svelte.js'