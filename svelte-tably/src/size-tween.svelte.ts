import { untrack } from 'svelte'
import { sineInOut } from 'svelte/easing'
import { Tween } from 'svelte/motion'
import type { EasingFunction } from 'svelte/transition'

const prefersReducedMotion = () => {
	if (typeof window === 'undefined') return false
	if (!('matchMedia' in window)) return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface SizeOptions {
	min?: number
	duration?: number
	easing?: EasingFunction
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
		const duration = prefersReducedMotion() ? 0 : this.#tweenOptions.duration
		this.#tween.set(value, { ...this.#tweenOptions, duration }).then(() => this.transitioning = false)
	}

	constructor(cb: () => boolean | undefined, opts: SizeOptions = {}) {
		if('duration' in opts) {
			this.#tweenOptions.duration = opts.duration!
		}

		if('easing' in opts) {
			this.#tweenOptions.easing = opts.easing!
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