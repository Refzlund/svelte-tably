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

```html
<script lang='ts'>
    import Table from 'svelte-tably'

    const data = $state([
        { name: 'John Doe', age: 30, email: 'johndoe@example.com' },
        { name: 'Jane Doe', age: 25, email: 'janedoe@example.com' },
    ])

	let activePanel = $state('columns') as string | undefined
</script>

<Table {data} panel={activePanel}>
    {#snippet content({ Column, Panel, state, data })}
        <Column id='name' sticky>
		    {#snippet header()}
			    Name
			{/snippet}
		    {#snippet row(row)}
			    {row.name}
			{/snippet}

			<!-- Optional per column. -->
		    {#snippet statusbar()}
			    {data.length}
			{/snippet}
		</Column>
		<Column ...>
		   ...
		</Column>
		<!-- If you want to sort/filter a virtual value, that does not exist in the data -->
		<Column id='virtual' value={row => row.age > 18}>
			...
			{#snippet row(row, virtual)}
			    {virtual ? 'Adult' : 'Adolescent'}
			{/snippet}
			...
		</Column>

		<Panel id='columns'>
			<!-- Anything you might like -->
		</Panel>
    {/snippet}
</Table>
```