import { getAllPosts, getIndexPage } from '~/lib/posts.server'
import { PostList } from '~/components/PostList'
import type { Route } from './+types/section.index'

/**
 * Extract section from URL path (e.g., /blog -> blog).
 */
function getSectionFromUrl(url: string): string {
  const pathname = new URL(url).pathname
  return pathname.split('/')[1] ?? ''
}

/**
 * Loader for dynamic section index pages.
 * Valid sections are determined by filesystem - directories with index.md.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const section = getSectionFromUrl(request.url)

  const [posts, indexPage] = await Promise.all([
    getAllPosts(section),
    getIndexPage(section),
  ])

  if (!indexPage) {
    throw new Response('Not Found', { status: 404 })
  }

  return {
    section,
    posts: posts.map((p) => ({
      slug: `/${section}/${p.slug}`,
      frontmatter: p.frontmatter,
    })),
    title: indexPage?.frontmatter.title ?? section,
    subtitle: indexPage?.frontmatter.subtitle,
    showYear: indexPage?.frontmatter.showYear ?? false,
  }
}

export function meta({ data }: Route.MetaArgs) {
  const title = data?.title ?? 'Posts'
  return [
    { title: `Josiah Wiebe – ${title}` },
    { name: 'description', content: data?.subtitle ?? '' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: data?.subtitle ?? '' },
    { property: 'og:image', content: `/api/og?title=${encodeURIComponent(title)}` },
  ]
}

/**
 * Dynamic section index page (blog, archive, logbook).
 */
export default function SectionIndex({ loaderData }: Route.ComponentProps) {
  const { posts, title, subtitle, showYear } = loaderData

  return (
    <>
      <header className="page-header">
        <h1 className="text-2xl font-heading font-bold dark:text-slate-300">{title}</h1>
        {subtitle && (
          <p className="text-slate-700 dark:text-slate-600 text-md">{subtitle}</p>
        )}
      </header>
      <PostList posts={posts} showYear={showYear} />
    </>
  )
}
