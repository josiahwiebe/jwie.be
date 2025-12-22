interface PostListItemProps {
  title: string
  slug: string
  date: string
  excerpt?: string
  showYear?: boolean
}

/**
 * Single post item in a list view.
 */
export function PostListItem({ title, slug, date, excerpt, showYear }: PostListItemProps) {
  const formattedDate = showYear
    ? new Date(date).getFullYear().toString()
    : new Date(date).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  return (
    <article className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        {showYear && (
          <time className="text-xs font-bold text-slate-600">{formattedDate}</time>
        )}
        <h2 className="max-w-[80%] text-2xl font-heading font-bold leading-normal sm:text-3xl md:text-3xl">
          <a href={slug}>{title}</a>
        </h2>
        {!showYear && (
          <p className="text-sm text-slate-600">{formattedDate}</p>
        )}
      </div>
      {excerpt && (
        <p className="text-slate-600 dark:text-slate-400">{excerpt}</p>
      )}
      <div className="py-8 md:py-10 lg:py-12">
        <hr className="border-slate-100 dark:border-slate-700" />
      </div>
    </article>
  )
}

interface PostListProps {
  posts: Array<{
    slug: string
    frontmatter: {
      title: string
      date: string
      excerpt?: string
    }
  }>
  showYear?: boolean
}

/**
 * List of posts for index pages.
 */
export function PostList({ posts, showYear }: PostListProps) {
  return (
    <section className="page-content">
      {posts.map((post) => (
        <PostListItem
          key={post.slug}
          title={post.frontmatter.title}
          slug={post.slug}
          date={post.frontmatter.date}
          excerpt={post.frontmatter.excerpt}
          showYear={showYear}
        />
      ))}
    </section>
  )
}
