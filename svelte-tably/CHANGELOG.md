# svelte-tably

## 1.5.1

### Patch Changes

- fix: reactivity issues in _very_ rare cases ([#30](https://github.com/Refzlund/svelte-tably/pull/30))

## 1.5.0

### Minor Changes

- feat(styling): add class prop support to Table, Row, Column and contextOptions ([#28](https://github.com/Refzlund/svelte-tably/pull/28))

### Patch Changes

- fix(types): fix generic type inference for content snippet components ([#28](https://github.com/Refzlund/svelte-tably/pull/28))

- refactor(css): prefix internal css classes with tably- to avoid conflicts ([#28](https://github.com/Refzlund/svelte-tably/pull/28))

## 1.4.0

### Minor Changes

- Add `class` prop support to `<Table>`, `<Row>`, `<Column>`, and `contextOptions` ([#26](https://github.com/Refzlund/svelte-tably/pull/26))

  - `<Table class="...">` - Applies class to the root `<table>` element
  - `<Row class="...">` - Applies class to each `<tr class="row">` element
  - `<Row contextOptions={{ class: '...' }}>` - Applies class to context column elements (`<td>` / `<th>`)
  - `<Column class="...">` - Already supported, now documented alongside the new props

### Patch Changes

- Fix TypeScript generic type inference for exported component types ([#26](https://github.com/Refzlund/svelte-tably/pull/26))

  The `ContentCtx` and `ContentSnippet` types now correctly propagate generic parameters in published package builds. Previously, `Column`, `Panel`, `Expandable`, and `Row` components in the content snippet context resolved to `any` due to `typeof Component<T>` patterns not working with svelte-package's generated `$$IsomorphicComponent` interface pattern.

  This fix introduces explicit component type interfaces (`ColumnComponent<T>`, `PanelComponent<T>`, `ExpandableComponent<T>`, `RowComponent<T>`) that properly propagate generics through the type system.

## 1.3.1

### Patch Changes

- fix(package): default export causes pre-mature consumption ([`83dadbe`](https://github.com/Refzlund/svelte-tably/commit/83dadbe549083fece88cca337b04e8a45cd51a72))

## 1.3.0

### Minor Changes

- feat(row): add alignHeaderToRows option ([#23](https://github.com/Refzlund/svelte-tably/pull/23))

### Patch Changes

- fix(table): harden localStorage persistence ([#23](https://github.com/Refzlund/svelte-tably/pull/23))

## 1.2.0

### Minor Changes

- feat(table): export content snippet type, allow primitive row data, and support statusbar padding ([#21](https://github.com/Refzlund/svelte-tably/pull/21))

### Patch Changes

- fix(table): improve virtualization stability, context column rendering, and header gutter masking ([#21](https://github.com/Refzlund/svelte-tably/pull/21))

## 1.1.2

### Patch Changes

- fix: prevent scroll errors on undefined elements ([#17](https://github.com/Refzlund/svelte-tably/pull/17))

## 1.1.1

### Patch Changes

- fix: saved tables do not preserve column order ([#15](https://github.com/Refzlund/svelte-tably/pull/15))

## 1.1.0

### Minor Changes

- feat: export csv via table-state; `table.toCSV` ([#13](https://github.com/Refzlund/svelte-tably/pull/13))

- feat: `toCSV` can now accept `columns` and `filters`

- feat: allowwed bind:table to bind table-state

- feat: added `Table.State` type

- feat: save table settings to localstorage ([#10](https://github.com/Refzlund/svelte-tably/pull/10))

### Patch Changes

- fix: assigning to undefined when scrolling ([#12](https://github.com/Refzlund/svelte-tably/pull/12))

- fix: sticky headers unstick on long columns ([#14](https://github.com/Refzlund/svelte-tably/pull/14))

## 1.0.1

### Patch Changes

- fix: broken types due to svelte-package bug ([#2](https://github.com/Refzlund/svelte-tably/pull/2))
