import { getAllPosts, getIndexPage } from '~/lib/posts.server'
import { PostList } from '~/components/PostList'
import type { Route } from './+types/index'

export async function loader({}: Route.LoaderArgs) {
  const [posts, indexPage] = await Promise.all([
    getAllPosts('playground'),
    getIndexPage('playground'),
  ])

  return {
    posts: posts.map((p) => ({
      slug: `/playground/${p.slug}`,
      frontmatter: p.frontmatter,
    })),
    title: indexPage?.frontmatter.title ?? 'Playground',
    subtitle: indexPage?.frontmatter.subtitle,
  }
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Josiah Wiebe – ${data?.title ?? 'Playground'}` },
    { name: 'description', content: data?.subtitle ?? 'Experiments and side projects' },
  ]
}

/**
 * Playground index page.
 */
export default function PlaygroundIndex({ loaderData }: Route.ComponentProps) {
  const { posts, title, subtitle } = loaderData

  return (
    <>
      <header className="page-header">
        <h1 className="text-2xl font-heading font-bold dark:text-slate-300">{title}</h1>
        {subtitle && (
          <p className="text-slate-700 dark:text-slate-600 text-md">{subtitle}</p>
        )}
      </header>
      <PostList posts={posts} showYear />
    </>
  )
}
