import { getPage } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import { PostContent } from '~/components/PostContent'
import type { Route } from './+types/page'

/**
 * Loader for dynamic static pages (online, uses).
 * Valid pages are determined by filesystem - if the .md file exists, it's valid.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const page = await getPage(params.slug)

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
  const title = data?.page.frontmatter.title ?? 'Page'
  return [
    { title: `Josiah Wiebe – ${title}` },
    { name: 'description', content: data?.page.frontmatter.excerpt ?? '' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: data?.page.frontmatter.excerpt ?? '' },
    { property: 'og:image', content: `/api/og?title=${encodeURIComponent(title)}` },
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
