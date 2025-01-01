import { createSubscriber } from 'svelte/reactivity'

export class Trigger<T> {
	#subscribe: () => void
	#update: () => void = () => {}

	#subscribers = new Set<(value?: T) => void>()

	#value?: T

	constructor() {
		this.#subscribe = createSubscriber(update => this.#update = update)
	}

	trigger(value?: T) {
		this.#value = value
		this.#update()
		this.#subscribers.forEach(fn => fn(value))
	}

	onTrigger<E extends HTMLElement>(node: E, fn: (node: E, value?: T) => void) {
		const f = (value?: T) => fn(node, value)
		this.#subscribers.add(f)
		return {
			destroy: () => this.#subscribers.delete(f)
		}
	}

	/** Subscribe to the trigger; returns the value if any. */
	get current() {
		this.#subscribe()
		return this.#value
	}
}