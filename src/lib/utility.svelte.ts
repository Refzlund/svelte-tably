import { onMount } from 'svelte'

export type Simplify<T> = T extends infer V ? {
	[K in keyof V]: V[K]
} : never

export type AnyRecord = Record<PropertyKey, any>

export function pick<T extends Record<PropertyKey, any>, K extends (keyof T)[]>(item: T, keys: K) {
	return keys.reduce(
		(acc, key) => ({ ...acc, [key]: item[key] }), {}
	) as Simplify<Pick<T, K[number]>>
}

export function boundPick<T extends Record<PropertyKey, any>, K extends (keyof T)[]>(item: T, keys: K) {
	const obj = {} as SetterRecord
	for(const key in keys) {
		obj[key] = [() => item[key], (v: any) => item[key] = v]
	}
	return Object.defineProperties({}, withSetters(obj))
}

export function assign(item: Record<PropertyKey, any>, props: Partial<Record<PropertyKey, any>> = {}) {
	for(const key in props) {
		const value = props[key]
		if (value === undefined) continue
		if (typeof value === 'object') {
			assign(item[key], value)
			continue
		}
		item[key] = value
	}
}

export function boundAssign(item: Record<PropertyKey, any>, props: Partial<Record<PropertyKey, any>> = {}) {
	for(const key in props) {
		const value = props[key]
		if (value === undefined) continue
		if (typeof value === 'object') {
			boundAssign(item[key], value)
			continue
		}

		Object.defineProperty(item, value, {
			get() { return props[key] },
			set(v) { props[key] = v }
		})
	}
}

export function mounted() {
	let isMounted = $state(false)
	onMount(() => { isMounted = true })
	return {
		get isMounted() { return isMounted }
	}
}

export function getters<T extends AnyRecord>(obj: T) {
	let items = {} as AnyRecord
	for (const key in obj) {
		items[key] = { get: () => obj[key] }
	}
	return items as { readonly [K in keyof T]: T[K] }
}

type SetterRecord = Record<PropertyKey, [() => any, (v: any) => void]>
export function withSetters<T extends SetterRecord>(obj: T) {
	let items = {} as AnyRecord
	for (const key in obj) {
		items[key] = {
			get: () => obj[key][0](),
			set: (v: unknown) => obj[key][1](v)
		}
	}
	return items as T
}

export function fromProps<T extends AnyRecord, B extends SetterRecord>(props: T, boundProps?: B) {
	return Object.defineProperties({}, {
		...getters(props),
		...withSetters(boundProps ?? {} as B)
	}) as Simplify<
		& { [K in keyof B]: ReturnType<B[K][0]> } 
		& { readonly [K in keyof T]: T[K] }
	>
}