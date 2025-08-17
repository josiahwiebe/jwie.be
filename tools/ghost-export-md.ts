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

// ---- helpers ----
const sha1 = (buf: Uint8Array | string) => crypto.createHash('sha1').update(buf).digest('hex');

// Convert Ghost HTML back to CommonMark format
function htmlToCommonMark(html: string): string {
  let processed = html;

  // First handle grid layouts before converting individual figures
  // Convert grid layouts back to :::image-half containers
  processed = processed.replace(
    /<div[^>]+style="[^"]*display\s*:\s*grid[^"]*grid-template-columns\s*:\s*1fr\s+1fr[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, content) => {
      // Extract figures from the grid content
      const figureMatches = content.match(/<figure[^>]*>[\s\S]*?<\/figure>/gi) || [];
      if (figureMatches.length === 0) return _m; // Return original if no figures found

      let result = ':::image-half\n';
      
      // First, collect all captions and split by |
      const allCaptions: string[] = [];
      figureMatches.forEach(figureHtml => {
        const figureMatch = figureHtml.match(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<figcaption[^>]*>([^<]+)<\/figcaption>\s*<\/figure>/i);
        if (figureMatch) {
          const [, , , caption] = figureMatch;
          allCaptions.push(caption.trim());
        }
      });
      
      // Split the first caption by | if it exists
      const splitCaptions = allCaptions.length > 0 ? allCaptions[0].split('|').map(c => c.trim()) : [];
      
      figureMatches.forEach((figureHtml, index) => {
        // Convert each figure to CommonMark format
        const figureMatch = figureHtml.match(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<figcaption[^>]*>([^<]+)<\/figcaption>\s*<\/figure>/i);
        if (figureMatch) {
          const [, src, alt] = figureMatch;
          const caption = splitCaptions[index] || '';
          if (caption) {
            result += `![${alt}](${src})\n^^^ ${caption}`;
          } else {
            result += `![${alt}](${src})`;
          }
        } else {
          // Handle images without captions in grid
          const imgMatch = figureHtml.match(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>/i);
          if (imgMatch) {
            const [, src, alt] = imgMatch;
            result += `![${alt}](${src})`;
          }
        }
        // Add newline after each image
        result += '\n';
      });
      result += ':::';
      return result;
    }
  );

  // Handle consecutive figures - assume they should be :::image-half
  // Convert pairs of consecutive <figure> elements to :::image-half
  processed = processed.replace(
    /(<figure[^>]*class="[^"]*kg-card[^"]*"[^>]*>[\s\S]*?<\/figure>)\s*(<figure[^>]*class="[^"]*kg-card[^"]*"[^>]*>[\s\S]*?<\/figure>)/gi,
    (match, figure1, figure2) => {
      const convertFigure = (figureHtml: string, captionIndex: number, allCaptions: string[]) => {
        // Match Ghost's HTML structure: src comes before alt in the img tag
        const figureMatch = figureHtml.match(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<figcaption[^>]*>([^<]+)<\/figcaption>\s*<\/figure>/i);
        if (figureMatch) {
          const [, src, alt, rawCaption] = figureMatch;
          // If this is the first figure, split the caption by |
          const splitCaptions = captionIndex === 0 ? rawCaption.split('|').map(c => c.trim()) : allCaptions;
          const caption = splitCaptions[captionIndex] || '';
          
          if (caption) {
            return `![${alt}](${src})\n^^^ ${caption}`;
          } else {
            return `![${alt}](${src})`;
          }
        }
        // Handle images without captions
        const imgMatch = figureHtml.match(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<\/figure>/i);
        if (imgMatch) {
          const [, src, alt] = imgMatch;
          return `![${alt}](${src})`;
        }
        return null;
      };

      // First get the caption from the first figure to split
      const firstFigureMatch = figure1.match(/<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<figcaption[^>]*>([^<]+)<\/figcaption>\s*<\/figure>/i);
      const allCaptions = firstFigureMatch ? firstFigureMatch[3].split('|').map(c => c.trim()) : [];

      const converted1 = convertFigure(figure1, 0, allCaptions);
      const converted2 = convertFigure(figure2, 1, allCaptions);

      if (converted1 && converted2) {
        // Create the final :::image-half block directly
        return `:::image-half\n${converted1}\n${converted2}\n:::`;
      }

      // If conversion failed, fall back to individual figure processing
      return match;
    }
  );

  // Then convert remaining standalone <figure><img><figcaption> back to ![]()\n^^^ caption format
  processed = processed.replace(
    /<figure[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?\s*>\s*<figcaption[^>]*>([^<]+)<\/figcaption>\s*<\/figure>/gi,
    (_m, src, alt, caption) => `![${alt}](${src})\n^^^ ${caption.trim()}`
  );

  return processed;
}

function extFrom(u: string, def = 'jpg') {
  try {
    const m = new URL(u).pathname.match(/\.(avif|webp|png|jpe?g|gif|bmp|svg)$/i);
    return (m ? m[1].toLowerCase() : def).replace('jpeg','jpg');
  } catch { return def; }
}

async function download(u: string): Promise<Uint8Array> {
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return new Uint8Array(await r.arrayBuffer());
}
function collectImageUrls(html?: string, feature?: string | null) {
  const urls = new Set<string>();
  if (feature && /^https?:\/\//.test(feature)) urls.add(feature);
  if (!html) return [...urls];
  const root = parse(html);
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && /^https?:\/\//.test(src)) urls.add(src);
  });
  return [...urls];
}
async function downloadAndRewriteImages(html?: string, feature?: string | null, postSlug?: string) {
  const manifest: Record<string,string> = {};
  for (const u of collectImageUrls(html, feature)) {
    try {
      const url = new URL(u);

      // Check if this is already pointing to our organized structure
      if (url.hostname === 'jwie.be' && url.pathname.startsWith('/img/') && postSlug) {
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
            // Handle specific cases like vercel-og for using-vercel-og-without-nextjs
            ...(postSlug.includes('vercel-og') ? ['vercel-og'] : []),
            ...(postSlug.includes('keychron') ? ['keychron-k3'] : [])
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

// ---- fetch posts only ----
interface GhostTag { slug: string }
interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string|null;
  published_at?: string|null;
  updated_at?: string|null;
  status?: 'draft' | 'published';
  tags?: GhostTag[]
}
interface BrowseResp { posts: GhostPost[]; meta: any }

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
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
      const response = await (api as any).posts.browse({
        limit: 50,
        page: page,
        include: 'tags,authors',
        formats: ['html']
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
    // We ignore tags and pages; everything from Ghost is a blog post
    const { html, feature } = await downloadAndRewriteImages(p.html, p.feature_image, p.slug);

    // Convert Ghost HTML back to CommonMark format before converting to markdown
    const processedHtml = html ? htmlToCommonMark(html) : '';
    const mdBody = nhm.translate(processedHtml);

    // Post-process to fix escaped markdown and clean up formatting
    const fixedMdBody = mdBody
      // Fix escaped markdown
      .replace(/!\\?\[([^\]]*)\]\\?\(([^)]+)\)/g, '![$1]($2)')
      // Fix escaped brackets and parentheses
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      // Fix standalone images with captions that got collapsed to one line
      .replace(/!\[([^\]]*)\]\(([^)]+)\)\s+\^\^\^\s+([^\n]+)/g, '![$1]($2)\n^^^ $3')
      // Fix :::image-half blocks that are on one line by adding proper newlines
      .replace(/:::image-half\s+([^:]+?)\s*:::/g, (match, content) => {
        // More sophisticated parsing of image-half content
        let result = ':::image-half\n';
        
        // Match image + optional caption pattern
        const imageWithCaptionPattern = /!\[[^\]]*\]\([^)]+\)(?:\s*\n?\s*\^\^\^[^\n!]*)?/g;
        const parts = content.match(imageWithCaptionPattern) || [];
        
        parts.forEach(part => {
          // Clean up and ensure proper formatting
          const cleanPart = part.trim().replace(/\s+/g, ' ');
          
          // If it has a caption, make sure it's on separate lines
          if (cleanPart.includes('^^^')) {
            const imgMatch = cleanPart.match(/(!\[[^\]]*\]\([^)]+\))\s+\^\^\^\s*(.+)/);
            if (imgMatch) {
              result += imgMatch[1] + '\n^^^ ' + imgMatch[2].trim() + '\n';
            } else {
              result += cleanPart + '\n';
            }
          } else {
            result += cleanPart + '\n';
          }
        });
        
        result += ':::';
        return result;
      });
    const fm = {
      title: p.title,
      slug: p.slug,
      date: p.published_at || undefined,
      updated: p.updated_at || undefined,
      excerpt: p.custom_excerpt || "",
      feature_image: feature || null,
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