# svelte-tably

Work in progress. I needed a break from my primary project, so here's a little side-project exploring the amazing capabilities of Svelte 5 with a Dynamic table!

Example on [Svelte 5 Playground](https://svelte.dev/playground/a16d71c97445455e80a55b77ec1cf915?version=5)

A high performant dynamic table

- [x] Sticky columns
- [x] Show/hide columns
- [x] Re-order columns
- [x] Resize columns
- [x] Statusbar
- [x] "Virtual" data (for sorting/filtering)
- [x] Panels
- [x] Virtual elements
- [ ] sorting
- [ ] select
- [ ] filtering
- [ ] orderable table
- [ ] row context-menu
- [ ] dropout section

### Usage Notes

Simple example.

Create a state for your data and a state for your active panel:

```markdown
<script lang='ts'>
  import { Table } from '$lib/index.js'

  const data = $state([
    { name: 'John Doe', age: 30, email: 'johndoe@example.com' },
    { name: 'Jane Doe', age: 25, email: 'janedoe@example.com' },
  ])
</script>

<Table {data}>
  <Table.Name>
    {#snippet header()}
      Name
    {/snippet}
    {#snippet row(item)}
      {item.name}
    {/snippet}
  </Table.Name>
  <Table.Age>
    {#snippet header()}
      Age
    {/snippet}
    {#snippet row(item)}
      {item.age}
    {/snippet}
  </Table.Age>
  <Table.Email>
    {#snippet header()}
      Email
    {/snippet}
    {#snippet row(item)}
      {item.email}
    {/snippet}
  </Table.Email>
</Table>
```

To create a column, simply add a new `<Table.ColumnName>` component inside the `<Table>` component. Replace `ColumnName` with the actual name of the column you want to create.

Inside the column component, you need to define three snippets:

* `header`: the content of the column header
* `row`: the content of each row in the column
* `statusbar`: (optional) the content of the status bar for the column
