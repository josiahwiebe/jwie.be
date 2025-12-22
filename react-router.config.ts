import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite';
import { getAllPostSlugs, getPageSlugs } from './app/lib/posts.server'

export default {
  ssr: true,
  presets: [vercelPreset()],
  async prerender() {
    // Static routes
    const staticRoutes = [
      '/',
      '/blog',
      '/logbook',
      '/playground',
      '/archive',
    ]

    // Dynamic routes from markdown content
    const blogSlugs = await getAllPostSlugs('blog')
    const logbookSlugs = await getAllPostSlugs('logbook')
    const playgroundSlugs = await getAllPostSlugs('playground')
    const archiveSlugs = await getAllPostSlugs('archive')
    const pageSlugs = await getPageSlugs()

    return [
      ...staticRoutes,
      ...blogSlugs.map((slug) => `/blog/${slug}`),
      ...logbookSlugs.map((slug) => `/logbook/${slug}`),
      ...playgroundSlugs.map((slug) => `/playground/${slug}`),
      ...archiveSlugs.map((slug) => `/archive/${slug}`),
      ...pageSlugs.map((slug) => `/${slug}`),
    ]
  },
} satisfies Config
