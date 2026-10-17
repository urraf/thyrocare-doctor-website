/* ==========================================================
   Thyrocare UP166 Lucknow — public site interactions
   Content comes from the admin panel (embedded by the server as #site-data).
   Bookings, enquiries and prescriptions are saved to the admin inbox
   AND sent to the clinic's WhatsApp.
   ========================================================== */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* ---------- Data from the server ---------- */
  const DATA = (() => {
    try { return JSON.parse(document.getElementById("site-data").textContent); }
    catch { return { settings: {}, items: [], team: [], concerns: [] }; }
  })();

  const CONFIG = {
    whatsapp: "91" + (DATA.settings.whatsapp || "7080014014"),
    storageKey: "up166-list",
    draftKey: "up166-booking-draft",
  };

  const ITEMS = DATA.items || [];
  const ALL = new Map(ITEMS.map((t) => [t.id, t]));
  const BY_TYPE = { profile: [], package: [], test: [] };
  ITEMS.forEach((t) => BY_TYPE[t.type] && BY_TYPE[t.type].push(t));
  const TYPE_LABEL = { profile: "checkups", package: "packages", test: "tests" };

  // Medical icon per category (Healthicons sprite ids in index.html)
  const CAT_ICON = {
    "Health Checkup": "h-body", "Full Body": "h-body", Thyroid: "h-thyroid", Heart: "h-heart-organ", Diabetes: "h-diabetes-measure",
    "Women's Health": "h-female-reproductive-system", "Skin & Hair": "h-head", "Cancer Screening": "h-tumour",
    Fever: "h-fever", "Sexual Health": "h-test-tubes", Routine: "h-blood-drop", Vitamins: "h-pills-2",
    Hormones: "h-female-reproductive-system", "Other Samples": "h-microscope", Kidney: "h-kidneys", Liver: "h-liver",
  };
  const iconFor = (t) => CAT_ICON[t.category] || (t.type === "profile" ? "h-body" : "h-test-tubes");

  // Concern tiles: each lists every visible item tagged with it (checkups first)
  const CONCERNS = (DATA.concerns || []).map((c) => ({
    ...c, ids: [...BY_TYPE.profile, ...BY_TYPE.package, ...BY_TYPE.test].filter((t) => (t.concerns || []).includes(c.key)).map((t) => t.id),
  })).filter((c) => c.ids.length);

  /* ---------- Helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const initials = (name) => name.replace(/^(Dr|Mrs|Ms|Mr|Mohd)\.?\s+/i, "").split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const cleanPhone = (v) => String(v || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");

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

  // Save a request to the clinic's admin inbox (fire-and-forget; WhatsApp is the main channel).
  function saveLead(fields) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
      else if (v != null && v !== "") fd.append(k, v);
    });
    return fetch("/api/leads", { method: "POST", body: fd, keepalive: true }).catch(() => {});
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
  function observeReveals(root = document) {
    const els = $$(".reveal:not(.is-in)", root);
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 60 + "ms"; ro.observe(el); });
  }

  /* ---------- Test list (cart) ---------- */
  let list = store.get(CONFIG.storageKey, []).filter((id) => ALL.has(id));
  const listHooks = [];
  const inList = (id) => list.includes(id);

  function toggleItem(id, { quiet = false } = {}) {
    if (inList(id)) {
      list = list.filter((x) => x !== id);
    } else {
      list.push(id);
      if (!quiet) toast(`Added: ${ALL.get(id).name}`);
      const fab = $("#fab");
      fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
    }
    store.set(CONFIG.storageKey, list);
    syncList();
  }

  function addBtnHtml(on) {
    return on ? '<svg class="ic"><use href="#i-check"/></svg>Added' : '<svg class="ic"><use href="#i-plus"/></svg>Add';
  }

  function syncList() {
    $$("[data-count]").forEach((c) => { c.textContent = list.length; c.hidden = list.length === 0; });
    $("#fab").hidden = list.length === 0;
    $$("[data-add]").forEach((btn) => {
      const on = inList(btn.dataset.add);
      btn.classList.toggle("is-added", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.innerHTML = addBtnHtml(on);
      btn.closest(".card, .poster")?.classList.toggle("is-added", on);
    });
    renderDrawer();
    listHooks.forEach((fn) => fn());
  }

  function renderDrawer() {
    const items = list.map((id) => ALL.get(id));
    $("#drawerList").innerHTML = items.map((t) => `
      <li>
        <div class="t">${esc(t.name)}<small>${t.price ? inr(t.price) + (t.type === "profile" ? " offer price" : " listed") : "Rate on request"}</small></div>
        <button class="rm" data-rm="${t.id}" aria-label="Remove ${esc(t.name)}"><svg class="ic"><use href="#i-x"/></svg></button>
      </li>`).join("");
    $("#drawerEmpty").hidden = items.length > 0;
    $("#drawerList").hidden = items.length === 0;
    $("#drawerFoot").hidden = items.length === 0;
    const priced = items.filter((t) => t.price);
    $("#drawerTotal").textContent = inr(priced.reduce((s, t) => s + t.price, 0));
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

  const listNames = () => list.map((id) => ALL.get(id).name);
  $("#listWa").addEventListener("click", () => {
    const lines = list.map((id, i) => { const t = ALL.get(id); return `${i + 1}. ${t.name}${t.price ? ` (${inr(t.price)})` : ""}`; });
    openWA(`Hi, please share your best rate for these tests:\n\n${lines.join("\n")}\n\n(Sent from your website)`);
    saveLead({ type: "enquiry", items: listNames().join("\n") });
  });

  function prefillBooking(names) {
    const ta = $('#bookForm [name="tests"]');
    ta.value = names.join(", ");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    $("#book").scrollIntoView({ behavior: "smooth" });
  }
  $("#listBook").addEventListener("click", () => { drawer.close(); prefillBooking(listNames()); });

  /* ---------- Price helpers ---------- */
  // Price, or a "Get today's rate" button when the clinic hides the price / has none.
  const priceHtml = (t) => t.price
    ? `<div class="price">${inr(t.price)}${t.mrp && t.mrp > t.price ? ` <s>${inr(t.mrp)}</s>` : ""}<small>${t.type === "profile" ? "Offer price" : "Listed price"}</small></div>`
    : `<button type="button" class="ask" data-ask="${t.id}"><svg class="ic"><use href="#i-wa"/></svg><span>Get today's rate</span></button>`;

  /* ---------- Poster rail (health checkup profiles) ---------- */
  const posterItems = BY_TYPE.profile.filter((p) => p.image);
  const rail = $("#posterRail");
  if (!posterItems.length) $("#profiles").hidden = true;
  rail.innerHTML = posterItems.map((p) => `
    <article class="poster reveal" data-id="${p.id}">
      <a class="poster__img" href="/checkup/${esc(p.slug)}" aria-label="See all tests in ${esc(p.name)}">
        <img src="${esc(p.image)}" alt="${esc(p.name)} poster" loading="lazy" width="480" height="650" />
        ${p.best ? '<span class="poster__badge">Most popular</span>' : ""}
      </a>
      <div class="poster__body">
        <h3><a class="poster__name" href="/checkup/${esc(p.slug)}">${esc(p.name)}</a></h3>
        <p class="poster__meta">${p.params ? `<b>${p.params}</b> tests` : esc(p.category)}${p.fasting ? " · Fasting" : ""} · <a href="/checkup/${esc(p.slug)}">See details</a></p>
        <div class="poster__foot">${priceHtml(p)}<button class="add" data-add="${p.id}" aria-pressed="false"></button></div>
      </div>
    </article>`).join("");

  // ?book=<id> (from a checkup page's "Book" button): fill the booking form with that checkup.
  function bookFromUrl() {
    const id = new URLSearchParams(location.search).get("book");
    const t = id && ALL.get(id);
    if (!t) return;
    history.replaceState(null, "", location.pathname + "#book");
    setTimeout(() => prefillBooking([t.name]), 50);
  }

  /* ---------- Get today's rate ---------- */
  const rateDlg = $("#rateDialog");
  const rateForm = $("#rateForm");
  let rateItem = null;
  function openRate(id) {
    rateItem = ALL.get(id);
    if (!rateItem) return;
    $("#rateItem").textContent = rateItem.name;
    $("#rateAsk").hidden = false;
    $("#rateDone").hidden = true;
    const draft = store.get(CONFIG.draftKey, {});
    if (!rateForm.elements.name.value && draft.name) rateForm.elements.name.value = draft.name;
    if (!rateForm.elements.phone.value && draft.phone) rateForm.elements.phone.value = draft.phone;
    rateForm.elements.phone.closest(".field").classList.remove("is-invalid");
    rateDlg.showModal();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ask]");
    if (b) openRate(b.dataset.ask);
  });
  $("#rateWa").addEventListener("click", () => {
    if (!rateItem) return;
    openWA(`Hi, please share today's rate for ${rateItem.name}. (Sent from your website)`);
    rateDlg.close();
  });
  rateForm.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("is-invalid"));
  rateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = cleanPhone(rateForm.elements.phone.value);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      rateForm.elements.phone.closest(".field").classList.add("is-invalid");
      rateForm.elements.phone.focus();
      return;
    }
    const btn = $("[type=submit]", rateForm);
    btn.disabled = true;
    try {
      const fd = new FormData();
      fd.append("type", "rate");
      fd.append("name", rateForm.elements.name.value.trim());
      fd.append("phone", phone);
      fd.append("items", rateItem.name);
      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send. Please try WhatsApp or call us.");
      $("#rateDoneItem").textContent = rateItem.name;
      $("#rateRef").textContent = data.ref;
      $("#rateAsk").hidden = true;
      $("#rateDone").hidden = false;
    } catch (err) {
      toast(err.message, 5000);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Test grid ---------- */
  let mode = BY_TYPE.profile.length ? "profile" : "package";
  let cat = "All";
  let query = "";
  let expanded = false;
  let concern = null;
  const smallScreen = window.matchMedia("(max-width: 600px)");
  // Hide tabs with nothing in them
  $$(".tab").forEach((tab) => { if (!BY_TYPE[tab.dataset.mode]?.length) tab.hidden = true; });
  const setTab = () => $$(".tab").forEach((t) => { const on = t.dataset.mode === mode; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
  setTab();

  function renderChips() {
    const cats = ["All", ...new Set(BY_TYPE[mode].map((t) => t.category).filter(Boolean))];
    if (!cats.includes(cat)) cat = "All";
    $("#catChips").innerHTML = cats.length > 2 ? cats.map((c) =>
      `<button class="chip${c === cat ? " is-active" : ""}" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join("") : "";
  }

  function cardHtml(t, i) {
    const tags = [
      `<span class="cat">${esc(t.type === "profile" ? "Full body" : t.category || "Test")}</span>`,
      t.best ? '<span class="flag flag--best">Best value</span>' : "",
      t.fasting ? '<span class="flag">Fasting</span>' : "",
    ].join("");
    const page = t.slug && (t.type === "profile" || (t.groups || []).length || (t.includes || []).length) ? `/checkup/${esc(t.slug)}` : "";
    return `
      <article class="card" data-id="${t.id}" style="animation-delay:${Math.min(i, 8) * 30}ms">
        <div class="card__top" data-c="${esc(t.type === "profile" ? "Full Body" : t.category)}">
          <span class="card__ic"><svg class="ic"><use href="#${iconFor(t)}"/></svg></span>
          <span class="card__tags">${tags}</span>
        </div>
        <h3>${page ? `<a class="card__name" href="${page}">${esc(t.name)}</a>` : esc(t.name)}</h3>
        ${t.params || page ? `<p class="card__params">${t.params ? `<b>${t.params}</b> tests` : ""}${t.params && page ? " · " : ""}${page ? `<a href="${page}">See all tests</a>` : ""}</p>` : ""}
        <p>${esc(t.desc)}</p>
        <div class="card__foot">${priceHtml(t)}<button class="add" data-add="${t.id}" aria-pressed="false"></button></div>
      </article>`;
  }

  function renderGrid() {
    const q = query.trim().toLowerCase();
    let items;
    if (concern) {
      items = concern.ids.map((id) => ALL.get(id));
    } else if (q) {
      // Search spans every type so nothing is hidden behind a tab.
      items = ITEMS.filter((t) => [t.name, t.category, t.desc, t.code, t.tagline, ...(t.includes || []), ...(t.groups || []).flatMap((g) => [g.name, ...g.items])]
        .join(" ").toLowerCase().includes(q));
    } else {
      items = BY_TYPE[mode].filter((t) => cat === "All" || t.category === cat);
    }

    const banner = $("#concernBanner");
    banner.hidden = !concern;
    $("#catChips").hidden = !!concern || !!q;
    if (concern) {
      banner.innerHTML = `<svg class="ic"><use href="#${concern.icon}"/></svg>Tests for ${esc(concern.label)}
        <button type="button" id="clearConcern"><svg class="ic"><use href="#i-x"/></svg>Show all</button>`;
    }

    // Keep the page short: preview a few cards until the visitor asks for all.
    const limit = smallScreen.matches ? 4 : 9;
    const capped = !concern && !expanded && !q && cat === "All" && items.length > limit + 2;
    const shown = capped ? items.slice(0, limit) : items;
    $("#moreWrap").hidden = !capped;
    if (capped) $("#moreBtn").textContent = `Show all ${items.length} ${TYPE_LABEL[mode]}`;

    $("#testGrid").innerHTML = shown.map(cardHtml).join("");
    $("#emptyState").hidden = items.length > 0;
    syncList();
  }

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    setTab();
    cat = "All"; expanded = false; concern = null;
    renderChips(); renderGrid();
  }));
  $("#moreBtn").addEventListener("click", () => { expanded = true; renderGrid(); });
  $("#catChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-cat]");
    if (!c) return;
    cat = c.dataset.cat; concern = null;
    renderChips(); renderGrid();
  });
  $("#concernBanner").addEventListener("click", (e) => {
    if (!e.target.closest("#clearConcern")) return;
    concern = null;
    renderGrid();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) toggleItem(b.dataset.add);
  });
  let searchT;
  $("#testSearch").addEventListener("input", (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { query = e.target.value; concern = null; renderGrid(); }, 120);
  });

  // Health-concern tiles
  $("#concernGrid").innerHTML = CONCERNS.map((c, i) => `
    <button class="concern reveal" data-concern="${i}" data-c="${esc(c.label)}">
      <span class="concern__ic"><svg class="ic"><use href="#${c.icon}"/></svg></span>
      <span>${esc(c.label)}<small>${esc(c.sub)}</small></span>
    </button>`).join("");
  if (!CONCERNS.length) $("#concerns").hidden = true;
  $("#concernGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-concern]");
    if (!b) return;
    concern = CONCERNS[+b.dataset.concern];
    query = ""; $("#testSearch").value = "";
    renderGrid();
    $("#tests").scrollIntoView({ behavior: "smooth" });
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
     1) The photo uploads to our server the moment it is chosen (private: only
        visible in /admin), 2) one tap sends a WhatsApp message with its reference.
     If the upload fails, the patient attaches the photo in WhatsApp instead:
     share sheet on phones, copy & paste on desktop. */
  const rxInput = $("#rxFile");
  const drop = $("#drop");
  const CHAT_KEY = "up166-chat-opened";
  const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  const shareMode = (() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return false;
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "x.png", { type: "image/png" })] })); }
    catch { return false; }
  })();
  let rxFile = null, rxUrl = null, rxPng = null;
  let rxLead = null; // { ref, key } once uploaded

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
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => resolve(b), type, quality);
      };
      img.onerror = () => resolve(null);
      img.src = rxUrl;
    });
  }

  function uploadRx(blob, name, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("type", "prescription");
      fd.append("file", blob, name);
      const n = $("#rxNameInput").value.trim(), p = cleanPhone($("#rxPhoneInput").value);
      if (n) fd.append("name", n);
      if (p) fd.append("phone", p);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/leads");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status < 300 && res.ref) resolve(res); else reject(new Error(res.error || "Upload failed"));
        } catch (err) { reject(err); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(fd);
    });
  }

  function setSendBtn(label, disabled) {
    const b = $("#rxSend");
    b.hidden = false;
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
    if (file.size > 15 * 1024 * 1024) { toast("That file is too large. Please choose a smaller photo."); return; }
    rxFile = file; rxPng = null; rxLead = null;
    if (rxUrl) URL.revokeObjectURL(rxUrl);
    rxUrl = URL.createObjectURL(file);
    const img = $("#rxImg");
    const isImg = file.type.startsWith("image/");
    img.hidden = !isImg;
    if (isImg) img.src = rxUrl;
    $("#rxName").textContent = file.name;
    $("#dropEmpty").hidden = true;
    $("#dropPreview").hidden = false;
    $("#rxSteps").hidden = true;

    setSendBtn("Uploading… 0%", true);
    rxHint("Uploading your prescription securely…");
    (isImg ? toImage("image/jpeg", 0.85) : Promise.resolve(file))
      .then((blob) => {
        if (blob && blob.size > 8 * 1024 * 1024) throw new Error("too large");
        return uploadRx(blob || file, (file.name || "prescription").replace(/\.\w+$/, "") + (isImg ? ".jpg" : ".pdf"), (p) => { if (rxFile === file) setSendBtn(`Uploading… ${p}%`, true); });
      })
      .then((res) => {
        if (rxFile !== file) return; // a newer file was chosen meanwhile
        rxLead = res;
        setSendBtn("Send on WhatsApp", false);
        rxHint(`Uploaded ✓ Ref <b>${esc(res.ref)}</b>. Tap the button to let us know on WhatsApp.`, true);
      })
      .catch(() => {
        if (rxFile !== file) return;
        setSendBtn("Send on WhatsApp", false);
        localFlow(file, isImg);
      });
  }

  // Fallback: patient attaches the photo in WhatsApp themselves.
  function localFlow(file, isImg) {
    if (isImg) toImage("image/png").then((b) => { if (rxFile === file) rxPng = b; });
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

  $("#rxOpenChat").addEventListener("click", () => {
    openWA(rxText());
    store.set(CHAT_KEY, true);
    syncRxSteps();
  });

  $("#rxShare").addEventListener("click", async () => {
    if (!rxFile) { rxInput.click(); return; }
    try {
      await navigator.share({ files: [rxFile], text: "Prescription for rates (Thyrocare UP166)" });
      $("#rxStep2").classList.add("is-done");
      rxHint("Sent! We'll reply with your tests and best rate within 30 minutes.", true);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      openWA(rxText());
      rxHint("Your phone blocked direct sharing. In the chat that opened, tap <b>📎 Attach</b> and choose the photo.");
    }
  });

  $("#rxSend").addEventListener("click", async () => {
    if (!rxFile) { rxInput.click(); return; }
    if (rxLead) {
      const n = $("#rxNameInput").value.trim();
      openWA(`Hi, I'm ${n ? n + ". I've" : "I've"} uploaded my prescription on your website (Ref ${rxLead.ref}). Please share the tests and your best rate.`);
      // Add the name & mobile typed after the upload started
      fetch(`/api/leads/${encodeURIComponent(rxLead.ref)}`, {
        method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: rxLead.key, name: n, phone: cleanPhone($("#rxPhoneInput").value) }),
      }).catch(() => {});
      rxHint(`WhatsApp opened. Just tap Send. Your prescription (Ref <b>${esc(rxLead.ref)}</b>) is already with us.`, true);
      return;
    }
    let copied = false;
    if (rxFile.type.startsWith("image/") && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": rxPng || toImage("image/png") })]);
        copied = true;
      } catch { /* clipboard blocked; fall back to drag & drop */ }
    }
    const url = waUrl(rxText());
    const openLink = tryOpen(url) ? "" : ` <a href="${url}" target="_blank" rel="noopener">Open WhatsApp chat →</a>`;
    rxHint(copied
      ? `Photo copied ✓ In the WhatsApp chat, press <b>${isApple ? "⌘" : "Ctrl"} + V</b> to paste it, then Send.${openLink}`
      : `In the WhatsApp chat, drag your file in (or use 📎 Attach), then Send.${openLink}`, copied);
  });

  /* ---------- Booking form ---------- */
  const form = $("#bookForm");
  const dateInput = form.elements.date;
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  dateInput.min = ymd(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const draft = store.get(CONFIG.draftKey, {});
  ["name", "phone", "age", "gender", "address", "tests"].forEach((k) => { if (draft[k]) form.elements[k].value = draft[k]; });
  dateInput.value = draft.date && draft.date >= dateInput.min ? draft.date : ymd(tomorrow);

  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f) f.classList.remove("is-invalid");
    store.set(CONFIG.draftKey, Object.fromEntries(new FormData(form)));
    if (e.target.name === "visit") syncVisit();
  });
  form.addEventListener("change", (e) => { if (e.target.name === "visit") syncVisit(); });

  function syncVisit() { $("#addrField").hidden = form.elements.visit.value !== "Home collection"; }
  syncVisit();

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

    openWA(msg); // first, inside the tap, so popup blockers allow it
    saveLead({
      type: "booking", name: el.name.value.trim(), phone, age: el.age.value, gender: el.gender.value,
      visit: el.visit.value, date: dateStr, slot: el.slot.value, address: home ? el.address.value.trim() : "", tests: el.tests.value.trim(),
    });
    toast("WhatsApp opened. Just tap Send to confirm your booking.", 5000);
  });

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
    form.elements.tests.value = listNames().join(", ");
    form.elements.tests.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /* ---------- Team ---------- */
  const TEAM = DATA.team || [];
  const CERTS = TEAM.map((m) => ({ src: m.cert, caption: `${m.name}: Thyrocare Certificate of Training` }));
  $("#teamGrid").innerHTML = TEAM.map((m, i) => `
    <button class="member reveal${m.lead ? " member--lead" : ""}" ${m.cert ? `data-cert="${i}"` : "disabled"} aria-label="${m.cert ? `View ${esc(m.name)}'s Thyrocare certificate` : esc(m.name)}">
      <span class="member__av" aria-hidden="true">${esc(initials(m.name))}
        <span class="member__badge"><svg class="ic"><use href="#${m.isDoctor ? "h-stethoscope" : "h-syringe"}"/></svg></span>
      </span>
      <span class="member__body">
        <span class="member__name">${esc(m.name)}</span>
        <span class="member__role">${esc(m.role)}</span>
        ${m.cert ? '<span class="member__cert"><svg class="ic"><use href="#i-award"/></svg>View certificate</span>' : ""}
      </span>
    </button>`).join("");
  if (!TEAM.length) $("#team").hidden = true;

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
    if (b) openLb(CERTS.filter((c) => c.src), CERTS.filter((c) => c.src).indexOf(CERTS[+b.dataset.cert]));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-lightbox]")) return;
    openLb([
      { src: "/assets/img/jaanch-rates-1.jpg", caption: "Thyrocare Jaanch rate card (1/2)" },
      { src: "/assets/img/jaanch-rates-2.jpg", caption: "Thyrocare Jaanch rate card (2/2)" },
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
  syncFromListHint();
  observeReveals();
  bookFromUrl();
})();
