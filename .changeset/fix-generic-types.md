---
'svelte-tably': patch
---

Fix TypeScript generic type inference for exported component types

The `ContentCtx` and `ContentSnippet` types now correctly propagate generic parameters in published package builds. Previously, `Column`, `Panel`, `Expandable`, and `Row` components in the content snippet context resolved to `any` due to `typeof Component<T>` patterns not working with svelte-package's generated `$$IsomorphicComponent` interface pattern.

This fix introduces explicit component type interfaces (`ColumnComponent<T>`, `PanelComponent<T>`, `ExpandableComponent<T>`, `RowComponent<T>`) that properly propagate generics through the type system.
