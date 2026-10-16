import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { col } from "./db.js";
import { mediaUrl } from "./media.js";
import { CONCERNS } from "./concerns.js";
import { esc, mdBold, safeJson, phoneDisplay } from "./util.js";
import { SITE_URL, abs, verifyMeta, iconLinks } from "./site.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.join(here, "..", "public");
const TEMPLATE_PATH = path.join(PUBLIC_DIR, "index.html");
const isProd = process.env.NODE_ENV === "production";

let template = fs.readFileSync(TEMPLATE_PATH, "utf8");
let cachedHtml = null;
let cachedData = null;
// Last successful render: served if the database is briefly unreachable.
let lastGoodHtml = null;
let lastGoodData = null;

// Called after every admin change so the next visitor gets fresh content.
const invalidateHooks = [];
export const onInvalidate = (fn) => invalidateHooks.push(fn);
export function invalidate() { cachedHtml = null; cachedData = null; invalidateHooks.forEach((fn) => fn()); }

export const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export const getSettings = async () => (await col("settings").findOne({ _id: "site" })) || {};

const publicItem = (d) => ({
  id: String(d._id), type: d.type, code: d.code, name: d.name, category: d.category, concerns: d.concerns || [],
  price: d.price ?? null, mrp: d.mrp ?? null, params: d.params ?? null, desc: d.desc, tagline: d.tagline,
  includes: d.includes || [], groups: d.groups || [], note: d.note, fasting: !!d.fasting, best: !!d.best,
  featured: !!d.featured, image: mediaUrl(d.image), updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
});

export async function publicData() {
  if (cachedData) return cachedData;
  try { return await loadPublicData(); }
  catch (e) { if (lastGoodData) return lastGoodData; throw e; }
}

async function loadPublicData() {
  const [s, items, team] = await Promise.all([
    getSettings(),
    col("items").find({ visible: true }).sort({ type: 1, order: 1 }).toArray(),
    col("team").find({ visible: true }).sort({ order: 1 }).toArray(),
  ]);
  const pub = items.map(publicItem);
  // Each checkup/package gets its own page: /checkup/<slug>
  const used = new Set();
  for (const it of pub) {
    // Only items with real content get a page (thin pages hurt Google ranking).
    if (it.type === "test" || (it.type === "package" && !it.groups.length && !it.includes.length)) continue;
    const base = slugify(it.name) || "checkup";
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    it.slug = slug;
  }
  cachedData = {
    settings: { whatsapp: s.whatsapp, phones: s.phones || [] },
    concerns: CONCERNS,
    items: pub,
    team: team.map((m) => ({ id: String(m._id), name: m.name, role: m.role, isDoctor: !!m.isDoctor, lead: !!m.lead, cert: mediaUrl(m.cert) })),
  };
  lastGoodData = cachedData;
  return cachedData;
}

// ---------- Server-side rendering of admin-editable copy ----------
const tel = (p) => `tel:+91${p}`;
const ICONS = ["i-shield", "i-award", "h-microscope", "h-heart-cardiogram", "i-pin", "h-test-tubes"];
const STAT_ICONS = ["i-award", "i-shield", "h-microscope", "i-wa"];

function buildTokens(s, faqs, data) {
  const phones = (s.phones || []).filter(Boolean);
  const p1 = phones[0] || s.whatsapp || "";
  const mapQ = encodeURIComponent(s.mapQuery || s.address || "");
  const h = s.hero || {};
  const a = s.announcement || {};

  const raw = {
    announcementHtml: a.enabled && a.text
      ? `<div class="announce"><div class="wrap announce__in"><svg class="ic"><use href="#i-award"/></svg><span>${mdBold(a.text)}</span>${a.link ? `<a href="${esc(a.link)}">View offer →</a>` : ""}</div></div>`
      : "",
    heroLeadHtml: mdBold(h.lead),
    statsHtml: (s.stats || []).filter((st) => st.value || st.label).slice(0, 4).map((st, i) =>
      `<li><span class="facts__ic"><svg class="ic"><use href="#${STAT_ICONS[i % 4]}"/></svg></span><div><b>${esc(st.value)}</b><span>${esc(st.label)}</span></div></li>`).join(""),
    labFactsHtml: (s.labFacts || []).map((f, i) =>
      `<li><span><svg class="ic"><use href="#${ICONS[i % ICONS.length]}"/></svg></span><div><b>${esc(f.title)}</b><small>${esc(f.note)}</small></div></li>`).join(""),
    labFootnote: (s.labFacts || []).some((f) => /\*/.test(f.title + f.note)) ? `<p class="fine fine--light">*As stated by Thyrocare Technologies Ltd.</p>` : "",
    callNumbersHtml: phones.map((p) => `<a href="${tel(p)}"><svg class="ic"><use href="#i-phone"/></svg>${esc(phoneDisplay(p))}</a>`).join(""),
    contactPhonesHtml: phones.map((p) => `<a href="${tel(p)}">${esc(phoneDisplay(p))}</a>`).join(" · "),
    emailsHtml: (s.emails || []).filter(Boolean).map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join("<br />"),
    faqHtml: faqs.map((f, i) =>
      `<details class="reveal"${i === 0 ? " open" : ""}><summary>${esc(f.q)}<svg class="ic"><use href="#i-chev"/></svg></summary><p>${mdBold(f.a)}</p></details>`).join(""),
    jsonLd: safeJson(structuredData(s, faqs, data, phones)),
    verifyMeta: verifyMeta(),
    iconLinks,
    popularLinksHtml: data.items.filter((i) => i.type === "profile" && i.slug).slice(0, 8)
      .map((i) => `<a href="/checkup/${esc(i.slug)}">${esc(i.name)}${i.price ? ` – ₹${Number(i.price).toLocaleString("en-IN")}` : ""}</a>`).join("<br />"),
    areasHtml: s.areas ? `<p class="footer__areas"><b>Home sample collection in:</b> ${esc(s.areas)}</p>` : "",
    dataJson: safeJson(data),
  };

  const text = {
    "seo.title": s.seoTitle, "seo.description": s.seoDescription,
    "topbar.address": s.addressShort, "topbar.note": s.topbarNote,
    "phone1.tel": tel(p1), "phone1.display": phoneDisplay(p1), "wa.display": phoneDisplay(s.whatsapp || p1),
    "hero.badge": h.badge, "hero.title": h.title, "hero.highlight": h.highlight, "hero.hindi": h.hindi,
    address: s.address, mapEmbed: `https://maps.google.com/maps?q=${mapQ}&z=16&output=embed`,
    mapLink: `https://www.google.com/maps/search/?api=1&query=${mapQ}`, "footer.note": s.footerNote,
    canonical: `${SITE_URL}/`, ogImage: abs("/assets/img/og-cover.jpg"),
  };
  return { raw, text };
}

// Schema.org data Google reads: the clinic, its checkup prices, the website and the FAQs.
const plain = (t) => String(t || "").replace(/\*\*/g, "");
function structuredData(s, faqs, data, phones) {
  const clinicId = `${SITE_URL}/#clinic`;
  const checkups = data.items.filter((i) => i.type === "profile" && i.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["MedicalClinic", "MedicalBusiness"], "@id": clinicId,
        name: "Thyrocare Lucknow – Authorised Service Centre UP166",
        alternateName: ["Thyrocare UP166 Lucknow", "Thyrocare Mansoor Nagar", "Thyrocare Pathology Lucknow"],
        url: `${SITE_URL}/`, logo: abs("/assets/img/thyrocare-logo.png"),
        image: [abs("/assets/img/og-cover.jpg"), abs("/assets/img/photos/doctor-namaste.webp")],
        description: s.seoDescription,
        telephone: phones[0] ? `+91${phones[0]}` : undefined,
        email: (s.emails || [])[0],
        address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: "Lucknow", addressRegion: "Uttar Pradesh", postalCode: "226003", addressCountry: "IN" },
        areaServed: { "@type": "City", name: "Lucknow" },
        medicalSpecialty: "Pathology",
        priceRange: "₹₹",
        currenciesAccepted: "INR",
        hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.mapQuery || s.address || "")}`,
        contactPoint: phones.map((p) => ({ "@type": "ContactPoint", telephone: `+91${p}`, contactType: "customer service", areaServed: "IN", availableLanguage: ["en", "hi"] })),
        ...(checkups.length ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog", name: "Health checkups",
            itemListElement: checkups.filter((i) => i.price).map((i) => ({
              "@type": "Offer", price: i.price, priceCurrency: "INR", url: `${SITE_URL}/checkup/${i.slug}`,
              itemOffered: { "@type": "MedicalTest", name: i.name, ...(i.desc ? { description: i.desc } : {}) },
            })),
          },
        } : {}),
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: "Thyrocare Lucknow", inLanguage: "en-IN", publisher: { "@id": clinicId } },
      ...(faqs.length ? [{
        "@type": "FAQPage", "@id": `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } })),
      }] : []),
    ],
  };
}

export async function renderIndex() {
  if (cachedHtml && isProd) return cachedHtml;
  try { return await buildIndex(); }
  catch (e) { if (lastGoodHtml) return lastGoodHtml; throw e; }
}

async function buildIndex() {
  if (!isProd) template = fs.readFileSync(TEMPLATE_PATH, "utf8"); // live edits while developing
  const [s, faqs, data] = await Promise.all([
    getSettings(), col("faqs").find({ visible: true }).sort({ order: 1 }).toArray(), publicData(),
  ]);
  const { raw, text } = buildTokens(s, faqs, data);
  // One pass, so admin-typed text that happens to contain {{…}} is never substituted.
  cachedHtml = template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g,
    (_, rawKey, textKey) => (rawKey ? raw[rawKey] ?? "" : esc(text[textKey] ?? "")));
  lastGoodHtml = cachedHtml;
  return cachedHtml;
}
