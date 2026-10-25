// Checks every page before it ships: links, head tags, structured data and the sitemap.
// Run from the repo root: node scripts/check.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.cwd();
const SITE = 'https://nurah-kamal.github.io';
const problems = [];
const fail = (page, msg) => problems.push(`${page}: ${msg}`);

const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'scripts') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p.slice(root.length + 1).replaceAll('\\', '/'));
  }
})(root);

const attr = (html, re) => (html.match(re) || [])[1];
const toFile = (url) => {
  const path = url.split('#')[0].split('?')[0];
  if (!path) return null;
  const f = join(root, path);
  return path.endsWith('/') ? join(f, 'index.html') : f;
};

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const is404 = page === '404.html';
  const title = attr(html, /<title>([^<]*)<\/title>/);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  if (!title) fail(page, 'no <title>');
  else if (!is404 && (title.length < 30 || title.length > 60)) fail(page, `title is ${title.length} characters (30 to 60)`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(page, 'needs exactly one <h1>');
  if (!/<html lang="en-ZA">/.test(html)) fail(page, 'missing lang="en-ZA"');

  if (!is404) {
    const plainDesc = desc && desc.replaceAll('&amp;', '&');
    if (!plainDesc) fail(page, 'no meta description');
    else if (plainDesc.length < 140 || plainDesc.length > 160) fail(page, `description is ${plainDesc.length} characters (140 to 160)`);
    const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
    const expected = `${SITE}/${page.replace(/index\.html$/, '')}`;
    if (canonical !== expected) fail(page, `canonical is ${canonical}, expected ${expected}`);
    if (attr(html, /property="og:url" content="([^"]*)"/) !== expected) fail(page, 'og:url does not match the canonical');
    const img = attr(html, /property="og:image" content="([^"]*)"/);
    if (!img || !existsSync(toFile(img.replace(SITE, '')))) fail(page, 'og:image file is missing');

    for (const block of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
      try {
        const data = JSON.parse(block.replace(/<\/?script[^>]*>/g, ''));
        const pageNode = (data['@graph'] || [data]).find((n) => ['WebPage', 'ProfilePage'].includes(n['@type']));
        if (pageNode && pageNode.name !== title) fail(page, 'structured data name differs from the title');
        if (pageNode && plainDesc && pageNode.description !== plainDesc) fail(page, 'structured data description differs from the meta description');
      } catch (e) {
        fail(page, `structured data does not parse: ${e.message}`);
      }
    }
  }

  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
    const f = toFile(href);
    if (f && !existsSync(f)) fail(page, `broken link ${href}`);
  }
}

const data = readFileSync('assets/js/projects.js', 'utf8');
for (const [, href] of data.matchAll(/study: '([^']+)'/g)) if (!existsSync(toFile(href))) fail('projects.js', `case study ${href} has no page`);

const sitemap = readFileSync('sitemap.xml', 'utf8');
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) if (!existsSync(toFile(loc.replace(SITE, '')))) fail('sitemap.xml', `${loc} has no page`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${pages.length} pages checked, nothing to fix.`);
