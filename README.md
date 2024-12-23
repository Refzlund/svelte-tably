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
- [x] sorting
- [x] select
- [-] filtering
- [ ] orderable table
- [ ] row context-menu
- [ ] dropout section
- [ ] csv export

### Usage Notes

```html
<script lang='ts'>
    import Table from 'svelte-tably'

    const data = $state([
        { name: 'John Doe', age: 30, email: 'johndoe@example.com' },
        { name: 'Jane Doe', age: 25, email: 'janedoe@example.com' },
    ])

    let activePanel = $state('columns') as string | undefined
	let selected = $state([]) as typeof data
</script>

<Table {data} panel={activePanel} select bind:selected>
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
        <Panel ... backdrop={false}>
            ...
        </Panel>
    {/snippet}
</Table>
```

#### Styling

For quick styling

| CSS Variable | Description | Default |
| - | - | - |
| --tably-bg | background-color | `hsl(0, 0%, 100%)` |
| --tably-color | color | `hsl(0, 0%, 0%)` |
| --tably-border | border | `hsl(0, 0%, 90%)` |
| --tably-statusbar | background-color for the statusbar | `hsl(0, 0%, 98%)` |
| --tably-padding-y | Padding above/below each column | `.5rem` |
| --tably-padding-x | Padding left of each column | `1rem` |
| --tably-radius | Table radius | `.25rem` |

Advanced styling can be done via `:global .svelte-tably`


