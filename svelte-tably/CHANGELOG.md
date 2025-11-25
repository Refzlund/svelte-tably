# svelte-tably

## 1.1.2

### Patch Changes

- fix: prevent scroll errors on undefined elements ([#17](https://github.com/Refzlund/svelte-tably/pull/17))

## 1.1.1

### Patch Changes

- fix: saved tables do not preserve column order ([#15](https://github.com/Refzlund/svelte-tably/pull/15))

## 1.1.0

### Minor Changes

- feat: export csv via table-state; `table.toCSV` ([#13](https://github.com/Refzlund/svelte-tably/pull/13))

- feat: `toCSV` can now accept `columns` and `filters`

- feat: allowwed bind:table to bind table-state

- feat: added `Table.State` type

- feat: save table settings to localstorage ([#10](https://github.com/Refzlund/svelte-tably/pull/10))

### Patch Changes

- fix: assigning to undefined when scrolling ([#12](https://github.com/Refzlund/svelte-tably/pull/12))

- fix: sticky headers unstick on long columns ([#14](https://github.com/Refzlund/svelte-tably/pull/14))

## 1.0.1

### Patch Changes

- fix: broken types due to svelte-package bug ([#2](https://github.com/Refzlund/svelte-tably/pull/2))
