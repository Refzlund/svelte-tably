---
'svelte-tably': minor
---

Add `class` prop support to `<Table>`, `<Row>`, `<Column>`, and `contextOptions`

- `<Table class="...">` - Applies class to the root `<table>` element
- `<Row class="...">` - Applies class to each `<tr class="row">` element
- `<Row contextOptions={{ class: '...' }}>` - Applies class to context column elements (`<td>` / `<th>`)
- `<Column class="...">` - Already supported, now documented alongside the new props
