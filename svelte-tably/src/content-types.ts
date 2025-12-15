import type { Snippet } from 'svelte'
import type { ColumnProps, RowColumnCtx, HeaderCtx, StatusbarCtx } from './column/column-state.svelte.js'
import type { PanelProps, PanelCtx } from './panel/panel-state.svelte.js'
import type { ExpandableProps } from './expandable/expandable-state.svelte.js'
import type { RowProps } from './row/row-state.svelte.js'
import type { TableState, RowCtx } from './table/table-state.svelte.js'

/**
 * Callable signature for Column component within the content snippet.
 * The generic `T` is fixed to the table's item type, `V` is the column's value type.
 */
export interface ColumnComponent<T> {
	<V>(internal: unknown, props: ColumnProps<T, V>): void
}

/**
 * Callable signature for Panel component within the content snippet.
 */
export interface PanelComponent<T> {
	(internal: unknown, props: PanelProps<T>): void
}

/**
 * Callable signature for Expandable component within the content snippet.
 */
export interface ExpandableComponent<T> {
	(internal: unknown, props: ExpandableProps<T>): void
}

/**
 * Callable signature for Row component within the content snippet.
 */
export interface RowComponent<T> {
	(internal: unknown, props: RowProps<T>): void
}

/**
 * Context object passed to the `content` snippet of a Table component.
 * Contains typed component references that inherit the table's generic type.
 */
export type ContentCtx<Item = any> = {
	/** Column component - use to define table columns */
	readonly Column: ColumnComponent<Item>
	/** Panel component - use to define side panels */
	readonly Panel: PanelComponent<Item>
	/** Expandable component - use to define expandable row content */
	readonly Expandable: ExpandableComponent<Item>
	/** Row component - use to configure row behavior and context menus */
	readonly Row: RowComponent<Item>
	/** The table state instance */
	readonly table: TableState<Item>
}

/**
 * Snippet type for the `content` prop of a Table component.
 */
export type ContentSnippet<Item = any> = Snippet<[context: ContentCtx<Item>]>

// Re-export related types for convenience
export type {
	ColumnProps,
	RowColumnCtx,
	HeaderCtx,
	StatusbarCtx,
	PanelProps,
	PanelCtx,
	ExpandableProps,
	RowProps,
	TableState,
	RowCtx
}
