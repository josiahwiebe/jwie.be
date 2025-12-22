import { getPost } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import { PostContent } from '~/components/PostContent'
import type { Route } from './+types/section.post'

/**
 * Extract section from URL path (e.g., /blog/post-slug -> blog).
 */
function getSectionFromUrl(url: string): string {
  const pathname = new URL(url).pathname
  return pathname.split('/')[1] ?? ''
}

/**
 * Loader for dynamic section post pages.
 * Valid sections are determined by filesystem.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const section = getSectionFromUrl(request.url)
  const post = await getPost(section, params.slug)

  if (!post) {
    throw new Response('Not Found', { status: 404 })
  }

  const html = await markdownToHtml(post.content)

  return {
    post: {
      ...post,
      html,
    },
  }
}

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: 'Post Not Found' }]
  }

  return [
    { title: `Josiah Wiebe – ${data.post.frontmatter.title}` },
    { name: 'description', content: data.post.frontmatter.excerpt ?? '' },
    { property: 'og:title', content: data.post.frontmatter.title },
    { property: 'og:description', content: data.post.frontmatter.excerpt ?? '' },
    { property: 'og:image', content: `/api/og?title=${encodeURIComponent(data.post.frontmatter.title)}` },
  ]
}

/**
 * Dynamic section post page (blog, archive, logbook posts).
 */
export default function SectionPost({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData

  return (
    <PostContent
      title={post.frontmatter.title}
      date={post.frontmatter.date}
      subtitle={post.frontmatter.subtitle}
      html={post.html}
    />
  )
}
