import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { svelteOrigin } from 'svelte-origin/plugin'

export default defineConfig({
	plugins: [
		svelteOrigin({
			debug: true,
			outputDir: '.svelte-origin-output',
			outputTransformed: true
		}) as any,
		sveltekit()
	]
})
