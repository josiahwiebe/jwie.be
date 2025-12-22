import { getPost } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import { PostContent } from '~/components/PostContent'
import type { Route } from './+types/section.post'

const VALID_SECTIONS = ['blog', 'archive', 'logbook'] as const
type Section = (typeof VALID_SECTIONS)[number]

/**
 * Extract section from URL path (e.g., /blog/post-slug -> blog).
 */
function getSectionFromUrl(url: string): Section | null {
  const pathname = new URL(url).pathname
  const segment = pathname.split('/')[1] as Section
  return VALID_SECTIONS.includes(segment) ? segment : null
}

/**
 * Loader for dynamic section post pages.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const section = getSectionFromUrl(request.url)

  if (!section) {
    throw new Response('Not Found', { status: 404 })
  }

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
