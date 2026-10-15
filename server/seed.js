import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { col } from "./db.js";
import { saveMedia } from "./media.js";
import { PROFILES, PACKAGES, TESTS, CONCERN_TAGS, TEAM, FAQS, SETTINGS } from "./seed-data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedFile = (dir, f) => fs.readFile(path.join(here, "seed", dir, f));

const tagsFor = (code) => Object.entries(CONCERN_TAGS).filter(([, ids]) => ids.includes(code)).map(([k]) => k);

const baseItem = (o) => ({
  type: o.type, code: o.code || "", name: o.name, category: o.category || "", concerns: o.concerns || [],
  price: o.price ?? null, mrp: o.mrp ?? null, params: o.params ?? null, desc: o.desc || "", tagline: o.tagline || "",
  includes: o.includes || [], groups: o.groups || [], note: o.note || "", fasting: !!o.fasting, best: !!o.best,
  featured: !!o.featured, visible: true, image: o.image || null, order: o.order, createdAt: new Date(), updatedAt: new Date(),
});

// Runs on every start; each part only seeds when its collection is empty.
export async function seedIfEmpty() {
  const now = new Date();

  if (!(await col("settings").findOne({ _id: "site" }))) {
    await col("settings").insertOne({ _id: "site", ...SETTINGS, updatedAt: now });
    console.log("[seed] site settings");
  }

  if ((await col("items").countDocuments()) === 0) {
    const docs = [];
    for (const [i, p] of PROFILES.entries()) {
      const image = await saveMedia(await seedFile("posters", p.poster), { name: p.poster });
      docs.push(baseItem({ ...p, type: "profile", category: "Health Checkup", image, order: i }));
    }
    PACKAGES.forEach(([code, name, category, price, desc, extra = {}], i) =>
      docs.push(baseItem({ type: "package", code, name, category, price, desc, concerns: tagsFor(code), order: i, ...extra })));
    TESTS.forEach(([code, name, category, desc, extra = {}], i) =>
      docs.push(baseItem({ type: "test", code, name, category, desc, concerns: tagsFor(code), order: i, ...extra })));
    await col("items").insertMany(docs);
    console.log(`[seed] ${docs.length} profiles, packages & tests`);
  }

  if ((await col("team").countDocuments()) === 0) {
    const docs = [];
    for (const [i, m] of TEAM.entries()) {
      const cert = await saveMedia(await seedFile("certs", m.cert), { name: m.cert });
      docs.push({ name: m.name, role: m.role, isDoctor: !!m.isDoctor, lead: !!(m.lead || m.isDoctor), cert, visible: true, order: i, createdAt: now, updatedAt: now });
    }
    await col("team").insertMany(docs);
    console.log(`[seed] ${docs.length} team members`);
  }

  if ((await col("faqs").countDocuments()) === 0) {
    await col("faqs").insertMany(FAQS.map(([q, a], i) => ({ q, a, visible: true, order: i, createdAt: now, updatedAt: now })));
    console.log(`[seed] ${FAQS.length} FAQs`);
  }

  if ((await col("admins").countDocuments()) === 0) {
    const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
    const fromEnv = !!process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD || "Thyrocare@166";
    await col("admins").insertOne({
      username, passwordHash: await bcrypt.hash(password, 12), tokenVersion: 0,
      // Default password must be changed on first login.
      mustChange: !fromEnv, createdAt: now, updatedAt: now,
    });
    console.log(`[seed] admin user "${username}"${fromEnv ? "" : " with default password (must be changed on first login)"}`);
  }
}
