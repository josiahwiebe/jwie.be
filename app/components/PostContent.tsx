interface PostContentProps {
  title: string
  date?: string
  subtitle?: string
  html: string
}

/**
 * Renders a single post with title, date, and markdown content.
 */
export function PostContent({ title, date, subtitle, html }: PostContentProps) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <>
      <header className="page-header">
        <h1 className="text-2xl font-heading font-bold dark:text-slate-300">{title}</h1>
        {formattedDate && (
          <time className="text-slate-700 dark:text-slate-600 text-md block mt-2">
            {formattedDate}
          </time>
        )}
        {subtitle && (
          <p className="text-slate-700 italic dark:text-slate-600 text-md mt-1">{subtitle}</p>
        )}
      </header>

      <article className="page-content">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </>
  )
}
