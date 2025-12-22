import { getPage } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import { PostContent } from '~/components/PostContent'
import type { Route } from './+types/page'

const VALID_PAGES = ['online', 'uses'] as const
type PageSlug = (typeof VALID_PAGES)[number]

/**
 * Loader for dynamic static pages (online, uses).
 */
export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug as PageSlug

  if (!VALID_PAGES.includes(slug)) {
    throw new Response('Not Found', { status: 404 })
  }

  const page = await getPage(slug)

  if (!page) {
    throw new Response('Not Found', { status: 404 })
  }

  const html = await markdownToHtml(page.content)

  return {
    page: {
      ...page,
      html,
    },
  }
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Josiah Wiebe – ${data?.page.frontmatter.title ?? 'Page'}` },
    { name: 'description', content: data?.page.frontmatter.excerpt ?? '' },
  ]
}

/**
 * Dynamic static page (online, uses).
 */
export default function StaticPage({ loaderData }: Route.ComponentProps) {
  const { page } = loaderData

  return (
    <PostContent
      title={page.frontmatter.title}
      subtitle={page.frontmatter.subtitle}
      html={page.html}
    />
  )
}
