import { onMount, type Snippet } from 'svelte'

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
	for (const key of keys) {
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

		Object.defineProperty(item, key, {
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

export function assignDescriptors<T extends AnyRecord, B extends AnyRecord>(target: T, source: B): T & B {
	for (const key of Object.keys(source)) {
		const descriptor = Object.getOwnPropertyDescriptor(source, key)
		if (descriptor) {
			Object.defineProperty(target, key, descriptor)
		} else {
			target[key as keyof T] = source[key] // Copy regular values if descriptor is missing
		}
	}
	return target
}

/** Capitalize by space */
export function capitalize(str: string) {
	let parts = str.split(' ')
	let result = ''
	for(let part of parts) {
		result += part.charAt(0).toUpperCase() + part.slice(1) + ' '
	}
	return result
}

/** Split words when going from lower case to uppercase; `someWords-split` -> `some Word Split...` */
export function segmentize(str: string) {
	let result = ''
	for (let i = 0; i < str.length; i++) {
		const char = str[i]
		const prevChar = i > 0 ? str[i - 1] : ''
		if ((char === '-' || char === char.toUpperCase()) && prevChar !== ' ' && prevChar !== prevChar.toUpperCase()) {
			result += ' '
			if(char === '-')
				continue
		}
		result += char
	}
	return result.trim()
}



type SnippetLiteralProperties<K extends unknown[], Result extends (() => unknown)[] = []> = 
	K extends [infer First, ...infer Rest] 
		? SnippetLiteralProperties<Rest, [...Result, () => First]> 
		: Result


export function snippetLiteral<K extends unknown[]>(snippet: Snippet<K>) {
	return snippet as unknown as ((anchor: Comment, ...args: SnippetLiteralProperties<K>) => ReturnType<typeof snippet>)
}