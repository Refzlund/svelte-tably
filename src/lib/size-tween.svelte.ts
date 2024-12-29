import { tick, untrack } from 'svelte'
import { sineInOut } from 'svelte/easing'
import { Tween } from 'svelte/motion'

interface SizeOptions {
	min?: number
	duration?: number
}

export class SizeTween {
	#tweenOptions = { duration: 300, easing: sineInOut }

	#tween = new Tween(0, this.#tweenOptions)
	current = $derived(this.#tween.current)
	transitioning = $state(false)

	/** bind:offsetWidth bind:offsetHeight */
	size = $state(0)

	set target(value: number) {
		this.transitioning = true
		this.#tween.set(value, this.#tweenOptions).then(() => this.transitioning = false)
	}

	constructor(cb: () => boolean | undefined, opts: SizeOptions = {}) {
		if('duration' in opts) {
			this.#tweenOptions.duration = opts.duration!
		}

		untrack(() => {
			if(cb()) {
				requestAnimationFrame(() => {
					this.#tween.set(Math.max(this.size, opts.min ?? 0), { duration: 0 })
				})
			}
		})

		$effect.pre(() => {
			this.target = cb() ? Math.max(this.size, opts.min ?? 0) : 0
		})
	}
}