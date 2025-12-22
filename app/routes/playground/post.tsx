import { getPost } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import { PostContent } from '~/components/PostContent'
import type { Route } from './+types/post'

export async function loader({ params }: Route.LoaderArgs) {
  const post = await getPost('playground', params.slug)

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
 * Individual playground entry page.
 */
export default function PlaygroundPost({ loaderData }: Route.ComponentProps) {
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
