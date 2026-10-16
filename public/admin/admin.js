/* ==========================================================
   Thyrocare UP166 · Admin panel
   Made for a non-technical owner: plain words, few buttons,
   optional fields tucked under "More options".
   ========================================================== */
(() => {
  "use strict";

  /* ---------- Small helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = (n) => (n || n === 0 ? "₹" + Number(n).toLocaleString("en-IN") : "Ask for rate");
  const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const phoneDisplay = (p) => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p || "");
  let uid = 0;
  const nextId = () => `f${++uid}`;
  function ago(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
    if (s < 172800) return "yesterday";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const S = { me: null, settings: {}, concerns: [], items: [], team: [], faqs: [], newLeads: 0 };
  const app = $("#app");

  let toastT;
  function toast(msg, err = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("is-err", err);
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-on"), err ? 5000 : 2600);
  }

  async function api(method, url, body) {
    const init = { method, credentials: "same-origin", headers: {} };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(url, init); } catch { throw new Error("No internet connection. Please check and try again."); }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (res.status === 401 && !url.endsWith("/login")) {
      const wasIn = !!S.me;
      S.me = null;
      closeAllModals();
      renderLogin(wasIn ? "You were signed out. Please sign in again." : "");
      throw new Error("signed-out");
    }
    if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  }
  // Run an action from a button: disable it while working, show any error as a message.
  async function run(btn, fn) {
    if (btn) btn.disabled = true;
    try { return await fn(); }
    catch (e) { if (e.message !== "signed-out") toast(e.message, true); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  /* ---------- Images: shrink in the browser, then upload ---------- */
  function shrink(file, max = 1600, quality = 0.86) {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b && b.size < file.size ? b : file), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function uploadImage(file, onProgress) {
    return shrink(file).then((blob) => new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", blob, (file.name || "image").replace(/\.\w+$/, "") + ".jpg");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/media");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let d = {}; try { d = JSON.parse(xhr.responseText); } catch { /* */ }
        xhr.status < 300 ? resolve(d) : reject(new Error(d.error || "Upload failed. Please try again."));
      };
      xhr.onerror = () => reject(new Error("Upload failed. Please check your internet."));
      xhr.send(fd);
    }));
  }

  // Photo picker for forms. The uploaded photo's id is kept in a hidden input.
  function photoPicker({ name, id, url, label, wide = false, help = "" }) {
    const node = el(`
      <div class="field">
        <span>${esc(label)}</span>
        <div class="uploader">
          <button type="button" class="uploader__prev${wide ? " uploader__prev--wide" : ""}" data-pick aria-label="Choose photo">${url ? `<img src="${esc(url)}" alt="" />` : `${ic("a-upload")}<small>Tap to add photo</small>`}</button>
          <div class="uploader__acts">
            <input type="hidden" name="${name}" value="${esc(id || "")}" />
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
            <button type="button" class="btn btn--sm" data-pick>${ic("a-upload")}<span>${url ? "Change photo" : "Choose photo"}</span></button>
            <div class="progress" hidden><i></i></div>
            ${help ? `<small class="muted">${esc(help)}</small>` : ""}
          </div>
        </div>
      </div>`);
    const file = $('input[type="file"]', node), hidden = $('input[type="hidden"]', node), prev = $(".uploader__prev", node);
    const bar = $(".progress", node);
    $$("[data-pick]", node).forEach((b) => b.addEventListener("click", () => file.click()));
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      bar.hidden = false; node.dataset.busy = "1";
      $$("[data-pick]", node).forEach((b) => { b.disabled = true; });
      try {
        const res = await uploadImage(f, (p) => { $("i", bar).style.width = p + "%"; });
        hidden.value = res.id;
        prev.innerHTML = `<img src="${esc(res.url)}" alt="" />`;
        $("[data-pick] span", node).textContent = "Change photo";
        toast("Photo uploaded. Press Save to keep it.");
      } catch (e) { toast(e.message, true); }
      finally {
        bar.hidden = true; $("i", bar).style.width = "0"; delete node.dataset.busy; file.value = "";
        $$("[data-pick]", node).forEach((b) => { b.disabled = false; });
      }
    });
    return node;
  }

  const switchHtml = (name, on, label) =>
    `<label class="switch"><input type="checkbox" name="${name}" ${on ? "checked" : ""} /><i></i><span>${esc(label)}</span></label>`;

  /* ---------- Pop-up windows ---------- */
  function closeAllModals() { $$("dialog[open]").forEach((d) => d.close()); }

  // Returns a promise: true when saved, false when cancelled, "deleted" after onDelete.
  function modal({ title, body, okText = "Save", size = "", danger = false, onOk, onDelete, deleteText = "Delete" }) {
    return new Promise((resolve) => {
      const tid = nextId();
      const d = el(`
        <dialog class="modal ${size}" aria-labelledby="${tid}">
          <div class="modal__head"><h3 id="${tid}">${esc(title)}</h3><button type="button" class="iconbtn" data-x aria-label="Close">${ic("a-x")}</button></div>
          <form class="modal__body form" novalidate></form>
          <div class="modal__foot">
            ${onDelete ? `<button type="button" class="btn btn--danger" data-del>${ic("a-trash")}${esc(deleteText)}</button><span class="spacer"></span>` : ""}
            <button type="button" class="btn" data-x>Cancel</button>
            <button type="button" class="btn ${danger ? "btn--dangerfill" : "btn--primary"}" data-ok>${esc(okText)}</button>
          </div>
        </dialog>`);
      const form = $("form", d);
      if (typeof body === "string") form.innerHTML = body; else form.append(body);
      document.body.append(d);
      let result = false;
      const close = (v) => { result = v; if (d.open) d.close(); };
      d.addEventListener("close", () => { d.remove(); resolve(result); });
      $$("[data-x]", d).forEach((b) => b.addEventListener("click", () => close(false)));
      const busy = () => $("[data-busy]", d) && (toast("Please wait, the photo is still uploading", true), true);
      const ok = $("[data-ok]", d);
      const submit = async () => {
        if (busy()) return;
        if (!onOk) return close(true);
        ok.disabled = true;
        try { const r = await onOk(form, d); if (r !== false) close(r ?? true); }
        catch (e) { if (e.message !== "signed-out") toast(e.message, true); }
        finally { ok.disabled = false; }
      };
      ok.addEventListener("click", submit);
      form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
      $("[data-del]", d)?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try { if (await onDelete()) close("deleted"); }
        catch (ex) { if (ex.message !== "signed-out") toast(ex.message, true); }
        finally { btn.disabled = false; }
      });
      d.showModal();
      setTimeout(() => $("input:not([type=hidden]):not([type=file]):not([type=checkbox]), textarea", form)?.focus(), 30);
    });
  }
  const confirmBox = (msg, okText = "Yes, delete") =>
    modal({ title: "Are you sure?", body: `<p>${esc(msg)}</p>`, okText, danger: true, size: "modal--sm" });

  function viewImage(src) {
    const d = el(`<dialog class="viewer" aria-label="Photo"><button class="iconbtn" aria-label="Close">${ic("a-x")}</button><img src="${esc(src)}" alt="" /></dialog>`);
    document.body.append(d);
    d.addEventListener("click", () => d.close());
    d.addEventListener("close", () => d.remove());
    d.showModal();
  }

  /* ---------- Sign in ---------- */
  function renderLogin(message = "") {
    document.title = "Sign in · Thyrocare UP166";
    app.innerHTML = `
      <div class="login">
        <div class="login__art">
          <img class="login__logo" src="/assets/img/thyrocare-logo.png" alt="Thyrocare" />
          <div>
            <h1>Manage your website, <span>in minutes.</span></h1>
            <ul>
              <li>${ic("a-check")}Change prices and health checkup posters</li>
              <li>${ic("a-check")}See every booking and prescription</li>
              <li>${ic("a-check")}Update offers and phone numbers</li>
            </ul>
          </div>
          <p class="login__foot">Thyrocare Authorised Service Centre · UP166 Lucknow</p>
        </div>
        <div class="login__form">
          <form class="login__card form" novalidate>
            <div><h2>Welcome</h2><p class="muted">Sign in to manage your website</p></div>
            <div class="login__err" role="alert" ${message ? "" : "hidden"}>${esc(message)}</div>
            <label class="field"><span>Username</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required /></label>
            <label class="field"><span>Password</span><div class="pw"><input name="password" type="password" autocomplete="current-password" required /><button type="button" aria-label="Show password">${ic("a-eye")}</button></div></label>
            <button class="btn btn--primary btn--lg btn--block" type="submit">Sign in</button>
            <a class="muted login__back" href="/">← Back to website</a>
          </form>
        </div>
      </div>`;
    const f = $("form", app), err = $(".login__err", app);
    wirePw(f);
    f.elements.username.focus();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!f.elements.username.value.trim() || !f.elements.password.value) {
        err.hidden = false; err.textContent = "Please enter your username and password."; return;
      }
      const btn = $("[type=submit]", f);
      btn.disabled = true; btn.textContent = "Signing in…";
      try {
        const { me } = await api("POST", "/api/admin/auth/login", { username: f.elements.username.value, password: f.elements.password.value });
        S.me = me;
        await start();
      } catch (ex) {
        err.hidden = false; err.textContent = ex.message;
        btn.disabled = false; btn.textContent = "Sign in";
      }
    });
  }
  function wirePw(root) {
    $$(".pw button", root).forEach((b) => b.addEventListener("click", () => {
      const i = $("input", b.parentNode);
      const show = i.type === "password";
      i.type = show ? "text" : "password";
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    }));
  }

  /* ---------- Layout & menu ---------- */
  const NAV = [
    ["home", "Home", "a-dash"],
    ["requests", "Requests", "a-inbox"],
    ["checkups", "Health Checkups", "a-poster"],
    ["prices", "Tests & Prices", "a-flask"],
    ["info", "Website Info", "a-gear"],
    ["people", "Team & FAQs", "a-team"],
    ["password", "Password", "a-lock"],
  ];
  const TABBAR = [["home", "Home", "a-dash"], ["requests", "Requests", "a-inbox"], ["checkups", "Checkups", "a-poster"], ["prices", "Prices", "a-flask"]];
  const mobile = window.matchMedia("(max-width: 860px)");

  function renderShell() {
    app.innerHTML = `
      <div class="shell">
        <aside class="side" id="sideMenu" aria-label="Menu">
          <div class="side__brand"><img src="/assets/img/thyrocare-logo.png" alt="Thyrocare" /><small>Admin<br />UP166</small><button class="iconbtn side__close" data-closemenu aria-label="Close menu">${ic("a-x")}</button></div>
          <nav>${NAV.map(([k, label, icon]) => `<a href="#/${k}" data-nav="${k}">${ic(icon)}<span>${label}</span>${k === "requests" ? '<span class="badge" data-newbadge hidden></span>' : ""}</a>`).join("")}</nav>
          <div class="side__foot">
            <a href="/" target="_blank" rel="noopener">${ic("a-ext")}<span>Open my website</span></a>
            <a href="#" data-logout>${ic("a-out")}<span>Sign out</span></a>
            <div class="side__user">Signed in as <b>${esc(S.me.username)}</b></div>
          </div>
        </aside>
        <div class="scrim" data-scrim></div>
        <div class="main">
          <header class="topbar">
            <h1 data-title></h1>
            <div class="topbar__actions" data-actions></div>
          </header>
          <div class="content" data-content></div>
        </div>
        <nav class="tabbar" aria-label="Main">
          ${TABBAR.map(([k, label, icon]) => `<a href="#/${k}" data-nav="${k}">${ic(icon)}<span>${label}</span>${k === "requests" ? '<span class="badge" data-newbadge hidden></span>' : ""}</a>`).join("")}
          <button type="button" data-menu aria-controls="sideMenu" aria-expanded="false">${ic("a-menu")}<span>More</span></button>
        </nav>
      </div>`;
    const shell = $(".shell", app), side = $("#sideMenu", app), menuBtn = $("[data-menu]", app);
    const setMenu = (open) => {
      shell.classList.toggle("is-menu", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      side.inert = mobile.matches && !open; // closed drawer can't be reached with Tab
    };
    setMenu(false);
    mobile.addEventListener("change", () => setMenu(false));
    menuBtn.addEventListener("click", () => setMenu(true));
    $("[data-closemenu]", app).addEventListener("click", () => setMenu(false));
    $("[data-scrim]", app).addEventListener("click", () => setMenu(false));
    $$(".side a", app).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    $("[data-logout]", app).addEventListener("click", async (e) => {
      e.preventDefault();
      await api("POST", "/api/admin/auth/logout").catch(() => {});
      S.me = null; history.replaceState(null, "", "/admin"); renderLogin();
    });
    updateBadge();
  }

  // Each page gets a brand-new content box, so no old click handlers are left behind.
  function page(title, actions = "", intro = "") {
    $("[data-title]", app).textContent = title;
    $("[data-actions]", app).innerHTML = actions;
    $$("[data-nav]", app).forEach((a) => {
      const on = a.dataset.nav === currentRoute();
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = `${title} · Admin`;
    updateBadge();
    const old = $("[data-content]", app);
    const c = old.cloneNode(false);
    old.replaceWith(c);
    if (intro) c.append(el(`<p class="intro">${intro}</p>`));
    window.scrollTo(0, 0);
    return c;
  }
  const currentRoute = () => (location.hash.replace(/^#\/?/, "").split("?")[0] || "home");
  const routeParam = (k) => new URLSearchParams(location.hash.split("?")[1] || "").get(k);

  function route() {
    if (!S.me) return;
    closeAllModals();
    let r = currentRoute();
    if (S.me.mustChange && r !== "password") { location.hash = "#/password"; return; }
    if (!VIEWS[r]) { location.hash = "#/home"; return; }
    VIEWS[r]();
  }
  window.addEventListener("hashchange", route);

  function updateBadge() {
    $$("[data-newbadge]", app).forEach((b) => { b.hidden = !S.newLeads; b.textContent = S.newLeads; });
    document.title = document.title.replace(/^\(\d+\) /, "");
    if (S.newLeads) document.title = `(${S.newLeads}) ${document.title}`;
  }
  // Look for new requests every minute.
  setInterval(async () => {
    if (!S.me || S.me.mustChange || document.hidden) return;
    try {
      const { counts } = await api("GET", "/api/admin/leads?status=new");
      const n = counts.new || 0;
      if (n > S.newLeads) toast(`🔔 You have ${n - S.newLeads} new request${n - S.newLeads > 1 ? "s" : ""}`);
      S.newLeads = n; updateBadge();
    } catch { /* offline: try again next minute */ }
  }, 60000);

  async function start() {
    renderShell();
    if (!S.me.mustChange) Object.assign(S, await api("GET", "/api/admin/bootstrap"));
    updateBadge();
    route();
  }

  /* ==========================================================
     PAGES
     ========================================================== */
  const VIEWS = {};
  const LEAD_TEXT = { booking: "Wants a home collection", prescription: "Sent a prescription", enquiry: "Asked rates for a test list" };
  const LEAD_ICON = { booking: "a-cal", prescription: "a-file", enquiry: "a-list" };
  const isDone = (l) => l.status === "done" || l.status === "contacted";

  /* ---------- Home ---------- */
  VIEWS.home = async () => {
    const c = page("Home");
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    c.insertAdjacentHTML("beforeend", `
      <div class="hello">
        <div><h2>${greet} 👋</h2><p>What would you like to do today?</p></div>
      </div>
      <a class="bigcard" href="#/requests" data-big>
        <span class="bigcard__ic">${ic("a-inbox")}</span>
        <span><b data-n>…</b><span>new requests waiting</span></span>
        <span class="bigcard__go">Open ${ic("a-ext")}</span>
      </a>
      <div class="tiles">
        <a href="#/prices">${ic("a-flask")}<b>Change a price</b><span>Tests & packages</span></a>
        <a href="#/checkups?new=1">${ic("a-poster")}<b>Add a health checkup</b><span>Upload a new poster</span></a>
        <a href="#/info">${ic("a-gear")}<b>Change offer or phone</b><span>Banner, numbers, address</span></a>
        <a href="/" target="_blank" rel="noopener">${ic("a-ext")}<b>Open my website</b><span>See it like a visitor</span></a>
      </div>
      <section class="panel">
        <div class="panel__head"><h2>Latest requests</h2><span class="spacer"></span><a class="btn btn--sm btn--ghost" href="#/requests">See all</a></div>
        <div data-recent><div class="loading loading--sm"><div class="spinner"></div></div></div>
      </section>`);
    try {
      const { leads, counts, weekBookings } = await api("GET", "/api/admin/leads");
      if (!c.isConnected) return;
      S.newLeads = counts.new || 0; updateBadge();
      $("[data-n]", c).textContent = S.newLeads;
      $("[data-big]", c).classList.toggle("is-zero", !S.newLeads);
      $("[data-big] b + span", c).textContent = S.newLeads
        ? `new request${S.newLeads === 1 ? "" : "s"} waiting`
        : `new requests · ${weekBookings} booking${weekBookings === 1 ? "" : "s"} this week`;
      const recent = leads.slice(0, 5);
      $("[data-recent]", c).innerHTML = recent.length ? recent.map((l) => `
        <a class="mini" href="#/requests">
          <span class="mini__ic">${ic(LEAD_ICON[l.type])}</span>
          <span class="mini__body"><b>${esc(l.name || "No name")} ${isDone(l) ? '<span class="pill pill--green">Done</span>' : '<span class="pill pill--red">New</span>'}</b><small>${esc(LEAD_TEXT[l.type])} · ${ago(l.createdAt)}</small></span>
        </a>`).join("") : `<div class="empty">${ic("a-inbox")}<p>No requests yet. When someone books or sends a prescription, it shows here.</p></div>`;
    } catch (e) {
      if (c.isConnected && e.message !== "signed-out") $("[data-recent]", c).innerHTML = `<p class="note note--red">Could not load requests. ${esc(e.message)}</p>`;
    }
  };

  /* ---------- Requests ---------- */
  VIEWS.requests = () => {
    const c = page("Requests", "", "Every booking, prescription and enquiry from your website. Call or WhatsApp the patient, then tap <b>Mark as done</b>.");
    const st = { status: routeParam("status") || "new", q: "", page: 0, leads: [], total: 0 };
    c.insertAdjacentHTML("beforeend", `
      <div class="toolbar">
        <div class="seg" role="tablist" aria-label="Show">
          <button type="button" data-v="new">New <em data-cnt></em></button><button type="button" data-v="done">Done</button><button type="button" data-v="">All</button>
        </div>
        <label class="search">${ic("a-search")}<input type="search" placeholder="Search name or mobile" aria-label="Search requests" data-q /></label>
      </div>
      <div class="leads" data-list><div class="loading"><div class="spinner"></div></div></div>
      <div class="center"><button type="button" class="btn" data-more hidden>Show more</button></div>`);
    const list = $("[data-list]", c);
    const syncSeg = () => $$(".seg button", c).forEach((b) => { const on = b.dataset.v === st.status; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", String(on)); });
    syncSeg();

    async function load(append = false) {
      try {
        const qs = new URLSearchParams({ status: st.status, q: st.q, page: st.page });
        const res = await api("GET", "/api/admin/leads?" + qs);
        if (!c.isConnected) return;
        st.leads = append ? [...st.leads, ...res.leads] : res.leads;
        st.total = res.total;
        S.newLeads = res.counts.new || 0; updateBadge();
        $("[data-cnt]", c).textContent = S.newLeads || "";
        draw(st.leads.length < st.total);
      } catch (e) {
        if (!c.isConnected || e.message === "signed-out") return;
        list.innerHTML = `<div class="panel empty"><p>Could not load requests. ${esc(e.message)}</p><button type="button" class="btn" data-retry>Try again</button></div>`;
      }
    }
    function draw(maybeMore) {
      list.innerHTML = st.leads.length ? st.leads.map(card).join("")
        : `<div class="panel empty">${ic("a-inbox")}<p>${st.status === "new" ? "No new requests. You're all caught up! 🎉" : "Nothing here yet."}</p></div>`;
      $("[data-more]", c).hidden = !maybeMore;
    }
    function card(l) {
      const row = (label, v) => (v ? `<div><span>${label}</span>${esc(v)}</div>` : "");
      const isImg = /^image\/(jpeg|png|webp|gif)/.test(l.fileType || "");
      const fileUrl = `/api/admin/leads/${l.id}/file`;
      const done = isDone(l);
      const waMsg = `Hi${l.name ? " " + l.name : ""}, this is Thyrocare UP166 Lucknow about your request on our website (Ref ${l.ref}).`;
      return `
        <article class="lead${done ? " is-done" : " is-new"}" data-id="${l.id}">
          <div class="lead__top">
            <span class="lead__ic">${ic(LEAD_ICON[l.type])}</span>
            <div class="lead__who">
              <b>${esc(l.name || "No name given")}</b>
              <small>${esc(LEAD_TEXT[l.type])} · ${ago(l.createdAt)} · Ref ${esc(l.ref)}</small>
            </div>
            ${done ? '<span class="pill pill--green">Done</span>' : '<span class="pill pill--red">New</span>'}
          </div>
          <div class="lead__grid">
            ${row("Mobile", phoneDisplay(l.phone))}
            ${row("Age / gender", [l.age && l.age + " yrs", l.gender].filter(Boolean).join(", "))}
            ${row("Where", l.visit)}
            ${row("Date", l.date)}
            ${row("Time", l.slot)}
            ${row("Address", l.address)}
            ${row("Tests", l.tests || (l.items || []).join(", "))}
          </div>
          ${l.hasFile ? `<div class="lead__file">${isImg ? `<button type="button" class="lead__thumb" data-view="${fileUrl}" aria-label="View prescription"><img src="${fileUrl}" alt="" loading="lazy" /></button>` : ""}<a class="btn btn--sm" href="${fileUrl}" target="_blank" rel="noopener">${ic("a-file")}Open prescription</a></div>` : ""}
          <label class="lead__note"><span class="sr">Private note</span><textarea placeholder="Write a private note (e.g. called, coming at 8 AM)" data-note rows="1">${esc(l.note || "")}</textarea></label>
          <div class="lead__acts">
            ${l.phone ? `<a class="btn" href="tel:+91${esc(l.phone)}">${ic("a-phone")}Call</a><a class="btn btn--wa" target="_blank" rel="noopener" href="https://wa.me/91${esc(l.phone)}?text=${encodeURIComponent(waMsg)}">${ic("a-wa")}WhatsApp</a>` : '<span class="muted lead__nophone">No mobile number. They will message you on WhatsApp.</span>'}
            <span class="spacer"></span>
            <button type="button" class="btn ${done ? "" : "btn--primary"}" data-done>${done ? "Move back to New" : ic("a-check") + "Mark as done"}</button>
            <button type="button" class="iconbtn iconbtn--danger" data-del aria-label="Delete request">${ic("a-trash")}</button>
          </div>
        </article>`;
    }

    $(".seg", c).addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      st.status = b.dataset.v; st.page = 0; syncSeg(); load();
    });
    $("[data-q]", c).addEventListener("input", debounce((e) => { st.q = e.target.value; st.page = 0; load(); }, 300));
    $("[data-more]", c).addEventListener("click", (e) => run(e.currentTarget, () => { st.page++; return load(true); }));
    list.addEventListener("click", async (e) => {
      if (e.target.closest("[data-retry]")) return load();
      const v = e.target.closest("[data-view]"); if (v) return viewImage(v.dataset.view);
      const cardEl = e.target.closest("[data-id]"); if (!cardEl) return;
      const l = st.leads.find((x) => x.id === cardEl.dataset.id);
      const doneBtn = e.target.closest("[data-done]");
      if (doneBtn) return run(doneBtn, async () => {
        const status = isDone(l) ? "new" : "done";
        await api("PATCH", `/api/admin/leads/${l.id}`, { status });
        toast(status === "done" ? "Marked as done ✓" : "Moved back to New");
        st.page = 0; await load();
      });
      const del = e.target.closest("[data-del]");
      if (del && (await confirmBox("Delete this request? This cannot be undone. Any prescription photo is deleted too."))) {
        run(del, async () => { await api("DELETE", `/api/admin/leads/${l.id}`); toast("Request deleted"); await load(); });
      }
    });
    list.addEventListener("focusout", (e) => {
      const t = e.target.closest("[data-note]"); if (!t) return;
      const l = st.leads.find((x) => x.id === t.closest("[data-id]").dataset.id);
      if (!l || (l.note || "") === t.value) return;
      run(null, async () => { const u = await api("PATCH", `/api/admin/leads/${l.id}`, { note: t.value }); l.note = u.note; toast("Note saved"); });
    });
    load();
  };

  /* ---------- Items (checkups, packages, tests): shared ---------- */
  const KIND = { profile: "health checkup", package: "package", test: "test" };
  const itemsOf = (type) => S.items.filter((i) => i.type === type).sort((a, b) => a.order - b.order);
  const findItem = (id) => S.items.find((x) => x.id === id);

  async function saveItem(existing, data) {
    const saved = existing ? await api("PUT", `/api/admin/items/${existing.id}`, data) : await api("POST", "/api/admin/items", data);
    const i = S.items.findIndex((x) => x.id === saved.id);
    if (i >= 0) S.items[i] = saved; else S.items.push(saved);
    return saved;
  }
  async function deleteItem(item) {
    if (!(await confirmBox(`Delete "${item.name}"? It will be removed from your website. (Tip: to hide it for a while instead, turn off "Show on website".)`))) return false;
    await api("DELETE", `/api/admin/items/${item.id}`);
    S.items = S.items.filter((x) => x.id !== item.id);
    toast("Deleted");
    return true;
  }

  // Editor for "tests included": sections, each with a list of tests.
  function sectionsEditor(groups) {
    const box = el(`<div class="field"><span>Tests included <em>(optional)</em></span>
      <small class="muted">Add a section (e.g. "Lipid Profile") and write one test per line. For something like CBC, write the number of tests instead.</small>
      <div class="groups"></div>
      <button type="button" class="btn btn--sm" data-addgrp>${ic("a-plus")}Add section</button></div>`);
    const list = $(".groups", box);
    const add = (g = { name: "", count: "", items: [] }) => {
      const fixed = !(g.items || []).length && g.count;
      const n = el(`<div class="grp">
        <div class="grp__head">
          <label class="field"><span>Section name</span><input data-gname value="${esc(g.name)}" placeholder="e.g. Lipid Profile" maxlength="140" /></label>
          <label class="field grp__count"><span>No. of tests</span><input data-gcount inputmode="numeric" value="${fixed ? esc(g.count) : ""}" placeholder="auto" /></label>
          <button type="button" class="iconbtn iconbtn--danger" data-delgrp aria-label="Remove section">${ic("a-trash")}</button>
        </div>
        <label class="field"><span class="sr">Tests in this section</span><textarea data-gitems rows="3" placeholder="One test per line">${esc((g.items || []).join("\n"))}</textarea></label>
      </div>`);
      $("[data-delgrp]", n).addEventListener("click", () => n.remove());
      list.append(n);
      return n;
    };
    (groups || []).forEach(add);
    $("[data-addgrp]", box).addEventListener("click", () => $("[data-gname]", add()).focus());
    box.read = () => $$(".grp", list).map((g) => ({ name: $("[data-gname]", g).value, count: $("[data-gcount]", g).value, items: $("[data-gitems]", g).value }))
      .filter((g) => g.name.trim());
    return box;
  }

  function concernChips(selected) {
    return `<div class="field"><span>Show when visitors tap a health concern</span><div class="chips">${S.concerns.map((c) =>
      `<label class="chipbox"><input type="checkbox" name="concerns" value="${c.key}" ${selected?.includes(c.key) ? "checked" : ""} /><span>${esc(c.label)}</span></label>`).join("")}</div></div>`;
  }

  // One form for all three kinds. Only the must-have fields are shown; the rest sit under "More options".
  function editItem(type, item) {
    const it = item || { type, visible: true, concerns: [], groups: [], category: type === "profile" ? "Health Checkup" : "" };
    const isCheckup = type === "profile";
    const cats = [...new Set(S.items.filter((x) => x.type === type).map((x) => x.category).filter(Boolean))].sort();
    const listId = nextId();
    const form = el(`<div class="form">
      ${isCheckup ? "<div data-photo></div>" : ""}
      <label class="field"><span>Name</span><input name="name" value="${esc(it.name)}" maxlength="160" placeholder="${isCheckup ? "e.g. Aarogyam B Pro" : type === "package" ? "e.g. Thyroid Profile Basic" : "e.g. Vitamin D"}" /></label>
      <div class="grid2">
        <label class="field"><span>Price (₹)</span><input name="price" inputmode="decimal" value="${it.price ?? ""}" placeholder="Empty = Ask for rate" /></label>
        ${isCheckup ? `<label class="field"><span>Number of tests</span><input name="params" inputmode="numeric" value="${it.params ?? ""}" placeholder="e.g. 59" /></label>` : ""}
      </div>
      <div class="toggles">
        ${switchHtml("visible", it.visible !== false, "Show on website")}
        ${switchHtml("best", it.best, isCheckup ? "Show “Most popular” badge" : "Show “Best value” badge")}
      </div>
      <div data-sections></div>
      <details class="more">
        <summary>More options <em>(optional)</em></summary>
        <div class="form">
          <div class="grid2">
            <label class="field"><span>Old price (₹) <em>shown crossed out</em></span><input name="mrp" inputmode="decimal" value="${it.mrp ?? ""}" /></label>
            ${isCheckup ? "" : `<label class="field"><span>Number of tests</span><input name="params" inputmode="numeric" value="${it.params ?? ""}" /></label>`}
            ${isCheckup ? "" : `<label class="field"><span>Group</span><input name="category" value="${esc(it.category)}" list="${listId}" maxlength="60" placeholder="e.g. Thyroid" /><datalist id="${listId}">${cats.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label>`}
          </div>
          ${isCheckup ? `<label class="field"><span>Headline <em>(from the poster)</em></span><input name="tagline" value="${esc(it.tagline)}" maxlength="240" /></label>` : ""}
          <label class="field"><span>Short description</span><textarea name="desc" maxlength="1200" rows="2">${esc(it.desc)}</textarea></label>
          <label class="field"><span>Note <em>(e.g. fasting, offer validity)</em></span><input name="note" value="${esc(it.note)}" maxlength="240" /></label>
          ${switchHtml("fasting", it.fasting, "Fasting needed")}
          ${concernChips(it.concerns)}
          <label class="field"><span>Thyrocare code</span><input name="code" value="${esc(it.code)}" maxlength="40" /></label>
        </div>
      </details>
    </div>`);
    if (isCheckup) $("[data-photo]", form).replaceWith(photoPicker({ name: "image", id: it.image, url: it.imageUrl, label: "Poster", help: "The Thyrocare poster (JPG or PNG). Visitors see this on your website." }));
    let sections = null;
    if (type !== "test") { sections = sectionsEditor(it.groups); $("[data-sections]", form).replaceWith(sections); }
    else $("[data-sections]", form).remove();

    return modal({
      title: item ? `Edit ${KIND[type]}` : `Add a ${KIND[type]}`,
      body: form,
      okText: "Save",
      onDelete: item ? () => deleteItem(item) : null,
      onOk: async (f) => {
        const v = (n) => f.elements[n]?.value ?? "";
        const data = {
          type, name: v("name"), price: v("price"), mrp: v("mrp"), params: v("params"),
          category: isCheckup ? it.category || "Health Checkup" : v("category"),
          tagline: isCheckup ? v("tagline") : it.tagline || "", desc: v("desc"), note: v("note"), code: v("code"),
          concerns: $$("[name=concerns]:checked", f).map((x) => x.value),
          visible: f.elements.visible.checked, best: f.elements.best.checked, fasting: f.elements.fasting.checked,
          image: isCheckup ? v("image") || null : it.image || null,
          groups: sections ? sections.read() : it.groups || [],
        };
        if (!data.name.trim()) throw new Error("Please write a name");
        if (data.price && !/^\s*[\d,.\s₹]+$/.test(data.price)) throw new Error("Price should be a number, like 1999");
        if (isCheckup && !data.image) throw new Error("Please add the poster photo");
        await saveItem(item, data);
        toast(item ? "Saved ✓ Your website is updated." : "Added ✓ It's now on your website.");
      },
    });
  }

  /* ---------- Health Checkups (posters) ---------- */
  VIEWS.checkups = () => {
    const c = page("Health Checkups", `<button type="button" class="btn btn--primary" data-add>${ic("a-plus")}<span>Add</span></button>`,
      "The poster checkups (Aarogyam, Jaanch…) on your website. Tap a poster to change its price or tests.");
    const grid = el('<div class="pgrid"></div>');
    c.append(grid);
    function draw() {
      const arr = itemsOf("profile");
      grid.innerHTML = arr.map((p, i) => `
        <article class="pcard${p.visible ? "" : " is-hidden"}" data-id="${p.id}">
          <button type="button" class="pcard__img" data-edit aria-label="Edit ${esc(p.name)}">
            ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="" loading="lazy" />` : '<span class="pcard__noimg">No poster</span>'}
            ${!p.visible ? '<span class="pill">Hidden</span>' : p.best ? '<span class="pill pill--green">Most popular</span>' : ""}
          </button>
          <div class="pcard__body">
            <b>${esc(p.name)}</b>
            <div class="pcard__meta"><span>${p.params ? p.params + " tests" : ""}</span><strong>${inr(p.price)}</strong></div>
          </div>
          <div class="pcard__acts">
            <label class="switch switch--sm"><input type="checkbox" data-vis ${p.visible ? "checked" : ""} aria-label="Show ${esc(p.name)} on website" /><i></i><span>On website</span></label>
            <span class="spacer"></span>
            <button type="button" class="iconbtn" data-mv="-1" aria-label="Move earlier" title="Move earlier" ${i === 0 ? "disabled" : ""}>${ic("a-left")}</button>
            <button type="button" class="iconbtn" data-mv="1" aria-label="Move later" title="Move later" ${i === arr.length - 1 ? "disabled" : ""}>${ic("a-right")}</button>
          </div>
          <button type="button" class="btn btn--block pcard__edit" data-edit>${ic("a-edit")}Edit</button>
        </article>`).join("") + `<button type="button" class="pcard pcard--add" data-add>${ic("a-plus")}<span>Add a health checkup</span></button>`;
    }
    draw();
    const open = async (item) => { if (await editItem("profile", item)) draw(); };
    $("[data-actions] [data-add]", app).addEventListener("click", () => open());
    grid.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return open();
      const card = e.target.closest("[data-id]"); if (!card) return;
      const item = findItem(card.dataset.id);
      if (e.target.closest("[data-edit]")) return open(item);
      const mv = e.target.closest("[data-mv]");
      if (mv) run(mv, async () => {
        const arr = itemsOf("profile"), i = arr.indexOf(item), j = i + +mv.dataset.mv;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        arr.forEach((x, k) => { x.order = k; });
        draw();
        await api("POST", "/api/admin/items/reorder", { ids: arr.map((x) => x.id) });
        toast("Order changed ✓");
      });
    });
    grid.addEventListener("change", (e) => {
      const v = e.target.closest("[data-vis]"); if (!v) return;
      const item = findItem(v.closest("[data-id]").dataset.id);
      run(v, async () => { await saveItem(item, { visible: v.checked }); draw(); toast(v.checked ? "Now showing on your website" : "Hidden from your website"); })
        .then(() => { if (item.visible !== v.checked) draw(); });
    });
    if (routeParam("new")) { history.replaceState(null, "", "#/checkups"); open(); }
  };

  /* ---------- Tests & Prices ---------- */
  VIEWS.prices = () => {
    let type = routeParam("type") === "test" ? "test" : "package";
    let q = "";
    const c = page("Tests & Prices", `<button type="button" class="btn btn--primary" data-add>${ic("a-plus")}<span>Add</span></button>`,
      "To change a price, type the new price and tap outside the box. It saves by itself. Leave the price empty to show <b>Ask for rate</b>.");
    c.insertAdjacentHTML("beforeend", `
      <div class="toolbar">
        <div class="seg" role="tablist" aria-label="Show"><button type="button" data-v="package">Packages</button><button type="button" data-v="test">Single tests</button></div>
        <label class="search">${ic("a-search")}<input type="search" placeholder="Search…" aria-label="Search tests" data-q /></label>
      </div>
      <div class="plist" data-rows></div>`);
    const rows = $("[data-rows]", c);
    function draw() {
      $$(".seg button", c).forEach((b) => { const on = b.dataset.v === type; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", String(on)); });
      const all = itemsOf(type);
      const arr = q ? all.filter((x) => (x.name + " " + x.code + " " + x.category).toLowerCase().includes(q.toLowerCase())) : all;
      rows.innerHTML = arr.length ? arr.map((x) => `
        <div class="prow${x.visible ? "" : " is-hidden"}" data-id="${x.id}">
          <button type="button" class="prow__name" data-edit><b>${esc(x.name)}</b><small>${esc(x.category || "")}${x.visible ? "" : " · Hidden"}</small></button>
          <label class="price-in"><span aria-hidden="true">₹</span><input data-price inputmode="decimal" value="${x.price ?? ""}" placeholder="Ask" aria-label="Price of ${esc(x.name)}" /></label>
          <label class="switch switch--sm"><input type="checkbox" data-vis ${x.visible ? "checked" : ""} aria-label="Show ${esc(x.name)} on website" /><i></i><span class="prow__lbl">On website</span></label>
          <button type="button" class="iconbtn" data-edit aria-label="Edit ${esc(x.name)}">${ic("a-edit")}</button>
        </div>`).join("") : `<div class="empty">${ic("a-flask")}<p>${q ? "Nothing found. Try another word." : "Nothing here yet. Tap Add."}</p></div>`;
    }
    draw();
    const open = async (item) => { if (await editItem(type, item)) draw(); };
    $("[data-actions] [data-add]", app).addEventListener("click", () => open());
    $(".seg", c).addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { type = b.dataset.v; draw(); } });
    $("[data-q]", c).addEventListener("input", debounce((e) => { q = e.target.value.trim(); draw(); }, 200));
    rows.addEventListener("click", (e) => {
      const r = e.target.closest("[data-id]"); if (!r) return;
      if (e.target.closest("[data-edit]")) open(findItem(r.dataset.id));
    });
    const savePrice = (inp) => {
      const item = findItem(inp.closest("[data-id]").dataset.id);
      const raw = inp.value.trim();
      if (raw && !/^[\d,.\s₹]+$/.test(raw)) { toast("Price should be a number, like 1999", true); inp.value = item.price ?? ""; return; }
      const cleaned = raw.replace(/[₹,\s]/g, "");
      if (String(item.price ?? "") === cleaned) return;
      run(null, async () => {
        const saved = await saveItem(item, { price: cleaned });
        inp.value = saved.price ?? "";
        inp.parentNode.classList.add("is-saved");
        setTimeout(() => inp.parentNode.classList.remove("is-saved"), 1500);
        toast(`Saved ✓ ${saved.name}: ${inr(saved.price)}`);
      });
    };
    rows.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-price]")) { e.preventDefault(); e.target.blur(); } });
    rows.addEventListener("focusout", (e) => { if (e.target.matches("[data-price]")) savePrice(e.target); });
    rows.addEventListener("change", (e) => {
      const v = e.target.closest("[data-vis]"); if (!v) return;
      const item = findItem(v.closest("[data-id]").dataset.id);
      run(v, async () => { await saveItem(item, { visible: v.checked }); draw(); toast(v.checked ? "Now showing on your website" : "Hidden from your website"); })
        .then(() => { if (item.visible !== v.checked) draw(); });
    });
  };

  /* ---------- Team & FAQs ---------- */
  function listSection({ name, title, help, addLabel, row, form, collect, afterForm, deleteMsg }) {
    const sec = el(`<section class="panel">
      <div class="panel__head"><div><h2>${esc(title)}</h2><p>${esc(help)}</p></div><span class="spacer"></span><button type="button" class="btn btn--primary btn--sm" data-add>${ic("a-plus")}${esc(addLabel)}</button></div>
      <div class="plist" data-rows></div></section>`);
    const rows = $("[data-rows]", sec);
    const arr = () => [...S[name]].sort((a, b) => a.order - b.order);
    const draw = () => {
      const a = arr();
      rows.innerHTML = a.length ? a.map((x) => `
        <div class="prow prow--simple${x.visible ? "" : " is-hidden"}" data-id="${x.id}">
          ${row(x)}
          <label class="switch switch--sm"><input type="checkbox" data-vis ${x.visible ? "checked" : ""} aria-label="Show on website" /><i></i><span class="prow__lbl">On website</span></label>
          <button type="button" class="iconbtn" data-edit aria-label="Edit">${ic("a-edit")}</button>
        </div>`).join("") : `<div class="empty"><p>Nothing here yet.</p></div>`;
    };
    async function save(x, data) {
      const saved = x ? await api("PUT", `/api/admin/${name}/${x.id}`, data) : await api("POST", `/api/admin/${name}`, data);
      const i = S[name].findIndex((y) => y.id === saved.id);
      if (i >= 0) S[name][i] = saved; else S[name].push(saved);
    }
    async function open(x) {
      const body = el(`<div class="form">${form(x || { visible: true })}</div>`);
      afterForm?.(body, x || {});
      const r = await modal({
        title: x ? "Edit" : addLabel, body, okText: "Save",
        onOk: async (f) => { await save(x, collect(f, x || {})); toast("Saved ✓ Your website is updated."); },
        onDelete: x ? async () => {
          if (!(await confirmBox(deleteMsg))) return false;
          await api("DELETE", `/api/admin/${name}/${x.id}`);
          S[name] = S[name].filter((y) => y.id !== x.id);
          toast("Deleted");
          return true;
        } : null,
      });
      if (r) draw();
    }
    draw();
    $("[data-add]", sec).addEventListener("click", () => open());
    rows.addEventListener("click", (e) => {
      const r = e.target.closest("[data-id]"); if (!r) return;
      const x = S[name].find((y) => y.id === r.dataset.id);
      if (e.target.closest("[data-view]")) return viewImage(e.target.closest("[data-view]").dataset.view);
      if (e.target.closest("[data-edit]")) open(x);
    });
    rows.addEventListener("change", (e) => {
      const v = e.target.closest("[data-vis]"); if (!v) return;
      const x = S[name].find((y) => y.id === v.closest("[data-id]").dataset.id);
      run(v, async () => { await save(x, { visible: v.checked }); draw(); toast(v.checked ? "Now showing on your website" : "Hidden from your website"); })
        .then(() => { if (x.visible !== v.checked) draw(); });
    });
    return sec;
  }

  VIEWS.people = () => {
    const c = page("Team & FAQs");
    c.append(listSection({
      name: "team", title: "Team", help: "People shown in “Our team”. Tap a name to change it or its certificate.", addLabel: "Add person",
      deleteMsg: "Remove this person from the website?",
      row: (m) => `<button type="button" class="prow__name prow__name--img" data-edit>
          ${m.certUrl ? `<img src="${esc(m.certUrl)}" alt="" />` : '<span class="prow__noimg"></span>'}
          <span><b>${esc(m.name)}${m.isDoctor ? " · Doctor" : ""}</b><small>${esc(m.role)}</small></span></button>`,
      form: (m) => `
        <label class="field"><span>Full name</span><input name="name" value="${esc(m.name)}" maxlength="100" placeholder="e.g. Ms Anam Fatima" /></label>
        <label class="field"><span>Role / qualification</span><input name="role" value="${esc(m.role)}" maxlength="160" placeholder="e.g. Certified Specimen Collection Technician" /></label>
        <div data-photo></div>
        <div class="toggles">${switchHtml("isDoctor", m.isDoctor, "Doctor")}${switchHtml("visible", m.visible !== false, "Show on website")}</div>`,
      afterForm: (body, m) => $("[data-photo]", body).replaceWith(photoPicker({ name: "cert", id: m.cert, url: m.certUrl, label: "Certificate photo", wide: true, help: "Visitors see it when they tap this person." })),
      collect: (f, m) => {
        if (!f.elements.name.value.trim()) throw new Error("Please write the name");
        return { name: f.elements.name.value, role: f.elements.role.value, cert: f.elements.cert.value || null, isDoctor: f.elements.isDoctor.checked, lead: f.elements.isDoctor.checked || !!m.lead, visible: f.elements.visible.checked };
      },
    }));
    c.append(listSection({
      name: "faqs", title: "Questions & answers", help: "Shown in “Good to know” on your website.", addLabel: "Add question",
      deleteMsg: "Delete this question from the website?",
      row: (q) => `<button type="button" class="prow__name" data-edit><b>${esc(q.q)}</b><small>${esc(q.a.replace(/\*\*/g, "").slice(0, 90))}${q.a.length > 90 ? "…" : ""}</small></button>`,
      form: (q) => `
        <label class="field"><span>Question</span><input name="q" value="${esc(q.q)}" maxlength="240" /></label>
        <label class="field"><span>Answer</span><textarea name="a" rows="5" maxlength="2000">${esc(q.a)}</textarea><small class="muted">Tip: put **two stars** around words to make them <b>bold</b>.</small></label>
        ${switchHtml("visible", q.visible !== false, "Show on website")}`,
      collect: (f) => {
        if (!f.elements.q.value.trim() || !f.elements.a.value.trim()) throw new Error("Please write both the question and the answer");
        return { q: f.elements.q.value, a: f.elements.a.value, visible: f.elements.visible.checked };
      },
    }));
  };

  /* ---------- Website Info ---------- */
  VIEWS.info = () => {
    const s = S.settings;
    const h = s.hero || {}, a = s.announcement || {};
    const stats = [0, 1, 2, 3].map((i) => (s.stats || [])[i] || { value: "", label: "" });
    const c = page("Website Info", `<a class="btn" href="/" target="_blank" rel="noopener">${ic("a-ext")}<span>Open website</span></a>`);
    const field = (name, label, value, extra = "") => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${extra} /></label>`;
    c.insertAdjacentHTML("beforeend", `
      <form class="form" novalidate data-form>
        <section class="panel">
          <div class="panel__head"><div><h2>Offer banner</h2><p>The red strip at the top of your website.</p></div></div>
          ${switchHtml("a_enabled", a.enabled, "Show offer banner")}
          <div class="grid2">
            <label class="field"><span>Offer text</span><input name="a_text" value="${esc(a.text)}" maxlength="200" placeholder="e.g. Full body checkup now ₹1,999" /></label>
            <label class="field"><span>“View offer” button opens</span><select name="a_link">
              ${[["#profiles", "Health checkups"], ["#tests", "Tests & prices"], ["#book", "Booking form"], ["#prescription", "Prescription upload"], ["", "No button"]].map(([v, l]) => `<option value="${v}" ${(a.link || "") === v ? "selected" : ""}>${l}</option>`).join("")}
            </select></label>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><h2>Phone & WhatsApp</h2><p>10-digit mobile numbers, without +91.</p></div></div>
          <div class="grid2">
            ${field("whatsapp", "WhatsApp number <em>(bookings come here)</em>", s.whatsapp, 'inputmode="tel" maxlength="14"')}
            ${field("phone0", "Main call number", (s.phones || [])[0] || "", 'inputmode="tel" maxlength="14"')}
            ${field("phone1", "Second number <em>(optional)</em>", (s.phones || [])[1] || "", 'inputmode="tel" maxlength="14"')}
            ${field("phone2", "Third number <em>(optional)</em>", (s.phones || [])[2] || "", 'inputmode="tel" maxlength="14"')}
          </div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><h2>Address & email</h2></div></div>
          <div class="grid2">
            ${field("address", "Full address", s.address, 'maxlength="300"')}
            ${field("addressShort", "Short address <em>(top of website)</em>", s.addressShort, 'maxlength="80"')}
            ${field("email0", "Email", (s.emails || [])[0] || "", 'type="email" maxlength="120"')}
            ${field("email1", "Second email <em>(optional)</em>", (s.emails || [])[1] || "", 'type="email" maxlength="120"')}
          </div>
          ${field("mapQuery", "Map location <em>(what Google Maps should search)</em>", s.mapQuery, 'maxlength="200"')}
        </section>

        <details class="panel more">
          <summary><b>Homepage text</b> <em>(advanced, rarely needed)</em></summary>
          <div class="form">
            <div class="grid2">
              ${field("h_badge", "Small badge", h.badge, 'maxlength="80"')}
              ${field("h_hindi", "Hindi line", h.hindi, 'maxlength="120"')}
              ${field("h_title", "Big heading (black)", h.title, 'maxlength="120"')}
              ${field("h_highlight", "Big heading (blue)", h.highlight, 'maxlength="120"')}
            </div>
            <label class="field"><span>Intro paragraph</span><textarea name="h_lead" rows="3" maxlength="600">${esc(h.lead)}</textarea><small class="muted">Put **two stars** around words to make them bold.</small></label>
            ${field("topbarNote", "Top line message", s.topbarNote, 'maxlength="100"')}
            <p class="sub">4 highlight boxes under the heading</p>
            <div class="grid2">${stats.map((st, i) => `<div class="pair">${field("st_v" + i, `Box ${i + 1}: big text`, st.value, 'maxlength="24"')}${field("st_l" + i, "small text", st.label, 'maxlength="60"')}</div>`).join("")}</div>
            <p class="sub">Quality points (dark blue section)</p>
            <div class="form" data-facts></div>
            <button type="button" class="btn btn--sm" data-addfact>${ic("a-plus")}Add point</button>
            ${field("footerNote", "Footer line", s.footerNote, 'maxlength="160"')}
            <label class="field"><span>Areas you serve <em>(shown at the bottom of the website, helps Google)</em></span><textarea name="areas" rows="2" maxlength="600">${esc(s.areas)}</textarea></label>
            ${field("seoTitle", "Google search title <em>(best under 60 letters)</em>", s.seoTitle, 'maxlength="120"')}
            <label class="field"><span>Google search description</span><textarea name="seoDescription" rows="2" maxlength="300">${esc(s.seoDescription)}</textarea></label>
          </div>
        </details>

        <div class="savebar"><button class="btn btn--primary btn--lg" type="submit">${ic("a-check")}Save changes</button></div>
      </form>`);
    const f = $("[data-form]", c), facts = $("[data-facts]", c);
    const addFact = (x = { title: "", note: "" }) => {
      const n = el(`<div class="pair pair--del">${field("ft", "Point", x.title, 'maxlength="120"')}${field("fn", "Small note", x.note, 'maxlength="120"')}<button type="button" class="iconbtn iconbtn--danger" aria-label="Remove point">${ic("a-trash")}</button></div>`);
      $("button", n).addEventListener("click", () => n.remove());
      facts.append(n);
    };
    (s.labFacts || []).forEach(addFact);
    $("[data-addfact]", c).addEventListener("click", () => { if ($$(".pair--del", facts).length >= 8) return toast("You can add up to 8 points", true); addFact(); });
    // Warn before leaving with unsaved changes
    let dirty = false;
    f.addEventListener("input", () => { dirty = true; });
    const leave = (e) => { if (dirty && c.isConnected) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const E = f.elements, v = (n) => E[n].value;
      const data = {
        announcement: { enabled: E.a_enabled.checked, text: v("a_text"), link: v("a_link") },
        whatsapp: v("whatsapp"), phones: [v("phone0"), v("phone1"), v("phone2")], emails: [v("email0"), v("email1")],
        address: v("address"), addressShort: v("addressShort"), mapQuery: v("mapQuery"), topbarNote: v("topbarNote"),
        hero: { badge: v("h_badge"), hindi: v("h_hindi"), title: v("h_title"), highlight: v("h_highlight"), lead: v("h_lead") },
        stats: [0, 1, 2, 3].map((i) => ({ value: v("st_v" + i), label: v("st_l" + i) })),
        labFacts: $$(".pair--del", facts).map((n) => ({ title: $("[name=ft]", n).value, note: $("[name=fn]", n).value })),
        footerNote: v("footerNote"), seoTitle: v("seoTitle"), seoDescription: v("seoDescription"), areas: v("areas"),
      };
      if (data.announcement.enabled && !data.announcement.text.trim()) return toast("Please write the offer text, or turn off the banner", true);
      run($("[type=submit]", f), async () => {
        S.settings = await api("PUT", "/api/admin/settings", data);
        dirty = false;
        toast("Saved ✓ Your website is updated.");
      });
    });
  };

  /* ---------- Password ---------- */
  VIEWS.password = () => {
    const forced = S.me.mustChange;
    const c = page("Password");
    c.insertAdjacentHTML("beforeend", `
      <section class="panel narrow">
        ${forced ? '<p class="note note--warn">🔒 Welcome! For safety, please choose your own password first.</p>' : '<p class="intro">Change the password you use to sign in here.</p>'}
        <form class="form" novalidate data-form>
          <label class="field"><span>${forced ? "Password you just used" : "Current password"}</span><div class="pw"><input name="currentPassword" type="password" autocomplete="current-password" /><button type="button" aria-label="Show password">${ic("a-eye")}</button></div></label>
          <label class="field"><span>New password</span><div class="pw"><input name="newPassword" type="password" autocomplete="new-password" /><button type="button" aria-label="Show password">${ic("a-eye")}</button></div>
            <div class="meter" aria-hidden="true"><i data-meter></i></div><small class="muted" data-mtext>At least 8 letters, with numbers too.</small></label>
          <label class="field"><span>Type new password again</span><div class="pw"><input name="confirm" type="password" autocomplete="new-password" /><button type="button" aria-label="Show password">${ic("a-eye")}</button></div></label>
          <details class="more"><summary>Change username <em>(optional)</em></summary>
            <label class="field"><span>Username</span><input name="newUsername" value="${esc(S.me.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="40" /><small class="muted">Small letters and numbers only.</small></label>
          </details>
          <button class="btn btn--primary btn--lg" type="submit">${ic("a-check")}${forced ? "Save & continue" : "Save new password"}</button>
          ${forced ? "" : '<p class="muted small">After changing it, you will be signed out on other phones and computers.</p>'}
        </form>
      </section>
      ${forced ? "" : `<button type="button" class="btn btn--danger signout" data-signout>${ic("a-out")}Sign out of this device</button>`}`);
    const f = $("[data-form]", c), E = f.elements;
    wirePw(f);
    $("[data-signout]", c)?.addEventListener("click", () => $("[data-logout]", app).click());
    E.newPassword.addEventListener("input", () => {
      const p = E.newPassword.value;
      const score = [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p), p.length >= 12].filter(Boolean).length;
      const m = $("[data-meter]", c);
      m.style.width = (p ? Math.max(15, score * 20) : 0) + "%";
      m.style.background = score <= 2 ? "#e02d3c" : score === 3 ? "#d69e2e" : "#128c4b";
      $("[data-mtext]", c).textContent = !p ? "At least 8 letters, with numbers too." : score <= 2 ? "Too weak. Add more letters and numbers." : score === 3 ? "Good" : "Strong 💪";
    });
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const newUsername = E.newUsername.value.trim().toLowerCase();
      const changingName = newUsername && newUsername !== S.me.username;
      if (!E.currentPassword.value) return toast("Please type your current password", true);
      if (!E.newPassword.value && !changingName) return toast("Please type a new password", true);
      if (E.newPassword.value !== E.confirm.value) return toast("The two new passwords are not the same", true);
      run($("[type=submit]", f), async () => {
        const { me } = await api("PUT", "/api/admin/auth/account", { currentPassword: E.currentPassword.value, newUsername, newPassword: E.newPassword.value });
        S.me = me;
        toast("Saved ✓ Use the new details next time you sign in.");
        if (forced) { location.hash = "#/home"; await start(); return; }
        $(".side__user b", app).textContent = me.username;
        E.currentPassword.value = E.newPassword.value = E.confirm.value = "";
        E.newPassword.dispatchEvent(new Event("input"));
      });
    });
  };

  /* ---------- Start ---------- */
  (async () => {
    app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const { me } = await api("GET", "/api/admin/auth/me");
      S.me = me;
      await start();
    } catch (e) {
      if (e.message !== "signed-out" && !S.me) renderLogin(e.message.includes("internet") ? e.message : "");
    }
  })();
})();
