export const TestOrigin = <T>() => $origin({
	props: $origin.props({
		items: $bindable([] as T[]),
		label: 'test' as string
	})
})
