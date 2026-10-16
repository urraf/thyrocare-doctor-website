import express from "express";
import multer from "multer";
import { col } from "./db.js";
import { saveMedia, deleteMedia, sendMedia, mediaUrl } from "./media.js";
import { invalidate, getSettings } from "./content.js";
import { requireAdmin } from "./auth.js";
import { CONCERNS, CONCERN_KEYS } from "./concerns.js";
import { asyncH, str, bool, num, strList, phone10, oid, HttpError } from "./util.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

// ---------- Sanitizers: the only fields that can ever be stored ----------
async function publicMediaId(v) {
  if (v == null || v === "") return null;
  const id = oid(String(v));
  if (!id || !(await col("media").findOne({ _id: id, kind: "public" }, { projection: { _id: 1 } }))) throw new HttpError(400, "Image not found, please upload it again");
  return id;
}

const SCHEMAS = {
  items: async (b) => {
    const type = ["profile", "package", "test"].includes(b.type) ? b.type : null;
    if (!type) throw new HttpError(400, "Choose a type: profile, package or test");
    const name = str(b.name, 160);
    if (!name) throw new HttpError(400, "Name is required");
    return {
      type, name, code: str(b.code, 40).toUpperCase(), category: str(b.category, 60),
      concerns: (Array.isArray(b.concerns) ? b.concerns : []).filter((k) => CONCERN_KEYS.has(k)),
      price: num(b.price), mrp: num(b.mrp), params: num(b.params, { max: 2000 }),
      desc: str(b.desc, 1200), tagline: str(b.tagline, 240), note: str(b.note, 240),
      includes: strList(b.includes, 200, 160),
      groups: (Array.isArray(b.groups) ? b.groups : []).slice(0, 40).map((gr) => {
        const items = strList(gr?.items, 200, 160);
        return { name: str(gr?.name, 140), count: num(gr?.count, { max: 500 }) ?? items.length, items };
      }).filter((gr) => gr.name),
      fasting: bool(b.fasting), best: bool(b.best), featured: bool(b.featured), visible: b.visible === undefined ? true : bool(b.visible),
      image: await publicMediaId(b.image),
    };
  },
  team: async (b) => {
    const name = str(b.name, 100);
    if (!name) throw new HttpError(400, "Name is required");
    return {
      name, role: str(b.role, 160), isDoctor: bool(b.isDoctor), lead: bool(b.lead),
      visible: b.visible === undefined ? true : bool(b.visible), cert: await publicMediaId(b.cert),
    };
  },
  faqs: async (b) => {
    const q = str(b.q, 240), a = str(b.a, 2000);
    if (!q || !a) throw new HttpError(400, "Question and answer are required");
    return { q, a, visible: b.visible === undefined ? true : bool(b.visible) };
  },
};
const MEDIA_FIELD = { items: "image", team: "cert", faqs: null };

function sanitizeSettings(b, cur) {
  const h = b.hero || {}, a = b.announcement || {};
  const rawPhones = strList(b.phones, 5, 20);
  const badPhone = rawPhones.find((p) => !phone10(p));
  if (badPhone) throw new HttpError(400, `"${badPhone}" is not a valid 10-digit phone number`);
  const phones = rawPhones.map(phone10);
  const whatsapp = phone10(b.whatsapp);
  if (!whatsapp) throw new HttpError(400, "WhatsApp number must be a valid 10-digit mobile number");
  if (!phones.length) throw new HttpError(400, "Add at least one phone number");
  const emails = strList(b.emails, 4, 120);
  const badEmail = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (badEmail) throw new HttpError(400, `"${badEmail}" is not a valid email address`);
  const link = str(a.link, 300);
  if (link && !/^(#[\w-]*|https?:\/\/)/i.test(link)) throw new HttpError(400, "Offer link must start with # or https://");
  return {
    ...cur,
    announcement: { enabled: bool(a.enabled), text: str(a.text, 200), link },
    whatsapp, phones,
    emails,
    addressShort: str(b.addressShort, 80), address: str(b.address, 300), mapQuery: str(b.mapQuery, 200), topbarNote: str(b.topbarNote, 100),
    hero: { badge: str(h.badge, 80), title: str(h.title, 120), highlight: str(h.highlight, 120), hindi: str(h.hindi, 120), lead: str(h.lead, 600) },
    stats: (Array.isArray(b.stats) ? b.stats : []).slice(0, 4).map((s) => ({ value: str(s?.value, 24), label: str(s?.label, 60) })).filter((s) => s.value || s.label),
    labFacts: (Array.isArray(b.labFacts) ? b.labFacts : []).slice(0, 8).map((f) => ({ title: str(f?.title, 120), note: str(f?.note, 120) })).filter((f) => f.title),
    footerNote: str(b.footerNote, 160), seoTitle: str(b.seoTitle, 120), seoDescription: str(b.seoDescription, 300), areas: str(b.areas, 600),
    updatedAt: new Date(),
  };
}

const out = (name, d) => {
  const o = { ...d, id: String(d._id) };
  delete o._id;
  if (name === "items") o.imageUrl = mediaUrl(d.image);
  if (name === "team") o.certUrl = mediaUrl(d.cert);
  if (o.image) o.image = String(o.image);
  if (o.cert) o.cert = String(o.cert);
  return o;
};
const leadOut = (l) => { const o = { ...l, id: String(l._id), hasFile: !!l.file }; delete o._id; delete o.file; delete o.key; return o; };

// Uploaded-but-never-used images (e.g. a cancelled form) are removed after a day.
export async function sweepOrphanMedia() {
  const used = new Set();
  for (const d of await col("items").find({ image: { $ne: null } }, { projection: { image: 1 } }).toArray()) used.add(String(d.image));
  for (const d of await col("team").find({ cert: { $ne: null } }, { projection: { cert: 1 } }).toArray()) used.add(String(d.cert));
  const old = await col("media").find({ kind: "public", createdAt: { $lt: new Date(Date.now() - 864e5) } }, { projection: { _id: 1 } }).toArray();
  const orphan = old.filter((m) => !used.has(String(m._id))).map((m) => m._id);
  if (orphan.length) await col("media").deleteMany({ _id: { $in: orphan } });
}

export function adminRouter() {
  const r = express.Router();
  r.use(requireAdmin);
  r.use((req, _res, next) => {
    // Until the default password is changed, only the account screen works.
    if (req.admin.mustChange && !(req.method === "GET" && req.path === "/bootstrap")) throw new HttpError(403, "Please change the default password first");
    next();
  });

  r.get("/bootstrap", asyncH(async (_req, res) => {
    const [settings, items, team, faqs, newLeads] = await Promise.all([
      getSettings(),
      col("items").find().sort({ type: 1, order: 1 }).toArray(),
      col("team").find().sort({ order: 1 }).toArray(),
      col("faqs").find().sort({ order: 1 }).toArray(),
      col("leads").countDocuments({ status: "new" }),
    ]);
    res.json({ settings, concerns: CONCERNS, items: items.map((d) => out("items", d)), team: team.map((d) => out("team", d)), faqs: faqs.map((d) => out("faqs", d)), newLeads });
  }));

  // ---------- Generic CRUD for items / team / faqs ----------
  for (const name of Object.keys(SCHEMAS)) {
    const c = () => col(name);
    const mf = MEDIA_FIELD[name];

    r.post(`/${name}`, asyncH(async (req, res) => {
      const doc = await SCHEMAS[name](req.body || {});
      const scope = name === "items" ? { type: doc.type } : {};
      const last = await c().find(scope).sort({ order: -1 }).limit(1).next();
      doc.order = (last?.order ?? -1) + 1;
      doc.createdAt = doc.updatedAt = new Date();
      const { insertedId } = await c().insertOne(doc);
      invalidate();
      res.status(201).json(out(name, { ...doc, _id: insertedId }));
    }));

    r.put(`/${name}/:id`, asyncH(async (req, res) => {
      const id = oid(req.params.id);
      const cur = id && (await c().findOne({ _id: id }));
      if (!cur) throw new HttpError(404, "Not found");
      const doc = { ...(await SCHEMAS[name]({ ...cur, ...req.body })), updatedAt: new Date() };
      await c().updateOne({ _id: id }, { $set: doc });
      if (mf && cur[mf] && String(cur[mf]) !== String(doc[mf])) await deleteMedia(cur[mf]); // replaced image
      invalidate();
      res.json(out(name, { ...cur, ...doc }));
    }));

    r.delete(`/${name}/:id`, asyncH(async (req, res) => {
      const id = oid(req.params.id);
      const cur = id && (await c().findOneAndDelete({ _id: id }));
      if (!cur) throw new HttpError(404, "Not found");
      if (mf) await deleteMedia(cur[mf]);
      invalidate();
      res.json({ ok: true });
    }));

    r.post(`/${name}/reorder`, asyncH(async (req, res) => {
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(oid).filter(Boolean).slice(0, 500);
      if (ids.length) await c().bulkWrite(ids.map((_id, order) => ({ updateOne: { filter: { _id }, update: { $set: { order } } } })));
      invalidate();
      res.json({ ok: true });
    }));
  }

  // ---------- Images ----------
  r.post("/media", upload.single("file"), asyncH(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file received");
    const id = await saveMedia(req.file.buffer, { kind: "public", name: req.file.originalname });
    res.status(201).json({ id: String(id), url: mediaUrl(id) });
  }));

  // ---------- Settings ----------
  r.put("/settings", asyncH(async (req, res) => {
    const doc = sanitizeSettings(req.body || {}, await getSettings());
    await col("settings").replaceOne({ _id: "site" }, doc, { upsert: true });
    invalidate();
    res.json(doc);
  }));

  // ---------- Leads inbox ----------
  r.get("/leads", asyncH(async (req, res) => {
    const q = {};
    if (req.query.status === "new") q.status = "new";
    else if (req.query.status === "done") q.status = { $in: ["done", "contacted"] };
    if (["booking", "prescription", "enquiry"].includes(req.query.type)) q.type = req.query.type;
    const s = str(req.query.q, 60);
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ name: rx }, { phone: rx }, { ref: rx }, { tests: rx }, { address: rx }];
    }
    const page = Math.max(0, num(req.query.page) || 0);
    const [leads, total, counts, weekBookings] = await Promise.all([
      col("leads").find(q).sort({ createdAt: -1 }).skip(page * 50).limit(50).toArray(),
      col("leads").countDocuments(q),
      col("leads").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
      col("leads").countDocuments({ type: "booking", createdAt: { $gt: new Date(Date.now() - 7 * 864e5) } }),
    ]);
    res.json({ leads: leads.map(leadOut), total, weekBookings, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
  }));

  r.patch("/leads/:id", asyncH(async (req, res) => {
    const id = oid(req.params.id);
    const $set = { updatedAt: new Date() };
    if (["new", "contacted", "done"].includes(req.body?.status)) $set.status = req.body.status;
    if (req.body?.note !== undefined) $set.note = str(req.body.note, 1000);
    const l = id && (await col("leads").findOneAndUpdate({ _id: id }, { $set }, { returnDocument: "after" }));
    if (!l) throw new HttpError(404, "Not found");
    res.json(leadOut(l));
  }));

  r.delete("/leads/:id", asyncH(async (req, res) => {
    const id = oid(req.params.id);
    const l = id && (await col("leads").findOneAndDelete({ _id: id }));
    if (!l) throw new HttpError(404, "Not found");
    if (l.file) await deleteMedia(l.file);
    res.json({ ok: true });
  }));

  // Prescriptions are private: only a signed-in admin can open them.
  r.get("/leads/:id/file", asyncH(async (req, res) => {
    const id = oid(req.params.id);
    const l = id && (await col("leads").findOne({ _id: id }, { projection: { file: 1 } }));
    return sendMedia(res, l?.file, { kind: "private" });
  }));

  return r;
}
