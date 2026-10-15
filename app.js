/* ==========================================================
   Thyrocare UP166 Lucknow — interactions (no backend needed)
   All enquiries & bookings are delivered to WhatsApp.
   ========================================================== */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* ---------- Config: edit here ---------- */
  const CONFIG = {
    whatsapp: "917080014014", // country code + number, no "+"
    storageKey: "up166-list",
    draftKey: "up166-booking-draft",
    // Prescription upload without a backend: the browser uploads the photo straight to
    // Cloudinary (free plan) and the WhatsApp message carries its link. Fill both values
    // to switch it on (see README). Left empty, patients attach the photo in WhatsApp.
    upload: { cloudName: "dt8fsqka6", preset: "up166_prescriptions" },
  };

  /* ---------- Catalogue ----------
     Package prices: Thyrocare "Jaanch" B2C rate card. price: null => "Ask for rate". */
  const PACKAGES = [
    { id: "AAROGYAM", name: "Full Body Checkup (Aarogyam range)", cat: "Full Body", price: null, desc: "Thyrocare's complete health checkups. Tell us your age and we'll suggest the right one." },
    { id: "JAANCHTPB", name: "Thyroid Profile Basic", cat: "Thyroid", price: 999, best: true, desc: "A focused thyroid check. Ideal for tiredness, weight change or hair fall." },
    { id: "JAANCHTPA", name: "Thyroid Profile Advanced", cat: "Thyroid", price: 1999, desc: "Deeper thyroid evaluation for diagnosed patients and follow-ups." },
    { id: "JHHB", name: "Healthy Heart Basic", cat: "Heart", price: 1000, desc: "Know your heart risk early, especially after 30 or with family history." },
    { id: "JHHAA", name: "Healthy Heart Advanced", cat: "Heart", price: 2000, desc: "Extended cardiac risk screening, doctor-curated." },
    { id: "JAADPB", name: "Diabetic Profile Basic", cat: "Diabetes", price: 1500, desc: "Essential sugar-control monitoring for diabetics and pre-diabetics." },
    { id: "JAADPA", name: "Diabetic Profile Advanced", cat: "Diabetes", price: 4000, desc: "Comprehensive diabetes check, including its effect on other organs." },
    { id: "JAANCHPM", name: "PCOD Mini", cat: "Women's Health", price: 2500, desc: "A starting point for irregular periods, acne or weight concerns." },
    { id: "JAANCHPC", name: "PCOD Basic", cat: "Women's Health", price: 3500, desc: "Hormonal screening for suspected PCOD/PCOS." },
    { id: "JAANCHPA", name: "PCOD Advanced", cat: "Women's Health", price: 4500, desc: "Complete hormonal and metabolic PCOD evaluation." },
    { id: "JIPB", name: "Infertility Profile Basic", cat: "Women's Health", price: null, desc: "First-line fertility screening, as advised by your gynaecologist." },
    { id: "JIPAA", name: "Infertility Profile Advanced", cat: "Women's Health", price: null, desc: "Detailed fertility hormone profile." },
    { id: "JAANCHWSCC", name: "Women's Skin Care Checkup", cat: "Skin & Hair", price: null, desc: "Finds internal causes behind acne, pigmentation and dull skin." },
    { id: "JMSCC", name: "Men's Skin Care Checkup", cat: "Skin & Hair", price: null, desc: "Internal causes behind skin problems in men." },
    { id: "JWHSA", name: "Women's Hairfall Screening Advanced", cat: "Skin & Hair", price: null, desc: "Vitamin, hormone and thyroid causes of hair fall." },
    { id: "JMHSA", name: "Men's Hairfall Screening Advanced", cat: "Skin & Hair", price: null, desc: "Finds the cause before you spend on treatments." },
    { id: "JTPF", name: "Tumour Panel (Female)", cat: "Cancer Screening", price: null, desc: "Tumour-marker screening for women. Discuss results with your doctor." },
    { id: "JTPM", name: "Tumour Panel (Male)", cat: "Cancer Screening", price: null, desc: "Tumour-marker screening for men. Discuss results with your doctor." },
    { id: "JMFPB", name: "Monsoon Fever Panel Basic", cat: "Fever", price: null, desc: "For fever during the rainy season: common infections checked together." },
    { id: "JMFPA", name: "Monsoon Fever Panel Advanced", cat: "Fever", price: null, desc: "Wider monsoon-fever screen in one sample." },
    { id: "JMFPAII", name: "Monsoon Fever Panel Advanced + Influenza", cat: "Fever", price: null, desc: "Monsoon fever panel including influenza." },
    { id: "JWFPB", name: "Winter Fever Panel Basic", cat: "Fever", price: null, desc: "For winter fevers: common causes checked together." },
    { id: "JWFPA", name: "Winter Fever Panel Advanced", cat: "Fever", price: null, desc: "Wider winter-fever screen in one sample." },
    { id: "JWFPAII", name: "Winter Fever Panel Advanced + Influenza", cat: "Fever", price: null, desc: "Winter fever panel including influenza." },
    { id: "KKKMM", name: "STD Profile Basic", cat: "Sexual Health", price: null, desc: "Confidential screening. Your privacy is fully respected." },
  ];

  const TESTS = [
    { id: "T-CBC", name: "CBC (Complete Blood Count)", cat: "Routine", desc: "Haemoglobin, infection and anaemia check." },
    { id: "T-TFT", name: "Thyroid Profile (T3, T4, TSH)", cat: "Thyroid", desc: "The standard thyroid test." },
    { id: "T-LIPID", name: "Lipid Profile", cat: "Heart", fasting: true, desc: "Cholesterol and triglycerides." },
    { id: "T-FBS", name: "Blood Sugar Fasting", cat: "Diabetes", fasting: true, desc: "Fasting glucose level." },
    { id: "T-PPBS", name: "Blood Sugar PP", cat: "Diabetes", desc: "Glucose 2 hours after a meal." },
    { id: "T-HBA1C", name: "HbA1c", cat: "Diabetes", desc: "Your average sugar over 3 months. No fasting needed." },
    { id: "T-LFT", name: "Liver Function Test (LFT)", cat: "Routine", desc: "Liver enzymes, bilirubin and proteins." },
    { id: "T-KFT", name: "Kidney Function Test (KFT)", cat: "Routine", desc: "Creatinine, urea and electrolytes." },
    { id: "T-VITD", name: "Vitamin D (25-OH)", cat: "Vitamins", desc: "Common cause of body pain and fatigue." },
    { id: "T-B12", name: "Vitamin B12", cat: "Vitamins", desc: "Numbness, weakness and memory concerns." },
    { id: "T-IRON", name: "Iron Studies", cat: "Vitamins", desc: "Iron stores and anaemia type." },
    { id: "T-URINE", name: "Urine Routine & Microscopy", cat: "Routine", desc: "Infection, sugar and protein in urine." },
    { id: "T-URIC", name: "Uric Acid", cat: "Routine", desc: "Joint pain and gout check." },
    { id: "T-CRP", name: "CRP", cat: "Fever", desc: "Inflammation and infection marker." },
    { id: "T-ESR", name: "ESR", cat: "Fever", desc: "General inflammation marker." },
    { id: "T-DENGUE", name: "Dengue NS1 Antigen", cat: "Fever", desc: "Early dengue detection." },
    { id: "T-WIDAL", name: "Typhoid (Widal)", cat: "Fever", desc: "Typhoid screening." },
    { id: "T-MALARIA", name: "Malaria Antigen", cat: "Fever", desc: "Rapid malaria detection." },
    { id: "T-CALC", name: "Calcium", cat: "Vitamins", desc: "Bone and muscle health." },
    { id: "T-TESTO", name: "Testosterone", cat: "Hormones", desc: "Male hormone level." },
    { id: "T-PRL", name: "Prolactin", cat: "Hormones", desc: "Irregular periods and fertility." },
    { id: "T-AMH", name: "AMH", cat: "Hormones", desc: "Ovarian reserve and fertility planning." },
    { id: "T-PSA", name: "PSA", cat: "Hormones", desc: "Prostate screening for men over 50." },
    { id: "T-SPUTUM", name: "Sputum Examination", cat: "Other Samples", desc: "Chest infection and TB screening." },
    { id: "T-TISSUE", name: "Tissue / Biopsy (Histopathology)", cat: "Other Samples", desc: "Tissue samples sent to Thyrocare lab." },
  ];

  const ALL = new Map([...PACKAGES, ...TESTS].map((t) => [t.id, t]));

  // Medical icon per category (Healthicons sprite ids in index.html)
  const CAT_ICON = {
    "Full Body": "h-body", Thyroid: "h-thyroid", Heart: "h-heart-organ", Diabetes: "h-diabetes-measure",
    "Women's Health": "h-female-reproductive-system", "Skin & Hair": "h-head", "Cancer Screening": "h-tumour",
    Fever: "h-fever", "Sexual Health": "h-test-tubes", Routine: "h-blood-drop", Vitamins: "h-pills-2",
    Hormones: "h-female-reproductive-system", "Other Samples": "h-microscope",
  };

  // "Browse by health concern" tiles → curated mix of packages and single tests
  const CONCERNS = [
    { label: "Full Body", sub: "Complete checkup", icon: "h-body", ids: ["AAROGYAM", "T-CBC", "T-LFT", "T-KFT", "T-LIPID", "T-TFT"] },
    { label: "Fever", sub: "Dengue, typhoid…", icon: "h-fever", ids: ["JMFPB", "JMFPA", "JMFPAII", "JWFPB", "JWFPA", "JWFPAII", "T-DENGUE", "T-MALARIA", "T-WIDAL", "T-CBC", "T-CRP"] },
    { label: "Diabetes", sub: "Sugar control", icon: "h-diabetes-measure", ids: ["JAADPB", "JAADPA", "T-HBA1C", "T-FBS", "T-PPBS"] },
    { label: "Heart", sub: "Cholesterol & risk", icon: "h-heart-organ", ids: ["JHHB", "JHHAA", "T-LIPID", "T-CRP"] },
    { label: "Thyroid", sub: "T3, T4, TSH", icon: "h-thyroid", ids: ["JAANCHTPB", "JAANCHTPA", "T-TFT"] },
    { label: "Women's Health", sub: "PCOD, fertility", icon: "h-female-reproductive-system", ids: ["JAANCHPM", "JAANCHPC", "JAANCHPA", "JIPB", "JIPAA", "T-PRL", "T-AMH", "T-TFT"] },
    { label: "Kidney", sub: "KFT, urine", icon: "h-kidneys", ids: ["T-KFT", "T-URIC", "T-URINE"] },
    { label: "Liver", sub: "LFT", icon: "h-liver", ids: ["T-LFT"] },
    { label: "Vitamins", sub: "D, B12, iron", icon: "h-pills-2", ids: ["T-VITD", "T-B12", "T-IRON", "T-CALC"] },
    { label: "Bone & Joint", sub: "Pain, gout", icon: "h-joints", ids: ["T-VITD", "T-CALC", "T-URIC"] },
    { label: "Skin & Hair", sub: "Hair fall, acne", icon: "h-head", ids: ["JAANCHWSCC", "JMSCC", "JWHSA", "JMHSA", "T-VITD", "T-IRON"] },
    { label: "Cancer Screening", sub: "Tumour markers", icon: "h-tumour", ids: ["JTPF", "JTPM", "T-PSA", "T-TISSUE"] },
  ];

  const TEAM = [
    { name: "Dr Farhat Shaheen", role: "Doctor · Certified Specimen Collection", cert: "farhat-shaheen.jpg", lead: true },
    { name: "Irfan M Zaidi", role: "Thyrocare Trained Service Provider, UP166", cert: "irfan-zaidi-provider.jpg", lead: true },
    { name: "Mrs Rumza Jafar", role: "Certified Specimen Collection Technician", cert: "rumza-jafar.jpg" },
    { name: "Ms Anam Fatima", role: "Certified Specimen Collection Technician", cert: "anam-fatima.jpg" },
    { name: "Ms Aiman Fatima", role: "Certified Specimen Collection Technician", cert: "aiman-fatima.jpg" },
    { name: "Mohd Faheem", role: "Certified Specimen Collection Technician", cert: "mohd-faheem.jpg" },
  ];

  /* ---------- Helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const inr = (n) => "₹" + n.toLocaleString("en-IN");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const initials = (name) => name.replace(/^(Dr|Mrs|Ms|Mr|Mohd)\.?\s+/i, "").split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  let toastTimer;
  function toast(msg, ms = 3200) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), ms);
  }

  const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  // Returns false when a popup blocker stopped the new tab.
  // (No "noopener" feature: with it, window.open always returns null.)
  function tryOpen(url) {
    const w = window.open(url, "_blank");
    if (w) w.opener = null;
    return !!w;
  }

  function openWA(text) {
    const url = waUrl(text);
    if (!tryOpen(url)) location.href = url;
  }

  /* ---------- Header / nav ---------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const menuBtn = $("#menuBtn");
  const mmenu = $("#mobileMenu");
  function setMenu(open) {
    mmenu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    $("use", menuBtn).setAttribute("href", open ? "#i-x" : "#i-menu");
  }
  menuBtn.addEventListener("click", () => setMenu(mmenu.hidden));
  $$("a", mmenu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // Active section highlight
  const navLinks = $$(".nav a");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 60 + "ms"; ro.observe(el); });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Test list (cart) ---------- */
  let list = store.get(CONFIG.storageKey, []).filter((id) => ALL.has(id));
  const listHooks = [];
  const inList = (id) => list.includes(id);

  function toggleItem(id) {
    if (inList(id)) {
      list = list.filter((x) => x !== id);
    } else {
      list.push(id);
      toast(`Added: ${ALL.get(id).name}`);
      const fab = $("#fab");
      fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
    }
    store.set(CONFIG.storageKey, list);
    syncList();
  }

  function syncList() {
    $$("[data-count]").forEach((c) => { c.textContent = list.length; c.hidden = list.length === 0; });
    $("#fab").hidden = list.length === 0;
    $$("#testGrid .card").forEach((card) => {
      const on = inList(card.dataset.id);
      card.classList.toggle("is-added", on);
      const btn = $(".add", card);
      btn.classList.toggle("is-added", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.innerHTML = on ? '<svg class="ic"><use href="#i-check"/></svg>Added' : '<svg class="ic"><use href="#i-plus"/></svg>Add';
    });
    renderDrawer();
    listHooks.forEach((fn) => fn());
  }

  function renderDrawer() {
    const items = list.map((id) => ALL.get(id));
    $("#drawerList").innerHTML = items.map((t) => `
      <li>
        <div class="t">${esc(t.name)}<small>${t.price ? inr(t.price) + " listed" : "Rate on request"}</small></div>
        <button class="rm" data-rm="${t.id}" aria-label="Remove ${esc(t.name)}"><svg class="ic"><use href="#i-x"/></svg></button>
      </li>`).join("");
    $("#drawerEmpty").hidden = items.length > 0;
    $("#drawerList").hidden = items.length === 0;
    $("#drawerFoot").hidden = items.length === 0;
    const priced = items.filter((t) => t.price);
    const total = priced.reduce((s, t) => s + t.price, 0);
    $("#drawerTotal").textContent = inr(total);
    const unpriced = items.length - priced.length;
    $("#drawerNote").textContent = unpriced
      ? `+ ${unpriced} item${unpriced > 1 ? "s" : ""} on request. We'll send one combined best rate.`
      : "Ask on WhatsApp. Combined bookings often get a better rate.";
  }

  $("#drawerList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (b) toggleItem(b.dataset.rm);
  });

  const drawer = $("#drawer");
  const openDrawer = () => { renderDrawer(); drawer.showModal(); };
  $("#fab").addEventListener("click", openDrawer);
  $("#mbarList").addEventListener("click", openDrawer);

  function listMessage() {
    const lines = list.map((id, i) => { const t = ALL.get(id); return `${i + 1}. ${t.name}${t.price ? ` (${inr(t.price)})` : ""}`; });
    return `Hi, please share your best rate for these tests:\n\n${lines.join("\n")}\n\n(Sent from your website)`;
  }
  $("#listWa").addEventListener("click", () => openWA(listMessage()));
  $("#listBook").addEventListener("click", () => {
    const ta = $('#bookForm [name="tests"]');
    ta.value = list.map((id) => ALL.get(id).name).join(", ");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    drawer.close();
    $("#book").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Test grid ---------- */
  let mode = "packages";
  let cat = "All";
  let query = "";
  let expanded = false;
  let concern = null; // active CONCERNS entry, overrides tab/chip filters
  const smallScreen = window.matchMedia("(max-width: 600px)");

  function renderChips() {
    const src = mode === "packages" ? PACKAGES : TESTS;
    const cats = ["All", ...new Set(src.map((t) => t.cat))];
    if (!cats.includes(cat)) cat = "All";
    $("#catChips").innerHTML = cats.map((c) =>
      `<button class="chip${c === cat ? " is-active" : ""}" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join("");
  }

  function renderGrid() {
    const q = query.trim().toLowerCase();
    let items;
    if (concern) {
      items = concern.ids.map((id) => ALL.get(id));
    } else {
      // Search spans both packages and single tests so nothing is hidden behind a tab.
      const src = q ? [...PACKAGES, ...TESTS] : (mode === "packages" ? PACKAGES : TESTS);
      items = src.filter((t) =>
        (q || cat === "All" || t.cat === cat) &&
        (!q || (t.name + " " + t.cat + " " + t.desc + " " + t.id).toLowerCase().includes(q)));
    }

    const banner = $("#concernBanner");
    banner.hidden = !concern;
    $("#catChips").hidden = !!concern;
    if (concern) {
      banner.innerHTML = `<svg class="ic"><use href="#${concern.icon}"/></svg>Tests for ${esc(concern.label)}
        <button type="button" id="clearConcern"><svg class="ic"><use href="#i-x"/></svg>Show all</button>`;
    }

    // Keep the page short: preview a few cards until the visitor asks for all.
    const limit = smallScreen.matches ? 4 : 9;
    const capped = !concern && !expanded && !q && cat === "All" && items.length > limit + 2;
    const shown = capped ? items.slice(0, limit) : items;
    $("#moreWrap").hidden = !capped;
    if (capped) $("#moreBtn").textContent = `Show all ${items.length} ${mode === "packages" ? "packages" : "tests"}`;

    $("#testGrid").innerHTML = shown.map((t, i) => `
      <article class="card" data-id="${t.id}" style="animation-delay:${Math.min(i, 8) * 30}ms">
        <div class="card__top" data-c="${esc(t.cat)}">
          <span class="card__ic"><svg class="ic"><use href="#${CAT_ICON[t.cat] || "h-test-tubes"}"/></svg></span>
          <span class="card__tags">
            <span class="cat">${esc(t.cat)}</span>
            ${t.best ? '<span class="flag flag--best">Best value</span>' : ""}
            ${t.fasting ? '<span class="flag">Fasting</span>' : ""}
          </span>
        </div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.desc)}</p>
        <div class="card__foot">
          ${t.price
            ? `<div class="price">${inr(t.price)}<small>Listed price</small></div>`
            : `<div class="price price--ask">Ask for best rate</div>`}
          <button class="add" data-add="${t.id}" aria-pressed="false"></button>
        </div>
      </article>`).join("");

    $("#emptyState").hidden = items.length > 0;
    syncList();
  }

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    $$(".tab").forEach((t) => { const on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
    cat = "All";
    expanded = false;
    concern = null;
    renderChips(); renderGrid();
  }));
  $("#concernBanner").addEventListener("click", (e) => {
    if (!e.target.closest("#clearConcern")) return;
    concern = null;
    renderGrid();
  });

  // Health-concern tiles
  $("#concernGrid").innerHTML = CONCERNS.map((c, i) => `
    <button class="concern reveal is-in" data-concern="${i}" data-c="${esc(c.label)}">
      <span class="concern__ic"><svg class="ic"><use href="#${c.icon}"/></svg></span>
      <span>${esc(c.label)}<small>${esc(c.sub)}</small></span>
    </button>`).join("");
  $("#concernGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-concern]");
    if (!b) return;
    concern = CONCERNS[+b.dataset.concern];
    query = ""; $("#testSearch").value = "";
    renderGrid();
    $("#tests").scrollIntoView({ behavior: "smooth" });
  });
  $("#moreBtn").addEventListener("click", () => { expanded = true; renderGrid(); });
  $("#catChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-cat]");
    if (!c) return;
    cat = c.dataset.cat;
    concern = null;
    renderChips(); renderGrid();
  });
  $("#testGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) toggleItem(b.dataset.add);
  });
  let searchT;
  $("#testSearch").addEventListener("input", (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { query = e.target.value; concern = null; renderGrid(); }, 120);
  });

  renderChips();
  renderGrid();

  /* ---------- WhatsApp quick links ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-wa-text]");
    if (!a) return;
    e.preventDefault();
    let text = a.dataset.waText;
    if (a.closest("#emptyState") && query.trim()) text += query.trim();
    openWA(text);
  });

  /* ---------- Prescription upload ----------
     A wa.me link can only carry text, never a file. So the photo is delivered by:
     - cloud mode (CONFIG.upload filled): upload to Cloudinary as soon as it is chosen,
       then one tap sends a WhatsApp message containing the photo's link;
     - otherwise, phones (Web Share with files): 1) open our chat, 2) share the photo into it
       (the chat is then at the top of WhatsApp's "recent chats" picker);
     - otherwise, desktop: copy the photo to the clipboard, open WhatsApp, visitor pastes it. */
  const CLOUD = !!(CONFIG.upload.cloudName && CONFIG.upload.preset);
  const rxInput = $("#rxFile");
  const drop = $("#drop");
  const CHAT_KEY = "up166-chat-opened";
  const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  // Share-sheet flow only on touch devices; desktops (even ones with Web Share) use copy & paste.
  const shareMode = (() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return false;
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.png", { type: "image/png" })] })); }
    catch { return false; }
  })();
  let rxFile = null;
  let rxUrl = null;
  let rxPng = null;  // PNG copy of the photo, ready for the clipboard
  let rxLink = null; // cloud mode: public link of the uploaded prescription

  function rxHint(html, ok = false) {
    const h = $("#rxHint");
    h.innerHTML = html;
    h.classList.toggle("hint--ok", ok);
  }

  // Redraw the chosen photo (capped at 2200px). Clipboard needs PNG; uploads use JPEG to stay small.
  function toImage(type = "image/png", quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; // JPEG has no transparency
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => resolve(b), type, quality);
      };
      img.onerror = () => resolve(null);
      img.src = rxUrl;
    });
  }
  const toPng = () => toImage("image/png");

  // Direct browser → Cloudinary upload (unsigned preset), with progress.
  function uploadRx(blob, name, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", blob, name);
      fd.append("upload_preset", CONFIG.upload.preset);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CONFIG.upload.cloudName}/auto/upload`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status < 300 && res.secure_url) resolve(res.secure_url);
          else reject(new Error((res.error && res.error.message) || "Upload failed"));
        } catch (err) { reject(err); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(fd);
    });
  }

  function setSendBtn(label, disabled) {
    const b = $("#rxSend");
    b.disabled = disabled;
    b.innerHTML = `<svg class="ic"><use href="#i-wa"/></svg>${label}`;
  }

  function syncRxSteps() {
    const opened = store.get(CHAT_KEY, false);
    $("#rxStep1").classList.toggle("is-done", opened);
    $("#rxStep1").classList.toggle("is-next", !opened);
    $("#rxStep2").classList.toggle("is-next", opened);
  }

  function setRx(file) {
    if (!file) return;
    if (!/^image\/|application\/pdf/.test(file.type)) { toast("Please choose a photo or PDF"); return; }
    rxFile = file;
    rxPng = null;
    if (rxUrl) URL.revokeObjectURL(rxUrl);
    rxUrl = URL.createObjectURL(file);
    const img = $("#rxImg");
    const isImg = file.type.startsWith("image/");
    img.hidden = !isImg;
    if (isImg) img.src = rxUrl;
    $("#rxName").textContent = file.name;
    $("#dropEmpty").hidden = true;
    $("#dropPreview").hidden = false;
    rxLink = null;

    if (CLOUD) {
      setSendBtn("Uploading… 0%", true);
      rxHint("Uploading your prescription securely…");
      const blobP = isImg ? toImage("image/jpeg", 0.85) : Promise.resolve(file);
      blobP
        .then((blob) => uploadRx(blob || file, file.name, (p) => { if (rxFile === file) setSendBtn(`Uploading… ${p}%`, true); }))
        .then((url) => {
          if (rxFile !== file) return; // a newer file was chosen meanwhile
          rxLink = url;
          setSendBtn("Send on WhatsApp", false);
          rxHint("Uploaded ✓ Tap the button. Your prescription goes with the message.", true);
        })
        .catch(() => {
          if (rxFile !== file) return;
          setSendBtn("Send on WhatsApp", false);
          localFlow(file, isImg); // upload unavailable: fall back to attaching in WhatsApp
        });
      return;
    }
    localFlow(file, isImg);
  }

  // Patient attaches the photo in WhatsApp themselves (share sheet on phones, paste on desktop).
  function localFlow(file, isImg) {
    if (isImg) toPng().then((b) => { if (rxFile === file) rxPng = b; });
    if (shareMode) {
      $("#rxSteps").hidden = false;
      $("#rxSend").hidden = true;
      syncRxSteps();
      rxHint("Two quick taps and your prescription is with us.");
    } else {
      rxHint(isImg
        ? `We'll copy the photo and open WhatsApp. Then just press <b>${isApple ? "⌘" : "Ctrl"} + V</b> in the chat.`
        : "We'll open WhatsApp. Then drag this PDF into the chat.");
    }
  }
  rxInput.addEventListener("change", () => setRx(rxInput.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => setRx(e.dataTransfer.files[0]));

  function rxText() {
    const n = $("#rxNameInput").value.trim();
    return `Hi, I'm ${n ? n + ", " : ""}sending my doctor's prescription. Please share the tests and your best rate.`;
  }

  // Phone step 1: open the chat with a ready-made message
  $("#rxOpenChat").addEventListener("click", () => {
    openWA(rxText());
    store.set(CHAT_KEY, true);
    syncRxSteps();
  });

  // Phone step 2: native share sheet with the actual file
  $("#rxShare").addEventListener("click", async () => {
    if (!rxFile) { rxInput.click(); return; }
    try {
      await navigator.share({ files: [rxFile], text: "Prescription for rates (Thyrocare UP166)" });
      $("#rxStep2").classList.add("is-done");
      rxHint("Sent! We'll reply with your tests and best rate within 30 minutes.", true);
    } catch (err) {
      if (err && err.name === "AbortError") return; // visitor closed the share sheet
      openWA(rxText());
      rxHint("Your phone blocked direct sharing. In the chat that opened, tap <b>📎 Attach</b> and choose the photo.");
    }
  });

  // Desktop: copy photo, then open WhatsApp for a paste
  $("#rxSend").addEventListener("click", async () => {
    if (!rxFile) { rxInput.click(); return; }
    if (rxLink) {
      openWA(`${rxText()}\n\nPrescription: ${rxLink}`);
      rxHint("WhatsApp opened with your prescription link. Just tap Send.", true);
      return;
    }
    let copied = false;
    if (rxFile.type.startsWith("image/") && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": rxPng || toPng(rxFile) })]);
        copied = true;
      } catch { /* clipboard blocked; fall back to drag & drop */ }
    }
    const url = waUrl(rxText());
    const openLink = tryOpen(url) ? "" : ` <a href="${url}" target="_blank" rel="noopener">Open WhatsApp chat →</a>`;
    rxHint(copied
      ? `Photo copied ✓ In the WhatsApp chat, press <b>${isApple ? "⌘" : "Ctrl"} + V</b> to paste it, then Send.${openLink}`
      : `In the WhatsApp chat, drag your file in (or use 📎 Attach), then Send.${openLink}`, copied);
  });
  if (shareMode && !CLOUD) $("#rxSend").innerHTML = '<svg class="ic"><use href="#i-upload"/></svg>Choose prescription photo';

  /* ---------- Booking form ---------- */
  const form = $("#bookForm");
  const dateInput = form.elements.date;
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  dateInput.min = ymd(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // Restore draft (per-device convenience only)
  const draft = store.get(CONFIG.draftKey, {});
  ["name", "phone", "age", "gender", "address", "tests"].forEach((k) => { if (draft[k]) form.elements[k].value = draft[k]; });
  dateInput.value = draft.date && draft.date >= dateInput.min ? draft.date : ymd(tomorrow);

  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f) f.classList.remove("is-invalid");
    const data = Object.fromEntries(new FormData(form));
    store.set(CONFIG.draftKey, data);
    if (e.target.name === "visit") syncVisit();
  });
  form.addEventListener("change", (e) => { if (e.target.name === "visit") syncVisit(); });

  function syncVisit() {
    const home = form.elements.visit.value === "Home collection";
    $("#addrField").hidden = !home;
  }
  syncVisit();

  const cleanPhone = (v) => v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const el = form.elements;
    const home = el.visit.value === "Home collection";
    const phone = cleanPhone(el.phone.value);
    const checks = [
      [el.name, el.name.value.trim().length >= 2],
      [el.phone, /^[6-9]\d{9}$/.test(phone)],
      [el.date, !!el.date.value],
      [el.address, !home || el.address.value.trim().length >= 5],
    ];
    let firstBad = null;
    checks.forEach(([input, ok]) => {
      input.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) { firstBad.focus(); toast("Please check the highlighted fields"); return; }

    const d = new Date(el.date.value + "T00:00:00");
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const ageGender = [el.age.value && `${el.age.value} yrs`, el.gender.value].filter(Boolean).join(", ");
    const msg = [
      "*Booking request (website)*",
      "",
      `Name: ${el.name.value.trim()}`,
      `Mobile: ${phone}`,
      ageGender ? `Age/Gender: ${ageGender}` : null,
      `Type: ${el.visit.value}`,
      `Date: ${dateStr}`,
      `Time: ${el.slot.value}`,
      home ? `Address: ${el.address.value.trim()}` : null,
      `Tests: ${el.tests.value.trim() || "Need help choosing"}`,
    ].filter((l) => l !== null).join("\n");

    openWA(msg);
    toast("WhatsApp opened. Just tap Send to confirm your booking.", 5000);
  });

  // Hint when list items are available for the form
  function syncFromListHint() {
    const h = $("#fromList");
    if (list.length && !form.elements.tests.value.trim()) {
      h.hidden = false;
      h.innerHTML = `You have ${list.length} test${list.length > 1 ? "s" : ""} in your list. <button type="button" class="link" id="useList">Add them here</button>`;
    } else h.hidden = true;
  }
  listHooks.push(syncFromListHint);
  form.elements.tests.addEventListener("input", syncFromListHint);
  form.addEventListener("click", (e) => {
    if (!e.target.closest("#useList")) return;
    form.elements.tests.value = list.map((id) => ALL.get(id).name).join(", ");
    form.elements.tests.dispatchEvent(new Event("input", { bubbles: true }));
  });
  syncFromListHint();

  /* ---------- Team ---------- */
  const CERTS = TEAM.map((m) => ({ src: `assets/img/certs/${m.cert}`, caption: `${m.name}: Thyrocare Certificate of Training` }));
  $("#teamGrid").innerHTML = TEAM.map((m, i) => `
    <button class="member reveal is-in${m.lead ? " member--lead" : ""}" data-cert="${i}" aria-label="View ${esc(m.name)}'s Thyrocare certificate">
      <span class="member__av" aria-hidden="true">${initials(m.name)}
        <span class="member__badge"><svg class="ic"><use href="#${m.name.startsWith("Dr") ? "h-stethoscope" : "h-syringe"}"/></svg></span>
      </span>
      <span class="member__body">
        <span class="member__name">${esc(m.name)}</span>
        <span class="member__role">${esc(m.role)}</span>
        <span class="member__cert"><svg class="ic"><use href="#i-award"/></svg>View certificate</span>
      </span>
    </button>`).join("");

  /* ---------- Lightbox (gallery) ---------- */
  const lb = $("#lightbox");
  let gallery = [];
  let gIdx = 0;
  function showLb() {
    const g = gallery[gIdx];
    $("#lbImg").src = g.src;
    $("#lbImg").alt = g.caption;
    $("#lbCap").textContent = gallery.length > 1 ? `${g.caption}  ·  ${gIdx + 1}/${gallery.length}` : g.caption;
  }
  function openLb(items, i) { gallery = items; gIdx = i; showLb(); lb.showModal(); }
  $("#teamGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cert]");
    if (b) openLb(CERTS, +b.dataset.cert);
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lightbox]");
    if (!b) return;
    openLb([
      { src: "assets/img/jaanch-rates-1.jpg", caption: "Thyrocare Jaanch rate card (1/2)" },
      { src: "assets/img/jaanch-rates-2.jpg", caption: "Thyrocare Jaanch rate card (2/2)" },
    ], 0);
  });
  lb.addEventListener("keydown", (e) => {
    if (gallery.length < 2) return;
    if (e.key === "ArrowRight") { gIdx = (gIdx + 1) % gallery.length; showLb(); }
    if (e.key === "ArrowLeft") { gIdx = (gIdx - 1 + gallery.length) % gallery.length; showLb(); }
  });
  $("#lbImg").addEventListener("click", () => { if (gallery.length > 1) { gIdx = (gIdx + 1) % gallery.length; showLb(); } });

  /* ---------- Dialog closing ---------- */
  $$("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
    });
  });

  $("#year").textContent = new Date().getFullYear();
  syncList();
})();
