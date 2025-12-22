import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { getPost } from '~/lib/posts.server'
import { markdownToHtml } from '~/lib/markdown.server'
import LastFmStats from '~/lastfm/app'
import type { Route } from './+types/lastfm'

export async function loader({}: Route.LoaderArgs) {
  const post = await getPost('playground', 'lastfm')

  if (!post) {
    throw new Response('Not Found', { status: 404 })
  }

  const html = await markdownToHtml(post.content)

  return {
    title: post.frontmatter.title,
    subtitle: post.frontmatter.subtitle,
    excerpt: post.frontmatter.excerpt,
    html,
  }
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.title ?? 'Last.fm Stats'} | JWWW` },
    { name: 'description', content: data?.excerpt ?? 'Calculate your Last.fm listening statistics' },
  ]
}

/**
 * Last.fm stats playground route.
 * Loads markdown content and wraps the LastFM app with NuqsAdapter for query state.
 * Uses col-span-full to break out of the two-column grid layout.
 */
export default function LastFmPage({ loaderData }: Route.ComponentProps) {
  const { title, subtitle, html } = loaderData

  return (
    <div className="col-span-full">
      <header className="page-header react-app">
        <h1 className="text-2xl font-heading font-bold dark:text-slate-300">{title}</h1>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-600 text-md">{subtitle}</p>
        )}
      </header>
      <article className="mt-8">
        <div className="prose mb-12 max-w-none dark:text-slate-400" dangerouslySetInnerHTML={{ __html: html }} />
        <NuqsAdapter>
          <LastFmStats />
        </NuqsAdapter>
      </article>
    </div>
  )
}
