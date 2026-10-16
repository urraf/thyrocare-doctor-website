import "dotenv/config";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { connect, closeDb, getDb, explainDbError } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { renderIndex, PUBLIC_DIR } from "./content.js";
import { renderCheckup } from "./checkup-page.js";
import { robotsTxt, sitemapXml, canonicalHost, notFound } from "./seo.js";
import { authRouter } from "./auth.js";
import { publicRouter } from "./routes-public.js";
import { adminRouter, sweepOrphanMedia } from "./routes-admin.js";

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB connection string.");
  process.exit(1);
}

// Connect in the background and keep retrying, so the server stays up (showing a
// "We'll be right back" page) even if the database is briefly unreachable at start.
let dbReady = false;
async function startDb() {
  for (let attempt = 1; ; attempt++) {
    try {
      await connect(MONGODB_URI, process.env.DB_NAME);
      await seedIfEmpty();
      dbReady = true;
      console.log("✔ Connected to MongoDB");
      sweepOrphanMedia().catch(() => {});
      setInterval(() => sweepOrphanMedia().catch(() => {}), 24 * 60 * 60 * 1000).unref();
      return;
    } catch (e) {
      console.error(`✖ Database connection failed (attempt ${attempt}): ${explainDbError(e)} Retrying in 15 seconds…`);
      await closeDb()?.catch?.(() => {});
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }
}
startDb();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // behind Render/Railway/Nginx: correct client IPs for rate limits

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "blob:"],
      "frame-src": ["https://maps.google.com", "https://www.google.com"],
      "connect-src": ["'self'"],
      "form-action": ["'self'"],
      "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(canonicalHost);
app.get("/robots.txt", robotsTxt);

// ---------- Health check: GET /api/health (for uptime monitors / keep-alive cron jobs) ----------
// 200 = server and database OK, 503 = server up but database unreachable.
// The database ping is cached for 15 s, so frequent checks cost nothing.
const startedAt = Date.now();
let lastPing = { at: 0, ok: false, ms: null };
async function pingDb() {
  if (!dbReady) return { ok: false, ms: null };
  if (Date.now() - lastPing.at < 15_000) return lastPing;
  const t = Date.now();
  try {
    await Promise.race([getDb().command({ ping: 1 }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    lastPing = { at: Date.now(), ok: true, ms: Date.now() - t };
  } catch {
    lastPing = { at: Date.now(), ok: false, ms: null };
  }
  return lastPing;
}
app.get(["/api/health", "/healthz"], async (_req, res) => {
  const db = await pingDb();
  res.set("Cache-Control", "no-store").status(db.ok ? 200 : 503).json({
    status: db.ok ? "ok" : "degraded",
    database: db.ok ? "connected" : dbReady ? "unreachable" : "connecting",
    dbPingMs: db.ms,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    time: new Date().toISOString(),
  });
});

// Until the database is connected: static files work, everything else gets a friendly 503.
const downPage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thyrocare UP166 Lucknow</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f7fb;color:#0b1b33;text-align:center;padding:20px}a{display:inline-block;margin-top:14px;padding:12px 20px;border-radius:12px;background:#128c4b;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><div><h1>We'll be right back</h1><p>Our website is refreshing. Please try again in a minute.</p><a href="https://wa.me/917080014014">WhatsApp us: 70800 14014</a></div></body></html>`;
app.use((req, res, next) => {
  if (dbReady || /\.(css|js|png|jpe?g|webp|svg|ico|woff2?)$/i.test(req.path)) return next();
  res.status(503).set("Retry-After", "15");
  if (req.path.startsWith("/api/")) return res.json({ error: "The website is starting up. Please try again in a minute." });
  res.type("html").send(downPage);
});
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// Home page: admin-editable copy is rendered on the server (fast, SEO-friendly).
let lastDbWarn = 0;
const warnDb = (e) => {
  if (Date.now() - lastDbWarn < 60_000) return; // at most one warning a minute
  lastDbWarn = Date.now();
  console.error("⚠ " + explainDbError(e));
};
const sendHome = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-cache");
    res.type("html").send(await renderIndex());
  } catch (e) {
    warnDb(e);
    res.status(503).set("Retry-After", "30").type("html").send(downPage);
  }
};
app.get("/", sendHome);
app.get("/index.html", (_req, res) => res.redirect(301, "/"));
app.get("/sitemap.xml", sitemapXml);

// One page per health checkup / package
app.get("/checkup/:slug", async (req, res) => {
  try {
    const html = await renderCheckup(String(req.params.slug).toLowerCase().slice(0, 100));
    if (!html) return res.redirect(302, "/#profiles"); // removed or hidden checkup
    res.set("Cache-Control", "no-cache").type("html").send(html);
  } catch (e) {
    warnDb(e);
    res.redirect(302, "/#profiles");
  }
});

// Admin panel (no link anywhere on the public site; not indexed by search engines)
app.use("/admin", (_req, res, next) => { res.set("X-Robots-Tag", "noindex, nofollow"); next(); });
app.get(["/admin", "/admin/"], (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(PUBLIC_DIR, "admin", "index.html"));
});

app.use("/api/admin/auth", authRouter());
app.use("/api/admin", adminRouter());
app.use(publicRouter());

app.use(express.static(PUBLIC_DIR, {
  index: false,
  maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
  // Scripts & styles: browsers re-check them each visit (cheap 304s), so an update never
  // leaves visitors with new HTML and old JavaScript. Images keep the long cache.
  setHeaders: (res, file) => { if (/\.(js|css|html)$/.test(file)) res.setHeader("Cache-Control", "no-cache"); },
}));

// Unknown pages: a real 404 (so Google doesn't index duplicates of the home page).
app.use(notFound);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : err.name === "MulterError" ? 400 : 500);
  if (status >= 500) { if (/Mongo/.test(err?.name)) warnDb(err); else console.error(err); }
  const message = err.code === "LIMIT_FILE_SIZE" ? "File is larger than 8 MB" : status >= 500 ? "Something went wrong, please try again" : err.message;
  res.status(status).json({ error: message });
});

// 0.0.0.0 so hosting platforms (Render, Railway…) can reach the server.
app.listen(PORT, "0.0.0.0", () => console.log(`Thyrocare UP166 site on http://localhost:${PORT}  (admin: /admin)`));
