
import { default as _Table } from './Table.svelte'
import Column from './Column.svelte'
import { default as _Panel } from './Panel.svelte'

const LATIN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] as const
type Capital = typeof LATIN[number]

const Table = new Proxy(_Table, {
	get(target, p, receiver) {
		if (typeof p !== 'string' || !LATIN.includes(p[0] as Capital)) {
			return Reflect.get(target, p, receiver)
		}

		return new Proxy(Column, {
			apply(_, __, [anchor, props]) {
				Object.assign(props, { __key: p })
				return Column(anchor, props as any)
			},
		})
	}
}) as typeof _Table & {
	[key: `${Capital}${string}`]: typeof Column
}

const Panel = new Proxy(_Panel, {
	get(target, p, receiver) {
		if (typeof p !== 'string' || !LATIN.includes(p[0] as Capital)) {
			return Reflect.get(target, p, receiver)
		}

		return new Proxy(_Panel, {
			apply(_, __, [anchor, props]) {
				Object.assign(props, { __key: p })
				return _Panel(anchor, props as any)
			},
		})
	},
}) as unknown as {
	[key: `${Capital}${string}`]: typeof _Panel
}

export { Table, Panel }