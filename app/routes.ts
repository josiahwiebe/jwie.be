import { type RouteConfig, index, route, prefix } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  // Section routes (blog, archive, logbook)
  ...['blog', 'archive', 'logbook'].flatMap((section) =>
    prefix(section, [
      index('routes/section.index.tsx', { id: `${section}-index` }),
      route(':slug', 'routes/section.post.tsx', { id: `${section}-post` }),
    ])
  ),

  // Playground routes
  ...prefix('playground', [
    index('routes/playground/index.tsx'),
    route('lastfm', 'routes/playground/lastfm.tsx'),
    route(':slug', 'routes/playground/post.tsx'),
  ]),

  // Static pages
  route(':slug', 'routes/page.tsx'),
] satisfies RouteConfig
