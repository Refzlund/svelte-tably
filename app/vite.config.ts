import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { svelteOrigin } from 'svelte-origin/plugin'
import { svelteOriginDts } from 'svelte-origin/vite-dts'

export default defineConfig({
	plugins: [
		svelteOriginDts() as any,
		svelteOrigin() as any,
		sveltekit()
	]
})
