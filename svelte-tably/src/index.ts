import Table from './table/Table.svelte'
import type { TableInstance, TableProps } from './table/table-state.svelte.js'
import type {
	ContentCtx as TableContentCtx,
	ContentSnippet as TableContentSnippet
} from './table/Table.svelte'

namespace Table {
	export type State<T = unknown> = TableInstance<T>
	export type Props<T = unknown> = TableProps<T>
	export type ContentCtx<T = unknown> = TableContentCtx<T>
	export type ContentSnippet<T = unknown> = TableContentSnippet<T>
}

export default Table

export { default as Panel } from './panel/Panel.svelte'
export { default as Column } from './column/Column.svelte'
export { default as Row } from './row/Row.svelte'
export { default as Expandable } from './expandable/Expandable.svelte'

// State factories (for advanced usage)
export { TableState as TableFactory, getTableContext } from './table/table-state.svelte.js'
export { ColumnState as ColumnFactory } from './column/column-state.svelte.js'
export { PanelState as PanelFactory } from './panel/panel-state.svelte.js'
export { RowState as RowFactory } from './row/row-state.svelte.js'
export { ExpandableState as ExpandableFactory } from './expandable/expandable-state.svelte.js'
export { Data as DataFactory } from './table/data.svelte.js'

// Types - export both old names (for backwards compat) and new names
export type {
	TableInstance,
	TableInstance as TableState, // backwards compat alias
	TableProps
} from './table/table-state.svelte.js'
export type { ContentCtx, ContentSnippet } from './table/Table.svelte'
export type {
	RowInstance,
	RowInstance as RowState, // backwards compat alias
	RowProps
} from './row/row-state.svelte.js'
export type {
	ColumnInstance,
	ColumnInstance as ColumnState, // backwards compat alias
	ColumnProps
} from './column/column-state.svelte.js'
export type {
	ExpandableInstance,
	ExpandableInstance as ExpandableState, // backwards compat alias
	ExpandableProps
} from './expandable/expandable-state.svelte.js'
export type {
	PanelInstance,
	PanelInstance as PanelState, // backwards compat alias
	PanelProps
} from './panel/panel-state.svelte.js'
export type {
	DataInstance,
	DataInstance as DataState, // backwards compat alias
	DataProps
} from './table/data.svelte.js'
