# svelte-tably — Architecture

This repository is a Bun workspace containing:

- A publishable Svelte 5 component library: `svelte-tably/`
- A SvelteKit demo/playground app: `app/`

The library provides a highly dynamic, feature-rich table built on Svelte 5 runes ($state/$derived/$effect) with support for:

- Column ordering, hiding/showing, sticky/fixed columns, and resizing
- Sorting + filtering
- Optional row selection and row reorder (via `runic-reorder`)
- Optional expandable rows
- Optional side panel
- Virtualized rendering for large data sets
- CSV export
- Persistence of table settings to `localStorage` when an `id` is provided

## Repository Layout

- `package.json` (root)
  - Bun workspaces: `./app`, `./svelte-tably`
  - Scripts:
    - `bun run app` → runs the demo app (`app/`) dev server
    - `bun run package` → packages the library (`svelte-tably/`)
    - `bun run publish` → packages + `changeset publish`

- `svelte-tably/` (library package)
  - `src/` source code for Svelte components and state modules
  - `build.ts` Bun build script that runs `svelte-package` and generates a publishable `npm/` directory
  - `npm/` generated publish directory (built by `build.ts`)

- `app/` (demo app)
  - SvelteKit app to validate and showcase features and reproduce issues

## Library Public API

The public entrypoint is `svelte-tably/src/index.ts` and exports:

- Default export: `Table` (Svelte component)
- Named component exports:
  - `Column`
  - `Row`
  - `Expandable`
  - `Panel`
- Types:
  - `TableState`, `TableProps`, `ContentCtx`, `ContentSnippet`
  - `ColumnState`, `ColumnProps`
  - `RowState`, `RowProps`
  - `ExpandableState`, `ExpandableProps`
  - `PanelState`, `PanelProps`
- Namespace types under `Table.*`:
  - `Table.State`, `Table.Props`, `Table.ContentCtx`, `Table.ContentSnippet`

## Core Concepts

### 1) Table is the orchestration component

`Table.svelte` constructs a `TableState<T>` instance and exposes it in two ways:

- Context: `setContext('svelte-tably', table)` so children like `Column`, `Row`, `Panel`, `Expandable` can attach to the current table.
- Optional binding: `bind:table` to retrieve the `TableState<T>` instance directly.

The `Table` component is responsible for:

- Maintaining `TableState` and derived column layout
- Rendering header/body/footer grids and sticky positioning
- Wiring behaviors:
  - sorting
  - filtering
  - selection UI
  - row reorder (runic-reorder)
  - expandable rows
  - panel rendering
  - virtualization
- CSV export implementation (the TableState method is assigned to the component export)

### 2) TableState holds the shared state

`table/table-state.svelte.ts` defines:

- `TableProps<T>`: externally provided/bindable table configuration
- `TableState<T>`: the runtime state container

Important properties:

- `dataState: Data<T>`: manages origin/sorted/filtered arrays
- `columns: Record<string, ColumnState>`: registered columns
- `positions`: arrays of columns by category:
  - `fixed`, `sticky`, `scroll`, `hidden`
- `panels: Record<string, PanelState>`
- `row?: RowState` (single row behavior configuration)
- `expandable?: ExpandableState` (single expandable configuration)

Persistence:

- If `TableProps.id` is set, `TableState` loads/saves:
  - column widths
  - column positions
  - sort settings
  into `localStorage` under `svelte-tably:<id>`
- Saves are debounced/scheduled
- Access to `localStorage` is guarded to avoid crashing in restricted/sandbox environments

### 3) Components are “registration components”

`Column.svelte`, `Row.svelte`, `Panel.svelte`, `Expandable.svelte` are minimal wrappers.
They primarily:

- read props
- create the corresponding `*State` instance
- attach to the current `TableState` via context

This keeps the bulk of logic centralized in state modules and the main `Table.svelte` renderer.

### 4) Data pipeline: origin → sorted → filtered → current

`table/data.svelte.ts` implements:

- `origin`: the original data array
- `sorted`: computed by sort configuration
- `filtered`: computed by combining:
  - table-level filters (`TableProps.filters`)
  - column-level filters (`ColumnProps.filter` + `value`)

`current` is `filtered` unless `reorderable` is enabled.

Constraints:

- Reorderable tables mutate the source order and therefore disable sorting + filtering.

### 5) Virtualization

`table/virtualization.svelte.ts` is a viewport-based virtual renderer.
It:

- tracks scroll position + viewport element/height
- measures average row height from rendered rows
- computes virtual top/bottom spacer sizes
- slices `table.dataState.current` to a render window

The actual DOM virtualization is implemented in `Table.svelte` using:

- a scrollable `<tbody>`
- `virtualization.area` to render a slice
- CSS variables `--t` / `--b` + `tbody::before/after` spacers

### 6) Column layout

Columns are rendered as a CSS grid for each row:

- `grid-template-columns` is generated from current column widths plus optional context column
- Sticky positioning is calculated per-column by accumulating widths to create `left: Xpx` rules

Column categories:

- `fixed`: special “system” columns like selection / reorder / expandable chevron
- `sticky`: user columns that pin to the left
- `scroll`: normal columns
- `hidden`: excluded from the rendered grid

### 7) Row context column

If `RowState.snippets.context` exists, the table renders an additional sticky column on the right.

- `RowState.options.context.hover` hides the *content* unless hovered (but the column still reserves width)
- `RowState.options.context.alignHeaderToRows` triggers measuring of header/row context widths and applies a shared fixed width

### 8) Selection, reorder, expandable

Selection:

- Controlled by `TableProps.select` (boolean or options)
- When enabled, `Table.svelte` injects a fixed `__fixed` column containing checkboxes

Reorder:

- Controlled by `TableProps.reorderable`
- Uses `runic-reorder` on the body area; also injects a drag handle in `__fixed`

Expandable:

- Controlled by including `<Expandable>` in table content
- Expand/collapse uses `RowCtx.expanded` state and animated sizing via `SizeTween`
- Rendered expanded content is wrapped as a `role="region"` with an SR-only label

### 9) Panels

`PanelState` registers panels by id.

- Table uses `TableProps.panel` to decide which panel is open.
- Panel size animation uses `SizeTween`.
- Backdrop is controlled per panel via `PanelProps.backdrop`.

### 10) CSV export

CSV options type is defined in `table/csv.ts`.

Implementation is in `Table.svelte`:

- It temporarily renders a hidden table that matches the current state and then serializes `table.rows`/`cell.textContent`.
- Supports:
  - comma or semicolon separator
  - exporting selected rows only
  - exporting filtered vs unfiltered
  - exporting visible columns vs all columns vs specific column ids

## Demo App Architecture

The demo app exists to validate features and reproduce issues.

Notable routes:

- `/` renders Example1 (full-featured table)
- `/example2` renders a minimal `auto` + `reorderable` example
- `/testing` automated test suite with 14 tests covering async load, virtualization, selection, etc.
- `/issues/19` reproduces context-column rendering issues
- `/issues/20` reproduces a virtualization unmount race and a filter-loop repro
- `/issues/fix-new-bugs` contains a “multi repro” page, including sandboxed iframe localStorage errors

## Build & Packaging

Library packaging is done from `svelte-tably/`:

- `bun run package` runs `svelte-tably/build.ts`
- `build.ts`:
  - deletes generated folders (`npm/`, `dist/`, `.svelte-kit/`)
  - runs `svelte-package`
  - creates `npm/` and copies `package.json`, root README, root LICENSE
  - moves `dist/` into `npm/dist/`
  - rewrites `npm/package.json`:
    - removes dev-only fields
    - converts exports from `./src/*` to `./dist/*` with `{ types, default, svelte }`

Result:

- `svelte-tably/npm/` is the directory published to npm (`publishConfig.directory` in the source package)

## CLI Commands

From repository root:

- Install: `bun install`
- Run demo app: `bun run app`

Packaging / publishing:

- Build publish directory: `bun run package`
- Publish (requires configured changesets + npm auth): `bun run publish`

From `app/`:

- Dev: `bun run dev`
- Typecheck: `bun run check`
- Build: `bun run build`

From `svelte-tably/`:

- Package: `bun run package`

## Development Guidelines

- The library is Svelte 5-first and uses runes (`$state`, `$derived`, `$effect`).
- Components register themselves into `TableState` via Svelte context; keep that pattern consistent.
- Prefer keeping logic in `*.svelte.ts` state modules and keeping Svelte components minimal.
- Guard browser-only APIs (`localStorage`, `matchMedia`, DOM measurement) for SSR/sandbox compatibility.
- Reorderable mode disables sorting and filtering by design; new features should respect those constraints.
