import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite';
import { getAllPostSlugs, getPageSlugs, getSectionSlugs } from './app/lib/posts.server'

export default {
  ssr: true,
  presets: [vercelPreset()],
  async prerender() {
    const sections = await getSectionSlugs()

    // Static routes
    const staticRoutes = ['/', '/playground']

    // Build section routes dynamically
    const sectionRoutes = await Promise.all(
      sections.map(async (section) => {
        const slugs = await getAllPostSlugs(section)
        return [
          `/${section}`,
          ...slugs.map((slug) => `/${section}/${slug}`),
        ]
      })
    )

    // Playground special routes
    const playgroundSlugs = await getAllPostSlugs('playground')

    // Static pages
    const pageSlugs = await getPageSlugs()

    return [
      ...staticRoutes,
      ...sectionRoutes.flat(),
      '/playground/lastfm',
      ...playgroundSlugs.map((slug) => `/playground/${slug}`),
      ...pageSlugs.map((slug) => `/${slug}`),
    ]
  },
} satisfies Config
