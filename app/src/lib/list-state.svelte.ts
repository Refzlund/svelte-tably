// Minimal generic list origin
export const ListState = <T>() => $origin({
	props: $origin.props({
		items: $bindable([] as T[]),
		label: 'List'
	}),

	get count() {
		return this.props.items.length
	}
})
