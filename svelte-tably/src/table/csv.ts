export interface CSVOptions<T> {
	/**
	 * Semi-colons as separator?
	 * @default false
	 */
	semicolon?: boolean
	/**
	 * Export only selected rows in the visible data
	 * @default false
	 */
	selected?: boolean
	/**
	 * Filters to apply to the data.
	 * - `true` to apply current filters e.g. currently visible content
	 * - `false` to ignore filters, export all data
	 * - Array of functions to filter data manually
	 * @default true
	 */
	filters?: true | false | ((item: T) => boolean)[]
	/**
	 * Columns to export. By default exports all visible columns.
	 * - `true` to export all columns
	 * - `false` to export only visible columns
	 * - Array of column IDs to export specific columns
	 * @default false
	 */
	columns?: true | false | string[]
}