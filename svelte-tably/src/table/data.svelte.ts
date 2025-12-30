import { on } from "svelte/events";
import { untrack } from "svelte";

// Minimal interface for what Data needs from Table to avoid circular dependency
interface TableLike {
  columns: Record<
    string,
    {
      options: {
        sort: boolean | ((a: unknown, b: unknown) => number);
        value: ((item: unknown) => unknown) | undefined;
        filter: ((value: unknown) => boolean) | undefined;
      };
    }
  >;
}

/** Exported interface for DataInstance to avoid circular ReturnType issues */
export interface DataInstance<T = unknown> {
  readonly origin: T[];
  sorted: T[];
  filtered: T[];
  sortby: string | undefined;
  sortReverse: boolean;
  readonly current: T[];
  sortBy(column: string): void;
  sortAction(node: HTMLElement, column: string): void;
  sortTable(): void;
}

export type DataProps<T = unknown> = $attrs.Of<ReturnType<typeof Data<T>>>;

export const Data = <T>() =>
  $origin(
    {
      props: $attrs({
        _table: undefined as TableLike | undefined,
        _data: [] as T[],
        _filters: undefined as ((item: T) => boolean)[] | undefined,
        _reorderable: false as boolean,
      }),

      _origin: $state<T[]>([]),
      _sorted: $state<T[]>([]),
      _filtered: $state<T[]>([]),
      _sortby: $state<string | undefined>(undefined),
      _sortReverse: $state(false),

      get origin() {
        return this._origin;
      },

      set origin(value: T[]) {
        this._origin = value;
      },

      get sorted() {
        return this._sorted;
      },

      set sorted(value: T[]) {
        this._sorted = value;
      },

      get filtered() {
        return this._filtered;
      },

      set filtered(value: T[]) {
        this._filtered = value;
      },

      get sortby() {
        return this._sortby;
      },

      set sortby(value: string | undefined) {
        this._sortby = value;
      },

      get sortReverse() {
        return this._sortReverse;
      },

      set sortReverse(value: boolean) {
        this._sortReverse = value;
      },

      get current() {
        return $derived(this.props._reorderable ? this._origin : this._filtered);
      },

      sortBy(column: string) {
        const table = this.props._table;
        if (!table) return;
        if (this.props._reorderable) return;

        const columnInstance = table.columns[column];
        if (!columnInstance) return;
        const { sort, value } = columnInstance.options;
        if (!sort || !value) return;

        if (this._sortby === column) {
          this._sortReverse = !this._sortReverse;
        } else {
          this._sortReverse = false;
          this._sortby = column;
        }
      },

      sortAction(node: HTMLElement, column: string) {
        $effect(() =>
          on(node, "click", () => {
            // Inline sortBy logic to work around svelte-origin transformation issue
            const table = this.props._table;
            if (!table) return;
            if (this.props._reorderable) return;

            const columnInstance = table.columns[column];
            if (!columnInstance) return;
            const { sort, value } = columnInstance.options;
            if (!sort || !value) return;

            if (this._sortby === column) {
              this._sortReverse = !this._sortReverse;
            } else {
              this._sortReverse = false;
              this._sortby = column;
            }
          }),
        );
      },

      sortTable() {
        const table = this.props._table;
        if (!table) return;

        if (!this._sortby || this.props._reorderable) {
          this._sorted = [...this._origin];
          return;
        }

        const column = table.columns[this._sortby];
        let { sort, value } = column?.options ?? {};

        if (!sort || !value) {
          this._sorted = [...this._origin];
          return;
        }

        if (sort === true) {
          sort = (a, b) => String(a).localeCompare(String(b));
        }

        if (this._sortReverse) {
          this._sorted = this._origin.toSorted((a, b) => sort(value(b), value(a)));
        } else {
          this._sorted = this._origin.toSorted((a, b) => sort(value(a), value(b)));
        }
      },
    },
    function () {
      const table = this.props._table;
      if (!table) return;

      this._origin = this.props._data;
      this._sorted = [...this._origin];
      this._filtered = this._sorted;

      $effect(() => {
        this._origin = this.props._data;
        if (this.props._reorderable) return;
        this.props._data;
        this.props._data.length;
        this._sortby;
        this._sortReverse;
        untrack(() => this.sortTable());
      });

      $effect(() => {
        if (this.props._reorderable) return;

        // Track dependencies explicitly
        this.props._filters;
        this._sorted;
        // Track column additions/removals by reading the keys array
        const columnKeys = Object.keys(table.columns);
        columnKeys.length;
        for (const key of columnKeys) {
          table.columns[key]?.options?.filter;
          table.columns[key]?.options?.value;
        }

        const filters = untrack(() => {
          const all = [...(this.props._filters ?? [])] as ((item: T) => boolean)[];
          for (const key of columnKeys) {
            const col = table.columns[key];
            if (!col) continue;
            const filter = col.options?.filter;
            const valueOf = col.options?.value;
            if (filter && valueOf) {
              all.push((item) => filter(valueOf(item)));
            }
          }
          return all;
        });

        this._filtered =
          filters.length === 0
            ? this._sorted
            : this._sorted.filter((value) => filters.every((filter) => filter(value)));
      });
    },
  );
