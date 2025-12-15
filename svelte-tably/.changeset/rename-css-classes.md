---
'svelte-tably': patch
---

Renamed internal CSS classes to use `tably-` prefix to avoid conflicts with Tailwind CSS utility classes.

The following classes have been renamed:
- `row` → `tably-row`
- `column` → `tably-column`
- `table` → `tably-table`
- `sticky` → `tably-sticky`
- `fixed` → `tably-fixed`
- `border` → `tably-border`
- `hidden` → `tably-hidden`
- `first` → `tably-first`
- `last` → `tably-last`
- `selected` → `tably-selected`
- `dragging` → `tably-dragging`
- `sortable` → `tably-sortable`
- `resizeable` → `tably-resizeable`
- `pad` → `tably-pad`
- `header` → `tably-header`
- `headers` → `tably-headers`
- `content` → `tably-content`
- `statusbar` → `tably-statusbar`
- `filler` → `tably-filler`
- `expandable` → `tably-expandable`
- `expandable-cell` → `tably-expandable-cell`
- `expandable-sticky` → `tably-expandable-sticky`
- `expandable-clip` → `tably-expandable-clip`
- `expandable-content` → `tably-expandable-content`
- `backdrop` → `tably-backdrop`
- `panel` → `tably-panel`
- `panel-content` → `tably-panel-content`
- `sr-only` → `tably-sr-only`

This is a non-breaking change as these are internal implementation classes that should not be targeted by consumers.
