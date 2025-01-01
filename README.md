# Svelte Tably

Via the amazing capabilities braught to us by Svelte 5 — a performant, dynamic, flexible, feature rich table. It's as simple, or as flexible as you need it to be.

Simple example on [Svelte 5 Playground](https://svelte.dev/playground/f79124e8473546d29433a95a68440d6d?version=5.16.0)
<br>
Fledged out example on [Svelte 5 Playground](https://svelte.dev/playground/a16d71c97445455e80a55b77ec1cf915?version=5)

- [x] Columns
    - [x] Sticky
    - [x] Show/hide
    - [x] Re-order
    - [x] Resize
- [x] Data manipulation
    - [x] "Virtual" data
    - [x] Sorting
    - [x] Select
    - [x] Filtering
    - [x] Reorderable
- [x] Statusbar
- [x] Panels
- [x] Row context
- [x] Expandable rows
- [x] Virtual rendering
- [x] To CSV
- [x] Auto: Create columns based on data

On top of that, the library API is extensive, so the table can meet your needs.

## Usage Notes

`bun add -D svelte-tably`

```html
<script lang='ts'>
    import Table from 'svelte-tably'

    const data = $state([
        { name: 'Giraffe', age: 26, email: 'giraffe@example.com' },
        { name: 'Shiboo', age: 21, email: 'shiboo@example.com' }
    ])

    let activePanel = $state('columns') as string | undefined
    let selected = $state([]) as typeof data
</script>

<!-- Auto: Generate Columns based on data properties -->
<Table auto {data} resizeable={false} filters={[...]} />

<Table {data} panel={activePanel} select bind:selected>
    {#snippet content({ Column, Panel, Expandable, Row, state, table })}
        <Column id='name' sticky sort value={r => r.name} filter={v => v.includes('Giraffe')}>
            {#snippet header(ctx)}
                Name
            {/snippet}
            {#snippet row(row, ctx)}
                {row.name}
            {/snippet}
            {#snippet statusbar(ctx)}
                {table.data.length}
            {/snippet}
        </Column>
        
        <!-- Simplified -->
        <Column id='age' header='Age' value={r => r.age} sort={(a,b) => a - b} />

        <Expandable click={false}>
            {#snippet content(item, ctx)}
                ...
            {/snippet}
        </Expandable>

        <Row onclick={...} oncontextmenu={...}>
            {#snippet contextHeader()}
                <button ...> <Icon icon='add' /> </button>
            {/snippet}
            {#snippet context(item, ctx)}
                <button ...> <Icon icon='menu' /> </button>
            {/snippet}
        </Row>

        <Panel id='columns'>
            <!-- Anything you might like -->
        </Panel>
        <Panel ... backdrop={false}>
            ...
        </Panel>
    {/snippet}
</Table>
```

### Styling

For quick styling

| CSS Variable | Description | Default |
| - | - | - |
| --tably-bg | Background color | `hsl(0, 0%, 100%)` |
| --tably-color | Text color | `hsl(0, 0%, 0%)` |
| --tably-border | Border for sticky columns and header | `hsl(0, 0%, 90%)` |
| --tably-border-grid | Border for the table-grid | `hsl(0, 0%, 98%)` |
| --tably-statusbar | background-color for the statusbar | `hsl(0, 0%, 98%)` |
| --tably-padding-y | Padding above/below each column | `.5rem` |
| --tably-padding-x | Padding left of each column | `1rem` |
| --tably-radius | Table radius | `.25rem` |

> [!TIP]  
> For the CSS variables, apply them to `:global(:root) { ... }`

> [!NOTE]  
> Advanced styling can be done via `:global(.svelte-tably)`  
> `table > thead > tr > th, table > tbody > tr > td, table > tfoot > tr > td`

<br>
<br>

## Components

All components except Table are meant to be children of the `Table` component.

However, you can safely create a `Component.svelte` and use these components,
and then provide `<Component/>` as a child to `<Table>`. 

```ts
import Table from 'svelte-tably'
```

### Table

The table component.

```html
<Table auto {data} />

<Table {data} ...>
    {#snippet content?({ Column, Row, Expandable, Panel, table })}
        ...
    {/snippet}
</Table>
```

Where `table` is `TableState<T>` and the rest are typed; `Component<T>`.

| Attribute | Description | Type |
| - | - | - |
| content? | The contents of the table | `Snippet<[ctx: ContentCtx<T>]>?` |
|   |  |  |
| id? | The `#id` for the table | `string` |
| data | An array of objects for the table | `T[]` |
| bind:selected? | The currently selected items | `T[]` |
| bind:panel? | The currently open panel | `string` | 
| filters? | An array of filters applied to the table | `((item: T) => boolean)[]` |
| reorderable? | Whether the rows can be re-ordered (via [runic-reorder](https://github.com/Refzlund/runic-reorder)) | `boolean` |
| resizeable? | Whether or not the columns can be resized | `boolean` |
| select? | Whether ot not the rows items can be selected | `boolean \| SelectOptions<T>` |
| auto? | Create missing columns automatically? | `boolean` |

#### SelectOptions

| Properties | Description | Type |
| - | - | - |
| show? | When to show the row-select when not selected | `'hover' \| 'always' \| 'never'` |
| headerSnippet? | Custom snippet for the header select-input | `Snippet<[context: HeaderSelectCtx]>` |
| rowSnippet? | Custom snippet for the row select-input | `Snippet<[context: RowSelectCtx<T>]>` |

<br>

### Column

```ts
import { Column } from 'svelte-tably'
```

This component designates a column where options like sorting, filtering etc. are provided.

```html
<Column id='...' header='...' value={row => row.value} />

<Column id='...' ...>
    {#snippet header?(ctx: HeaderCtx<T>)}
        ...
    {/snippet}
    {#snippet row?(item: T, ctx: RowColumnCtx<T>)}
        ...
    {/snippet}
    {#snippet statusbar?(ctx: StatusbarCtx<T>)}
        ...
    {/snippet}
</Column>
```

| Attribute | Description | Type |
| - | - | - |
| header? | The header element/contents | `string \| Snippet<[ctx: HeaderCtx<T>]>` |
| row? | The row element. If not provided, `value: V` will be used. | `Snippet<[item: T, ctx: RowColumnCtx<T, V>]>` |
| statusbar? | The statusbar element | `Snippet<[ctx: StatusbarCtx<T>]>` |
|   |  |  |
| sticky? | Should be sticky by default | `boolean` |
| show? | Should be visible by default | `boolean` |
| sortby? | Should sort by this by default | `boolean` |
| width? | Default width | `number` |
| value? | The value this column contains | `(item: T) => V` |
| sort? | A boolean (`localeCompare`) or sorting function | `boolean \| ((a: V, b: V) => number)` |
| resizeable? | Whether this column is resizeable | `boolean` |
| filter? | A filter for this columns value | `(item: V) => boolean` |
| style? | Styling the `td` (row-column) element | `string` |
| pad? | Apply padding to the child-element of `td`/`th` instead of the column element itself | `'row' \| 'header' \| 'both'` |
| onclick? | When the column is clicked | `(event: MouseEvent, ctx: RowColumnCtx<T, V>) => void` |

<br>

### Row

```ts
import { Row } from 'svelte-tably'
```

This component can add a context-menu on the side of each row, as well as provide event handlers to the row element.

```html
<Row ... />

<Row ...>
    {#snippet context?(item: T, ctx: RowCtx<T>)}
        ...
    {/snippet}
    {#snippet contextHeader?()}
        ...
    {/snippet}
</Row>
```

| Attribute | Description | Type |
| - | - | - |
| context? | A sticky column on the right for each row | `Snippet<[item: T, ctx: RowCtx<T>]>` |
| contextHeader? | A sticky column on the right for the header | `Snippet<[item: T, ctx: RowCtx<T>]>` |
|   |  |  |
| contextOptions? | Options for the Context-column | `ContextOptions<T>` |
| onclick? | When row is clicked | `(event: MouseEvent, ctx: RowCtx<T>) => void` |
| oncontextmenu? | When row is right-clicked | `(event: MouseEvent, ctx: RowCtx<T>) => void` |

#### ContextOptions

| Properties | Description | Type |
| - | - | - |
| hover? | Only show when hovering? | `boolean` |
| width? | The width for the context-column | `string` |

<br>

### Expandable

```ts
import { Expandable } from 'svelte-tably'
```

This component gives your rows the ability to be expanded.

```html
<Expandable ...>
    {#snippet content(item: T, ctx: RowCtx<T>)}
        ...
    {/snippet}
</Expandable>
```

| Attribute | Description | Type |
| - | - | - |
| content | The contents of the expanded row. | `Snippet<[item: T, ctx: RowCtx<T>]>` |
|   |  |  |
| slide? | Options for sliding the expanding part | `{ duration?: number, easing?: EasingFunction }` |
| click? | Whether you can click on a row to expand/collapse it | `boolean` |
| chevron? | Whether to show the chevron on the left fixed column | `'always' \| 'hover' \| 'never'` |
| multiple? | Can multiple rows be open at the same time? | `boolean` |

<br>

### Panel

```ts
import { Panel } from 'svelte-tably'
```

This component creates a panel that can be opened on the side of the table.

```html
<Panel id='...' ...>
    {#snippet children(ctx: PanelCtx<T>)}
        ...
    {/snippet}
</Panel>
```

| Attribute | Description | Type |
| - | - | - |
| children | The contents of the panel | `Snippet<[ctx: PanelCtx<T>]>` |
|   |  |  |
| id | The id for the panel that determines whether it's open or closed, from the Table attribute | `string` |
| backdrop? | Whether there should be a backdrop or not | `boolean` |