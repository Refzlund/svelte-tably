<script lang='ts'>
	import Table from 'svelte-tably'

	type Row = {
		name: string
		age: number
	}

	let data = $state<Row[]>([
		{ name: 'Dog', age: 12 },
		{ name: 'Shiba', age: 21 },
		{ name: 'Cat', age: 28 },
		{ name: 'Pig', age: 10 },
		{ name: 'Crow', age: 30 },
		{ name: 'Giraffe', age: 26 }
	])
</script>

<div class='page'>
	<p class='hint'>This page is meant to be embedded in a sandboxed iframe.</p>
	<div class='wrap'>
		<Table id='sandbox-repro' auto {data} reorderable resizeable={false} />
	</div>
</div>

<style lang='postcss'>
	.page {
		padding: 0.75rem;
	}

	.hint {
		margin: 0 0 0.5rem;
		color: hsl(0, 0%, 35%);
		font-size: 0.9rem;
	}

	.wrap {
		height: 300px;
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--tably-bg, white);
	}

	.wrap :global(table) {
		height: 100%;
	}
</style>
