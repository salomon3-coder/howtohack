// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://howtohack.net',
	integrations: [
		sitemap({
			filter: (page) => {
				try {
					const { pathname } = new URL(page);
					// Demo / template pages — not primary SEO content
					if (pathname.startsWith('/article-demo')) return false;
					if (pathname.startsWith('/faq-demo')) return false;
					if (pathname.startsWith('/howto-demo')) return false;
					return true;
				} catch {
					return true;
				}
			},
		}),
	],
});
