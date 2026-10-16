import { publicData } from "./content.js";
import { esc } from "./util.js";
import { SITE_URL, abs } from "./site.js";

export function robotsTxt(_req, res) {
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`);
}

export async function sitemapXml(_req, res, next) {
  try {
    const { items } = await publicData();
    const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);
    const pages = items.filter((i) => i.slug);
    const newest = pages.reduce((m, i) => (i.updatedAt && i.updatedAt > m ? i.updatedAt : m), "");
    const url = (loc, lastmod, priority, img) => `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${day(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>${img ? `
    <image:image><image:loc>${esc(abs(img.loc))}</image:loc><image:title>${esc(img.title)}</image:title></image:image>` : ""}
  </url>`;
    const body = [
      url(`${SITE_URL}/`, newest, "1.0", { loc: "/assets/img/og-cover.jpg", title: "Thyrocare Lucknow – lab tests at home" }),
      ...pages.map((i) => url(`${SITE_URL}/checkup/${i.slug}`, i.updatedAt, i.type === "profile" ? "0.9" : "0.7",
        i.image ? { loc: i.image, title: `${i.name} – Thyrocare Lucknow` } : null)),
    ].join("\n");
    res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`);
  } catch (e) { next(e); }
}

// www.thyrocarelucknow.com → thyrocarelucknow.com (one address for Google).
export function canonicalHost(req, res, next) {
  const host = req.headers.host || "";
  if (process.env.NODE_ENV === "production" && host.startsWith("www.")) {
    return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
  }
  next();
}

export function notFound(req, res) {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.status(404).type("html").send(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page not found · Thyrocare Lucknow</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f7fb;color:#0b1b33;text-align:center;padding:20px}
a{display:inline-block;margin:8px 4px 0;padding:12px 20px;border-radius:12px;background:#0a4fa3;color:#fff;text-decoration:none;font-weight:700}a.alt{background:#128c4b}</style></head>
<body><div><h1>Sorry, this page doesn't exist</h1><p>It may have moved. These links will help:</p>
<p><a href="/">Home</a><a href="/#profiles">Health checkups</a><a class="alt" href="/#book">Book a home test</a></p></div></body></html>`);
}
