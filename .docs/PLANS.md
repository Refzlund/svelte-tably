# svelte-tably — Plans

This file tracks high-level goals and ongoing maintenance items.

## Project Goals

- Provide a Svelte 5-first table component that scales to large datasets.
- Keep the API flexible via child components (Column/Row/Panel/Expandable).
- Maintain a good “batteries included” experience:
  - virtualization
  - CSV export
  - persistence (localStorage)
  - selection, reorder, sticky columns

## Repo Structure Goals

- Keep `svelte-tably/` as the publishable library package.
- Keep `app/` as a fast, local demo/repro harness.
- Prefer shipping minimal runtime dependencies; keep Svelte as a peer dependency.

## Current Documentation Milestone

Done in this milestone:

- Capture architecture overview and module map.
- Capture patterns/conventions for future contributors.
- Record CLI commands and packaging pipeline.

## Maintenance Checklist

When changing the library:

- Verify exports surface remains correct (`svelte-tably/src/index.ts`).
- Verify demo app still runs and key examples render.
- If touching virtualization, test:
  - large data (thousands of rows)
  - mount/unmount races (see issues repro pages)
- If touching persistence, test:
  - sandboxed iframe behavior
  - SSR safety (no unguarded localStorage access)

## Known Repro Pages (Demo App)

These pages exist to reproduce issues and regressions:

- `/issues/19` context column rendering behavior
- `/issues/20` virtualization unmount race + filter-loop repro
- `/issues/fix-new-bugs` multi-repro page including sandboxed iframe storage errors
