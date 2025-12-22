import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { createHighlighter, type Highlighter } from 'shiki'
import { visit } from 'unist-util-visit'
import type { Root, Element, Text } from 'hast'

// Singleton highlighter instance
let highlighter: Highlighter | null = null

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['nord'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'html',
        'css',
        'json',
        'yaml',
        'markdown',
        'bash',
        'shell',
        'php',
        'python',
        'sql',
        'rust',
        'go',
      ],
    })
  }
  return highlighter
}

/**
 * Custom remark plugin to handle figure syntax (^^^ fences with optional captions).
 *
 * Input:
 * ```
 * ^^^
 * ![alt](src)
 * ^^^ This is a caption
 * ```
 *
 * Output:
 * ```html
 * <figure>
 *   <img src="src" alt="alt" />
 *   <figcaption>This is a caption</figcaption>
 * </figure>
 * ```
 */
function remarkFigure() {
  return (tree: import('mdast').Root) => {
    const { visit } = require('unist-util-visit')

    visit(tree, 'paragraph', (node: import('mdast').Paragraph, index: number | undefined, parent: import('mdast').Parent | undefined) => {
      if (!parent || index === undefined) return

      const text = node.children
        .filter((c): c is import('mdast').Text => c.type === 'text')
        .map((c) => c.value)
        .join('')

      // Check if this paragraph starts a figure block
      if (!text.trim().startsWith('^^^')) return

      // Find the closing ^^^ and extract content
      const siblings = parent.children.slice(index)
      let figureContent: import('mdast').RootContent[] = []
      let caption = ''
      let endIndex = index

      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i]

        if (sibling?.type === 'paragraph') {
          const siblingText = sibling.children
            .filter((c): c is import('mdast').Text => c.type === 'text')
            .map((c) => c.value)
            .join('')

          // Check for closing ^^^ with optional caption
          const closingMatch = siblingText.match(/^\^\^\^\s*(.*)$/)
          if (closingMatch && i > 0) {
            caption = closingMatch[1]?.trim() ?? ''
            endIndex = index + i
            break
          }

          // Skip opening ^^^
          if (i === 0 && siblingText.trim() === '^^^') {
            continue
          }

          figureContent.push(sibling)
        } else if (sibling) {
          figureContent.push(sibling)
        }
      }

      // If we found a proper figure block, mark it for processing
      // The actual HTML transformation happens in rehype
      if (figureContent.length > 0) {
        // For now, we'll handle this more simply by transforming in rehype
        // This is a placeholder that preserves the structure
      }
    })
  }
}

/**
 * Custom remark plugin to handle container syntax (::: blocks).
 *
 * Input:
 * ```
 * :::image-half
 * content
 * :::
 * ```
 *
 * Output:
 * ```html
 * <div class="image-half">content</div>
 * ```
 */
function remarkContainer() {
  return (tree: import('mdast').Root) => {
    // This will be handled in a simpler way - we'll process the raw markdown
    // before parsing, or handle it in rehype
  }
}

/**
 * Rehype plugin for syntax highlighting with Shiki.
 */
function rehypeShiki(highlighterInstance: Highlighter) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return

      const codeNode = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'code'
      )

      if (!codeNode) return

      const className = codeNode.properties?.className
      const langClass = Array.isArray(className)
        ? className.find((c): c is string => typeof c === 'string' && c.startsWith('language-'))
        : undefined
      const lang = langClass?.replace('language-', '') ?? 'text'

      const code = codeNode.children
        .filter((c): c is Text => c.type === 'text')
        .map((c) => c.value)
        .join('')

      try {
        const loadedLangs = highlighterInstance.getLoadedLanguages()
        const langToUse = loadedLangs.includes(lang as typeof loadedLangs[number]) ? lang : 'text'

        const html = highlighterInstance.codeToHtml(code, {
          lang: langToUse,
          theme: 'nord',
        })

        // Replace the pre node with the highlighted HTML
        // Parse the HTML and replace the node
        node.tagName = 'div'
        node.properties = { className: ['shiki-wrapper'] }
        node.children = [
          {
            type: 'raw',
            value: html,
          } as unknown as Element,
        ]
      } catch {
        // Keep original on error
      }
    })
  }
}

/**
 * Pre-process markdown to handle figure syntax before parsing.
 * Converts ^^^ blocks to HTML figures.
 */
function preprocessFigures(markdown: string): string {
  // Match ^^^ blocks: ^^^ \n content \n ^^^ optional caption
  const figureRegex = /\^\^\^\s*\n([\s\S]*?)\n\^\^\^\s*([^\n]*)/g

  return markdown.replace(figureRegex, (_, content: string, caption: string) => {
    const trimmedCaption = caption.trim()
    const figcaptionHtml = trimmedCaption ? `<figcaption>${trimmedCaption}</figcaption>` : ''

    return `<figure>\n\n${content.trim()}\n\n${figcaptionHtml}</figure>`
  })
}

/**
 * Pre-process markdown to handle container syntax before parsing.
 * Converts ::: blocks to div elements with classes.
 */
function preprocessContainers(markdown: string): string {
  // Match ::: blocks: :::class-name \n content \n :::
  const containerRegex = /:::(\S*)\s*\n([\s\S]*?)\n:::/g

  return markdown.replace(containerRegex, (_, className: string, content: string) => {
    const classAttr = className ? ` class="${className}"` : ''
    return `<div${classAttr}>\n\n${content.trim()}\n\n</div>`
  })
}

/**
 * Convert markdown to HTML with syntax highlighting and custom extensions.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const hl = await getHighlighter()

  // Pre-process custom syntax
  let processed = preprocessFigures(markdown)
  processed = preprocessContainers(processed)

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'prepend',
      properties: {
        className: ['heading-permalink'],
        ariaHidden: true,
        tabIndex: -1,
      },
      content: {
        type: 'text',
        value: '#',
      },
    })
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
      properties: { className: ['external-link'] },
    })
    .use(() => rehypeShiki(hl))
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processed)

  return String(result)
}
