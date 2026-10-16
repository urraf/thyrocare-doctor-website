import { esc } from "./util.js";

// Public address of the site, used for canonical links, sitemap and social previews.
export const SITE_URL = (process.env.SITE_URL || "https://thyrocarelucknow.com").replace(/\/+$/, "");
export const abs = (p) => (!p ? "" : /^https?:\/\//.test(p) ? p : SITE_URL + (p.startsWith("/") ? p : "/" + p));

// Optional search-console verification tags (HTML-tag method), set via environment variables.
export const verifyMeta = () => [
  process.env.GOOGLE_SITE_VERIFICATION && `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}" />`,
  process.env.BING_SITE_VERIFICATION && `<meta name="msvalidate.01" content="${esc(process.env.BING_SITE_VERIFICATION)}" />`,
].filter(Boolean).join("\n  ");

// Shared <head> tags: icons and app manifest.
export const iconLinks = `<link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />`;
