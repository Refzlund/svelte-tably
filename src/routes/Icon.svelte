<script lang='ts'>

	const {
		icon,
		opacity
	}: {
		icon: 'handle' | 'eye' | 'eye-closed'
		opacity?: number
	} = $props()
	
</script>

{#if icon === 'handle'}
	<svg style='opacity: {opacity ?? 1};' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 14.5v-1h14v1zm0-4v-1h14v1z"/></svg>
{:else if icon === 'eye'}
	<svg style='opacity: {opacity ?? 1};' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962"/><circle cx="12" cy="12" r="3"/></g></svg>
{:else if icon === 'eye-closed'}
	<svg style='opacity: {opacity ?? 1};' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 10s3.5 4 10 4s10-4 10-4M4 11.645L2 14m20 0l-1.996-2.352M8.914 13.68L8 16.5m7.063-2.812L16 16.5"/></svg>
{/if}