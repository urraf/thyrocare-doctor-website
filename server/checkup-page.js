import fs from "node:fs";
import path from "node:path";
import { publicData, getSettings, onInvalidate, PUBLIC_DIR } from "./content.js";
import { esc, safeJson, phoneDisplay } from "./util.js";
import { SITE_URL, abs, verifyMeta, iconLinks } from "./site.js";

// One page per health checkup / package: /checkup/<slug>
// Full-page layout (no pop-up), easy to read, shareable on WhatsApp, indexable by Google.

const isProd = process.env.NODE_ENV === "production";
const pages = new Map();
onInvalidate(() => pages.clear());

// Reuse the icons already defined in the home page template.
const ICON_IDS = ["i-phone", "i-wa", "i-check", "i-cal", "i-arrow", "i-shield", "i-award", "i-chev", "i-home", "i-x", "i-pin",
  "h-body", "h-test-tubes", "h-microscope", "h-diabetes-measure", "h-health-worker", "h-female-reproductive-system", "h-tumour"];
let sprite = "";
function loadSprite() {
  const tpl = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8");
  sprite = ICON_IDS.map((id) => (tpl.match(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`)) || [""])[0]).join("");
}
loadSprite();

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
const clip = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[,.;:]$/, "") + "…");
const testsWord = (n) => `${n} test${n === 1 ? "" : "s"}`;

function groupsOf(it) {
  if ((it.groups || []).length) return it.groups;
  if ((it.includes || []).length) return [{ name: "Tests included", count: it.includes.length, items: it.includes }];
  return [];
}

function renderPage(it, all, s) {
  const groups = groupsOf(it);
  const total = it.params || groups.reduce((n, g) => n + (g.count || g.items.length), 0) || null;
  const listed = groups.reduce((n, g) => n + g.items.length, 0);
  const openAll = listed <= 40; // long lists start collapsed so the page stays readable
  const wa = s.whatsapp || (s.phones || [])[0] || "";
  const p1 = (s.phones || [])[0] || wa;
  const waText = encodeURIComponent(it.price
    ? `Hi, I'd like to book ${it.name} (${inr(it.price)}). Please share the details.`
    : `Hi, please share today's rate for ${it.name}. (Sent from your website)`);
  const bookHref = `/?book=${encodeURIComponent(it.id)}#book`;
  const kind = it.type === "profile" ? "Health checkup" : "Jaanch package";
  // Search-friendly title (~60 chars) and description (~155 chars)
  const title = `${it.name}${total ? ` (${total} Tests)` : ""}${it.price ? ` ${inr(it.price)}` : ""} | Thyrocare Lucknow`;
  const descr = clip(`${it.desc || it.tagline || it.name}${/[.!?]$/.test(it.desc || it.tagline || "") ? "" : "."} Home sample collection in Lucknow by Thyrocare UP166, Mansoor Nagar. Book on WhatsApp.`, 158);
  const url = `${SITE_URL}/checkup/${it.slug}`;
  const others = all.filter((x) => x.type === "profile" && x.id !== it.id && x.slug).slice(0, 6);

  const groupHtml = groups.map((g, i) => {
    const n = g.count || g.items.length;
    if (!g.items.length) return `<div class="cu-group cu-group--single"><span class="cu-group__ic">${ic("i-check")}</span><b>${esc(g.name)}</b><em>${esc(testsWord(n))}</em></div>`;
    return `<details class="cu-group"${openAll || i < 2 ? " open" : ""}>
      <summary><span class="cu-group__ic">${ic("h-test-tubes")}</span><b>${esc(g.name)}</b><em>${esc(testsWord(n))}</em>${ic("i-chev")}</summary>
      <ul>${g.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </details>`;
  }).join("");

  const jsonLd = safeJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", "@id": `${url}#product`, name: it.name, description: descr, url, sku: it.code || undefined,
        ...(it.image ? { image: abs(it.image) } : {}), brand: { "@type": "Brand", name: "Thyrocare" },
        category: "Diagnostic health checkup",
        ...(it.price ? { offers: { "@type": "Offer", url, priceCurrency: "INR", price: it.price, availability: "https://schema.org/InStock", seller: { "@id": `${SITE_URL}/#clinic`, "@type": "MedicalClinic", name: "Thyrocare Lucknow – Authorised Service Centre UP166" } } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Health checkups", item: `${SITE_URL}/#profiles` },
          { "@type": "ListItem", position: 3, name: it.name, item: url },
        ],
      },
    ],
  });

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(descr)}" />
  <link rel="canonical" href="${esc(url)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#0a4fa3" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Thyrocare Lucknow" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(descr)}" />
  <meta property="og:image" content="${esc(abs(it.image || "/assets/img/og-cover.jpg"))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(descr)}" />
  <meta name="twitter:image" content="${esc(abs(it.image || "/assets/img/og-cover.jpg"))}" />
  ${verifyMeta()}
  ${iconLinks}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body class="cu-body">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${sprite}</defs></svg>

  <header class="header is-scrolled">
    <div class="wrap header__in">
      <a href="/" class="brand" aria-label="Thyrocare UP166 Lucknow, home">
        <img src="/assets/img/thyrocare-logo.png" alt="Thyrocare" width="150" height="27" />
        <span class="brand__tag">Authorised Centre · UP166</span>
      </a>
      <div class="header__cta">
        <a class="btn btn--ghost btn--sm cu-back" href="/#profiles">← All checkups</a>
        <a class="btn btn--primary btn--sm hide-sm" href="tel:+91${esc(p1)}">${ic("i-phone")}${esc(phoneDisplay(p1))}</a>
        <a class="icon-btn show-sm" href="tel:+91${esc(p1)}" aria-label="Call us">${ic("i-phone")}</a>
      </div>
    </div>
  </header>

  <main class="cu wrap">
    <nav class="cu-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/#profiles">Health checkups</a><span>›</span><b>${esc(it.name)}</b></nav>

    <div class="cu-grid${it.image ? "" : " cu-grid--noimg"}">
      ${it.image ? `
      <div class="cu-poster">
        <button type="button" class="cu-poster__btn" data-zoom aria-label="Open the poster full size">
          <img src="${esc(it.image)}" alt="${esc(it.name)} poster" />
        </button>
        <p class="cu-poster__hint">Tap the poster to zoom in</p>
      </div>` : ""}

      <div class="cu-info">
        <p class="eyebrow">${esc(kind)}</p>
        <h1>${esc(it.name)}</h1>
        ${it.tagline ? `<p class="cu-tag">${esc(it.tagline)}</p>` : ""}

        <div class="cu-price">
          <div>
            ${it.price ? `<b>${inr(it.price)}</b>${it.mrp && it.mrp > it.price ? ` <s>${inr(it.mrp)}</s>` : ""}<small>${it.type === "profile" ? "Offer price · " : ""}Home collection available</small>`
              : `<b class="cu-price__ask">Get today's rate</b><small>Rates change often. We share the latest price on WhatsApp within 30 minutes.</small>`}
          </div>
          ${total ? `<span class="cu-chip">${esc(testsWord(total))}</span>` : ""}
        </div>

        <div class="cu-ctas">
          <a class="btn btn--primary btn--lg" href="${bookHref}">${ic("i-home")}Book home collection</a>
          <a class="btn btn--wa btn--lg" href="https://wa.me/91${esc(wa)}?text=${waText}" target="_blank" rel="noopener">${ic("i-wa")}${it.price ? "Ask on WhatsApp" : "Get rate on WhatsApp"}</a>
        </div>
        ${it.price ? "" : `
        <div class="cu-rate" data-rate="${esc(it.name)}">
          <p><b>Prefer a call?</b> Leave your mobile number and we'll call you with today's rate.</p>
          <form novalidate>
            <input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="18" placeholder="10-digit mobile number" aria-label="Your mobile number" />
            <button class="btn btn--primary" type="submit">${ic("i-phone")}Call me</button>
          </form>
          <p class="cu-rate__msg" aria-live="polite"></p>
        </div>`}

        <ul class="cu-points">
          <li>${ic("i-check")}Sample collected at your home by a Thyrocare-certified team</li>
          <li>${ic("i-check")}Tested in Thyrocare's NABL-accredited lab</li>
          <li>${ic("i-check")}Report shared on your phone</li>
        </ul>

        ${it.desc ? `<p class="cu-desc">${esc(it.desc)}</p>` : ""}
        ${it.note || it.fasting ? `<p class="cu-note">${ic("i-award")}<span>${esc(it.note || "Fasting may be needed. We'll guide you when you book.")}</span></p>` : ""}
      </div>
    </div>

    ${groups.length ? `
    <section class="cu-included" aria-labelledby="incl">
      <div class="cu-included__head">
        <h2 id="incl">What's included${total ? ` <span>${esc(testsWord(total))}</span>` : ""}</h2>
        ${groups.some((g) => g.items.length) ? `<button type="button" class="btn btn--ghost btn--sm" data-toggleall>${openAll ? "Hide test names" : "Show all test names"}</button>` : ""}
      </div>
      <div class="cu-groups">${groupHtml}</div>
    </section>` : ""}

    ${it.fasting ? `
    <section class="cu-prep">
      <h2>Before your test</h2>
      <ul>
        <li>${ic("i-check")}<span>No food for <b>10–12 hours</b> before the sample. An early-morning slot is best.</span></li>
        <li>${ic("i-check")}<span>Plain <b>water is allowed</b>. No tea, coffee or juice.</span></li>
        <li>${ic("i-check")}<span>Take your regular medicines only as your doctor advises.</span></li>
      </ul>
    </section>` : ""}

    ${others.length ? `
    <section class="cu-more">
      <h2>Other health checkups</h2>
      <div class="cu-others">${others.map((o) => `
        <a class="cu-other" href="/checkup/${esc(o.slug)}">
          ${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy" />` : ""}
          <span><b>${esc(o.name)}</b><small>${o.params ? esc(testsWord(o.params)) + " · " : ""}${o.price ? inr(o.price) : "Ask for rate"}</small></span>
        </a>`).join("")}</div>
    </section>` : ""}
  </main>

  <footer class="cu-foot">
    <div class="wrap">
      <p><b>Thyrocare Authorised Service Centre · UP166</b></p>
      <p>${esc(s.address || "")}</p>
      <p>${(s.phones || []).filter(Boolean).map((p) => `<a href="tel:+91${esc(p)}">${esc(phoneDisplay(p))}</a>`).join(" · ")}</p>
      <p><a href="/">← Back to the main website</a></p>
    </div>
  </footer>

  <div class="cu-bar">
    <a class="btn btn--primary" href="${bookHref}">${ic("i-home")}Book</a>
    <a class="btn btn--wa" href="https://wa.me/91${esc(wa)}?text=${waText}" target="_blank" rel="noopener">${ic("i-wa")}WhatsApp</a>
  </div>

  <dialog class="cu-zoom" aria-label="Poster">
    <button type="button" class="icon-btn cu-zoom__x" data-close aria-label="Close">${ic("i-x")}</button>
    ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.name)} poster" />` : ""}
  </dialog>

  <script src="/checkup.js" defer></script>
</body>
</html>`;
}

// Returns the page HTML, or null when there is no such (visible) checkup.
export async function renderCheckup(slug) {
  if (isProd && pages.has(slug)) return pages.get(slug);
  if (!isProd) loadSprite();
  const [data, s] = await Promise.all([publicData(), getSettings()]);
  const it = data.items.find((x) => x.slug === slug);
  if (!it) return null;
  const html = renderPage(it, data.items, s);
  pages.set(slug, html);
  return html;
}
