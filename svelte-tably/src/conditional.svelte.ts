import { untrack } from 'svelte'

type Actionable<A extends unknown | unknown[]> = {
	destroy?: () => void
	update?: (args: A) => void
}

/*
	use:conditional={[condition, action, arg]}
	use:conditional={[condition, (node) => action(node, arg), updatedArg]}
*/
export function conditional<A extends unknown | unknown[]>(
	node: HTMLElement,
	arg: [
		condition: (() => boolean) | boolean,
		action: 
			| ((node: HTMLElement, args?: A) => void | Actionable<A>)
		,
		args?: A
	]
) {
	let prev: Actionable<A> | void
	let clean: (() => void) | void
	$effect(() => {
		prev?.destroy?.()
		clean?.()
		if (typeof arg[0] === 'function' ? arg[0]() : arg[0]) {
			untrack(() => {
				prev = arg[1](node, arg[2]!)
				if(prev?.update) {
					clean = $effect.root(() => {
						$effect(() => {
							prev!.update!(arg[2]!)
						})
					})
				}
			})
			return clean
		}
	})
}