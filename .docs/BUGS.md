# Bugs & Known Issues

## Active Issues

*No active issues.*

---

## Resolved Issues

### Async data loading with virtualization (empty → populated)

**Status**: ✅ Resolved  
**Discovered**: 2025-12-31  
**Impact**: Table didn't re-render when data transitioned from empty to populated

#### Root Cause
svelte-origin's `props` (via `$attrs`) are NOT reactive when an origin is created manually using `Data<T>()({ ... })`. The `__inputAttrs` object is a plain JavaScript object, so setting properties on it doesn't trigger Svelte's reactivity.

When `TableState` updated `dataState.props._data`, the `$effect` inside `Data` that tracked `this.props._data` never re-ran because the prop wasn't wrapped in `$state`.

#### Solution
1. Added internal `$state` fields to `Data`: `_origin`, `__filters`, `__reorderable`
2. `TableState` now sets these internal fields directly instead of via props
3. `Data`'s `$effect` blocks track these internal `$state` fields
4. `Virtualization` tracks a `tickVersion` counter to ensure effects re-run after each data update cycle

**Files changed:**
- [data.svelte.ts](../svelte-tably/src/table/data.svelte.ts) - Added internal `$state` fields
- [table-state.svelte.ts](../svelte-tably/src/table/table-state.svelte.ts) - Sets internal fields directly
- [virtualization.svelte.ts](../svelte-tably/src/table/virtualization.svelte.ts) - Added `tickVersion` for reliable effect re-runs

---

### svelte-origin transformer: CONFIRMED WORKING
**Status**: ✅ Not a bug  
**Discovered**: 2025-12-31  

Initial investigation suspected the svelte-origin transformer was dropping $effect statements. After a clean restart and rebuild, the transformed output correctly includes all $effects. The issue was stale HMR cache.
