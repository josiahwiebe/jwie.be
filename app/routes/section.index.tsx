import { getAllPosts, getIndexPage } from '~/lib/posts.server'
import { PostList } from '~/components/PostList'
import type { Route } from './+types/section.index'

const VALID_SECTIONS = ['blog', 'archive', 'logbook'] as const
type Section = (typeof VALID_SECTIONS)[number]

/**
 * Extract section from URL path (e.g., /blog -> blog).
 */
function getSectionFromUrl(url: string): Section | null {
  const pathname = new URL(url).pathname
  const segment = pathname.split('/')[1] as Section
  return VALID_SECTIONS.includes(segment) ? segment : null
}

/**
 * Loader for dynamic section index pages (blog, archive, logbook).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const section = getSectionFromUrl(request.url)

  if (!section) {
    throw new Response('Not Found', { status: 404 })
  }

  const [posts, indexPage] = await Promise.all([
    getAllPosts(section),
    getIndexPage(section),
  ])

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
  return [
    { title: `Josiah Wiebe – ${data?.title ?? 'Posts'}` },
    { name: 'description', content: data?.subtitle ?? '' },
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
