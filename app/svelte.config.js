import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { svelteOriginPreprocess } from 'svelte-origin/preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		svelteOriginPreprocess(),
		vitePreprocess()
	]
}

export default config
