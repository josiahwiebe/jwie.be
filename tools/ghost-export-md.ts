#!/usr/bin/env bun
/**
 * Export Ghost posts → Markdown for content/blog only.
 * - Uses Ghost ADMIN API (includes draft posts)
 * - Downloads referenced images to public/img/<post-slug>/ (organized by post)
 * - Rewrites <img> src and feature_image to /img/<post-slug>/<filename>
 * - Writes files to content/blog/<slug>.md with YAML front‑matter
 * - Properly handles draft/published status
 * - Uses meaningful filenames when possible, falls back to hash
 *
 * Env:
 *   GHOST_URL, GHOST_ADMIN_KEY
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { parse } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import GhostAdminAPI from '@tryghost/admin-api';

const GHOST_URL = process.env.GHOST_URL!;
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY!;

if (!GHOST_URL || !GHOST_ADMIN_KEY) {
  console.error('Set GHOST_URL and GHOST_ADMIN_KEY');
  process.exit(1);
}

const OUT_CONTENT = path.join(process.cwd(), 'content');
const OUT_BLOG = path.join(OUT_CONTENT, 'blog');
const OUT_IMG = path.join(process.cwd(), 'public', 'img');
fs.mkdirSync(OUT_BLOG, { recursive: true });
fs.mkdirSync(OUT_IMG, { recursive: true });

const sha1 = (buf: Uint8Array | string) => crypto.createHash('sha1').update(buf).digest('hex');

// Process lexical content to handle video blocks and preserved markdown
function processLexicalContent(lexicalStr?: string): { videos: Array<{src: string, caption: string, alt: string}>, markdownBlocks: string[] } {
  const videos: Array<{src: string, caption: string, alt: string}> = [];
  const markdownBlocks: string[] = [];

  if (!lexicalStr) return { videos, markdownBlocks };

  try {
    const lexical = JSON.parse(lexicalStr);

    function processNode(node: any) {
      // Handle video blocks
      if (node.type === 'video') {
        videos.push({
          src: node.src || '',
          caption: node.caption || '',
          alt: node.alt || node.fileName || ''
        });
      }

      // Handle code blocks that might contain preserved markdown (both 'code' and 'codeblock' types)
      // We're using this to support :::image-half blocks that contain videos (workaround since Ghost doesn't support videos in galleries)
      if ((node.type === 'code' || node.type === 'codeblock') && node.language === 'markdown') {
        markdownBlocks.push(node.code || '');
      }

      // Recursively process children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    }

    if (lexical?.root?.children) {
      lexical.root.children.forEach(processNode);
    }
  } catch (e) {
    console.error('Error processing lexical content:', e);
  }

  return { videos, markdownBlocks };
}

// Pre-process Ghost HTML to handle special elements before markdown conversion
function preprocessGhostHtml(html: string): { html: string; placeholders: Record<string, string> } {
  const doc = parse(html);
  const nhm = new NodeHtmlMarkdown();
  const placeholders: Record<string, string> = {};

  // Process Ghost gallery cards first (these become :::image-half blocks)
  const galleryCards = doc.querySelectorAll('figure.kg-gallery-card');
  galleryCards.forEach((figure, index) => {
    const images = figure.querySelectorAll('img');
    if (images.length === 0) return;

    // Extract and convert gallery caption to markdown if it exists
    const figcaption = figure.querySelector('figcaption');
    let galleryCaption = '';
    if (figcaption) {
      // Convert caption HTML to markdown to preserve formatting
      galleryCaption = nhm.translate(figcaption.innerHTML).trim();
    }

    // Split caption by | for individual images
    const splitCaptions = galleryCaption ? galleryCaption.split('|').map(c => c.trim()) : [];

    let result = ':::image-half\n';

    images.forEach((img, imgIndex) => {
      // Start each image block with ^^^
      result += '^^^\n';

      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      result += `![${alt}](${src})\n`;

      // Add caption if exists (this also serves as the closing ^^^)
      const caption = splitCaptions[imgIndex] || '';
      if (caption) {
        result += `^^^ ${caption}\n`;
      } else {
        // No caption, but we still need the closing ^^^
        result += '^^^\n';
      }
    });

    result += ':::';

    // Create a unique placeholder
    const placeholder = `GHOSTGALLERY${index}`;
    placeholders[placeholder] = result;

    // Replace the figure with a paragraph containing the placeholder to preserve spacing
    const placeholderNode = parse(`<p>${placeholder}</p>`);
    figure.replaceWith(placeholderNode);
  });

  // Process standalone image cards with captions
  const imageFigures = doc.querySelectorAll('figure.kg-image-card');
  imageFigures.forEach((figure, index) => {
    const img = figure.querySelector('img');
    if (!img) return;

    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const figcaption = figure.querySelector('figcaption');

    let result: string;
    if (figcaption) {
      // Convert caption HTML to markdown to preserve formatting
      const captionMarkdown = nhm.translate(figcaption.innerHTML).trim();
      result = `^^^\n![${alt}](${src})\n^^^ ${captionMarkdown}`;
    } else {
      // No caption, just the image
      result = `![${alt}](${src})`;
    }

    // Create a unique placeholder
    const placeholder = `GHOSTIMAGE${index}`;
    placeholders[placeholder] = result;

    // Replace the figure with a paragraph containing the placeholder to preserve spacing
    const placeholderNode = parse(`<p>${placeholder}</p>`);
    figure.replaceWith(placeholderNode);
  });

  // Process markdown code blocks (preserved :::image-half blocks)
  const codeBlocks = doc.querySelectorAll('pre code.language-markdown');
  codeBlocks.forEach((code, index) => {
    const markdownContent = code.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Create a unique placeholder for this markdown content
    const placeholder = `GHOSTMARKDOWN${index}`;
    placeholders[placeholder] = markdownContent;

    // Replace the entire pre block with a simple text node containing the placeholder
    const preElement = code.closest('pre');
    if (preElement) {
      const placeholderNode = parse(placeholder);
      preElement.replaceWith(placeholderNode);
    }
  });

  return { html: doc.toString(), placeholders };
}

function extFrom(url: string, defaultExt = 'jpg') {
  try {
    const m = new URL(url).pathname.match(/\.(avif|webp|png|jpe?g|gif|bmp|svg|mp4|webm|mov)$/i);
    return (m ? m[1].toLowerCase() : defaultExt).replace('jpeg','jpg');
  } catch { return defaultExt; }
}

async function download(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}
function collectImageUrls(html?: string, feature?: string | null, videos?: Array<{src: string}>) {
  const urls = new Set<string>();
  if (feature && /^https?:\/\//.test(feature)) urls.add(feature);
  if (!html) return [...urls];
  const root = parse(html);
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && /^https?:\/\//.test(src)) urls.add(src);
  });
  // Add video URLs
  if (videos) {
    videos.forEach(video => {
      if (video.src && /^https?:\/\//.test(video.src)) urls.add(video.src);
    });
  }
  return [...urls];
}

async function downloadAndRewriteImages(html?: string, feature?: string | null, postSlug?: string, videos?: Array<{src: string}>) {
  const manifest: Record<string,string> = {};
  for (const u of collectImageUrls(html, feature, videos)) {
    try {
      const url = new URL(u);

      // Check if this is already pointing to our organized structure
      if ((url.hostname === 'jwie.be' || url.hostname === 'jwww.me') && url.pathname.startsWith('/img/') && postSlug) {
        const pathParts = url.pathname.split('/');
        if (pathParts.length >= 4 && pathParts[2] === postSlug) {
          // This image is already in our organized structure, check if it exists locally
          const localPath = path.join(OUT_IMG, ...pathParts.slice(2));
          if (fs.existsSync(localPath)) {
            // File already exists, just use the existing path
            manifest[u] = url.pathname;
            continue;
          }

          // Check if there's a similar file without hash suffix
          const postDir = path.join(OUT_IMG, postSlug);
          if (fs.existsSync(postDir)) {
            const requestedFile = path.basename(url.pathname);
            const files = fs.readdirSync(postDir);

            // Try to find a matching file by removing hash suffix pattern
            const baseName = requestedFile.replace(/-[a-f0-9]{8}(\.[^.]+)$/, '$1');
            const matchingFile = files.find(f => f === baseName);

            if (matchingFile) {
              manifest[u] = `/img/${postSlug}/${matchingFile}`;
              continue;
            }
          }

          // Try alternative directory names (in case of manual organization)
          const alternativeDirs = [
            postSlug.replace(/-/g, ''),
            postSlug.split('-')[0],
            postSlug.split('-').slice(-1)[0],
          ];

          for (const altSlug of alternativeDirs) {
            const altDir = path.join(OUT_IMG, altSlug);
            if (fs.existsSync(altDir)) {
              const requestedFile = path.basename(url.pathname);
              const files = fs.readdirSync(altDir);

              // Try exact match first
              if (files.includes(requestedFile)) {
                manifest[u] = `/img/${altSlug}/${requestedFile}`;
                continue;
              }

              // Try removing hash suffix
              const baseName = requestedFile.replace(/-[a-f0-9]{8}(\.[^.]+)$/, '$1');
              const matchingFile = files.find(f => f === baseName);

              if (matchingFile) {
                manifest[u] = `/img/${altSlug}/${matchingFile}`;
                continue;
              }
            }
          }
        }
      }

      const buf = await download(u);
      const hash = sha1(buf).slice(0,16);
      const ext = extFrom(u);

      // Organize images by post slug if provided
      if (postSlug) {
        const postDir = path.join(OUT_IMG, postSlug);
        fs.mkdirSync(postDir, { recursive: true });

        // Try to use a meaningful filename from the URL, fallback to hash
        const urlPath = url.pathname;
        const originalName = path.basename(urlPath, path.extname(urlPath));
        const cleanName = originalName.replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');

        let fname: string;
        let dest: string;

        // If we have a clean name and it's not just numbers/hash, use it
        if (cleanName && cleanName.length > 3 && !/^[0-9a-f]+$/.test(cleanName)) {
          fname = `${cleanName}.${ext}`;
          dest = path.join(postDir, fname);

          // If file exists with this name, append hash
          if (fs.existsSync(dest)) {
            fname = `${cleanName}-${hash.slice(0,8)}.${ext}`;
            dest = path.join(postDir, fname);
          }
        } else {
          // Fallback to hash-based naming
          fname = `${hash}.${ext}`;
          dest = path.join(postDir, fname);
        }

        if (!fs.existsSync(dest)) await fsp.writeFile(dest, buf);
        manifest[u] = `/img/${postSlug}/${fname}`;
      } else {
        // Fallback to old behavior for backward compatibility
        const fname = `${hash}.${ext}`;
        const dest = path.join(OUT_IMG, fname);
        if (!fs.existsSync(dest)) await fsp.writeFile(dest, buf);
        manifest[u] = `/img/${fname}`;
      }
    } catch (e:any) {
      console.error('img fail:', u, e?.message || String(e));
    }
  }
  const rewrite = (s: string) => s.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (_m,a,src,b) => manifest[src] ? `${a}${manifest[src]}${b}` : _m);
  return {
    html: html ? rewrite(html) : html,
    feature: feature && manifest[feature] ? manifest[feature] : feature ?? null,
  };
}

interface GhostTag { slug: string }
interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html?: string;
  lexical?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string|null;
  published_at?: string|null;
  updated_at?: string|null;
  status?: 'draft' | 'published';
  tags?: GhostTag[]
}

const api = new (GhostAdminAPI as any)({
  url: GHOST_URL,
  key: GHOST_ADMIN_KEY,
  version: 'v6.0'
});

async function fetchAllPosts(): Promise<GhostPost[]> {
  const allPosts: GhostPost[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await api.posts.browse({
        limit: 50,
        page: page,
        include: 'tags,authors',
        formats: ['html', 'lexical']
      });

      const posts = response || [];
      allPosts.push(...posts);

      // Check if there are more pages
      hasMore = posts.length === 50;
      page++;
    } catch (error) {
      console.error(`Error fetching posts on page ${page}:`, error);
      break;
    }
  }

  return allPosts;
}

(async () => {
  const nhm = new NodeHtmlMarkdown();
  const posts = await fetchAllPosts();
  let changed = 0;

  for (const p of posts) {
    // Process lexical content first to extract videos and preserved markdown
    const { videos, markdownBlocks } = processLexicalContent(p.lexical);

    // We ignore tags and pages; everything from Ghost is a blog post
    const { html, feature } = await downloadAndRewriteImages(p.html, p.feature_image, p.slug, videos);

    // Pre-process Ghost HTML to handle special elements, then convert to markdown
    const { html: preprocessedHtml, placeholders } = html ? preprocessGhostHtml(html) : { html: '', placeholders: {} };
    let mdBody = preprocessedHtml ? nhm.translate(preprocessedHtml) : '';

    // Restore placeholders after markdown conversion
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Add standalone videos from lexical as markdown (but skip if they're already in preserved markdown blocks)
    videos.forEach((video, index) => {
      // Check if this video is already part of a preserved markdown block
      const isInMarkdownBlock = markdownBlocks.some(block =>
        block.includes(video.src) || block.includes(`<video src="${video.src}"`)
      );

      if (!isInMarkdownBlock) {
        const videoPlaceholder = `LEXICALVIDEO${index}`;
        const videoMarkdown = video.caption
          ? `![${video.alt}](${video.src})\n^^^ ${video.caption}`
          : `![${video.alt}](${video.src})`;

        // Add video placeholder to placeholders for restoration
        placeholders[videoPlaceholder] = videoMarkdown;
        mdBody += `\n\n${videoPlaceholder}\n`;
      }
    });

    // Restore all placeholders including the preserved markdown
    Object.keys(placeholders).forEach(placeholder => {
      mdBody = mdBody.replace(placeholder, placeholders[placeholder]);
    });

    // Remove any remaining fenced markdown code blocks that weren't replaced
    mdBody = mdBody.replace(/```markdown\n([\s\S]*?)\n```/g, '$1');

    // Post-process to fix NodeHtmlMarkdown's quirks
    const fixedMdBody = mdBody
      // Fix URL encoding of underscores (NodeHtmlMarkdown encodes them)
      .replace(/%5F/g, '_')
      // Fix escaped periods after numbers (NodeHtmlMarkdown escapes them)
      .replace(/(\d)\\\./g, '$1.')
      .replace(/\\-/g, '-')
      .replace(/https?:\/\/ghost\.burwal\.de\//g, '/');

    const fm = {
      title: p.title,
      slug: p.slug,
      ...(p.published_at ? { date: p.published_at } : {}),
      ...(p.updated_at ? { updated: p.updated_at } : {}),
      excerpt: p.custom_excerpt || "",
      ...(feature ? { feature_image: feature } : {}),
      published: p.status === 'published',
    } as const;

    const outPath = path.join(OUT_BLOG, `${p.slug}.md`);

    const file = matter.stringify(fixedMdBody.trim() + '\n', fm as any);

    const prev = fs.existsSync(outPath) ? await fsp.readFile(outPath, 'utf8') : '';
    if (prev !== file) { await fsp.writeFile(outPath, file); changed++; }
  }

  const totalPosts = posts.length;
  const published = posts.filter(p => p.status === 'published').length;

  console.log(`Exported ${changed} changed files to content/blog`);
  console.log(`Total posts processed: ${totalPosts} (${published} published)`);
})().catch(err => { console.error(err); process.exit(1); });