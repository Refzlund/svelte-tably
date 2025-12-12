# svelte-tably — Patterns & Conventions

This document captures the patterns used across the library so changes stay consistent.

## Architectural Patterns

### Registration Components + State Modules

Pattern:

- Svelte components (`Column.svelte`, `Row.svelte`, `Panel.svelte`, `Expandable.svelte`) are thin wrappers.
- Each wrapper constructs a corresponding state instance (`ColumnState`, `RowState`, `PanelState`, `ExpandableState`).
- State instances attach to the current `TableState` via Svelte context.

Why:

- Keeps the rendering component (`Table.svelte`) as the central orchestrator.
- Keeps behavior/config in TypeScript modules (`*.svelte.ts`) which are easier to test and reason about.

Rule of thumb:

- If a feature is primarily “configuration/state”, put it in a state module.
- If a feature is “render-time layout/DOM behavior”, implement in `Table.svelte`.

### Singletons per Table: RowState + ExpandableState

`Row` and `Expandable` configure table-wide row behavior.

- The table has at most one `RowState` and one `ExpandableState` active at a time.
- Adding multiple `<Row>` or `<Expandable>` children should be treated as “last one wins” behavior unless changed explicitly.

### Context-based Association

All child components should work by default without passing a `table` prop, because they use:

- `TableState.getContext()` / `setContext()`

Prefer to keep the explicit `table` prop optional for advanced scenarios.

## Reactive Patterns (Svelte 5)

### Use $derived for computed slices and view models

Examples in the codebase:

- `TableState.options` is derived from external props, with business constraints applied.
- `ColumnState.options/defaults/snippets` are derived from props.

### Use $effect sparingly and explicitly track dependencies

Where effects are used:

- DOM measurement (virtualization row height, context width measurement)
- event wiring (`svelte/events` `on(...)`)
- persistence scheduling to localStorage

Guidelines:

- Make dependencies explicit (read reactive values inside the effect).
- Use `untrack` for work that should not create extra reactive dependencies.
- Use `requestAnimationFrame` to batch measurement and avoid layout thrash.

## Feature Constraints (Intentional)

### Reorderable mode disables sort/filter

When `TableProps.reorderable` is enabled:

- `Data.current` uses `origin` directly.
- Sorting and filtering are disabled.

This avoids conflicting meanings of “current order” (user-defined order vs sorted order).

### CSV export uses a hidden table

CSV export is implemented by temporarily rendering a hidden `<table>` that matches current state and then serializing it.

This pattern:

- Avoids duplicating “how the value is rendered” logic.
- Makes CSV export match custom row snippets (when present) by reading DOM text.

Trade-offs:

- It depends on DOM availability; it is not a pure SSR export.

## Styling Patterns

### CSS variables for theming

The table uses CSS variables like:

- `--tably-bg`, `--tably-color`
- `--tably-border`, `--tably-border-grid`
- `--tably-padding-x`, `--tably-padding-y`
- `--tably-radius`

Consumers should set variables at a global root scope or on a wrapping container.

### CSS grid row layout

The table body/header/footer use grid-based rows and computed `grid-template-columns`.

When adding new structural columns:

- ensure `grid-template-columns` is updated consistently
- ensure sticky offsets include the new widths

## Accessibility Patterns

- Expanded row content is rendered with:
  - `role="region"`
  - `aria-labelledby` pointing at an SR-only label (generated per row)
  - `aria-hidden` when collapsed
- Control buttons use `aria-label` when icons are used.

Guideline:

- Maintain these ARIA attributes when changing expandable behavior.

## Packaging & Release Patterns

### Publish directory generation

The library is packaged by generating `svelte-tably/npm/`:

- `svelte-package` builds output into `dist/`
- `build.ts` rewrites `exports` to point at `dist` files and includes types

### Changesets-driven publishing

Root uses `@changesets/cli` and `changeset publish`.

Guideline:

- Prefer changesets for any library change that should land in npm.
- Keep the generated `npm/` directory out of manual edits; it’s build output.
