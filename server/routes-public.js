import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { col, nextSeq } from "./db.js";
import { saveMedia, sendMedia } from "./media.js";
import { publicData } from "./content.js";
import { asyncH, str, strList, num, phone10, oid, HttpError } from "./util.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 120 } });

// Anyone can submit, so keep abuse in check.
const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes, or call us." },
});

const PREFIX = { booking: "B", prescription: "P", enquiry: "E", rate: "R" };

export function publicRouter() {
  const r = express.Router();

  r.get("/media/:id", asyncH(async (req, res) => sendMedia(res, oid(req.params.id), { kind: "public" })));

  r.get("/api/public", asyncH(async (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.json(await publicData());
  }));

  // Bookings, list enquiries and prescription uploads. Also delivered to WhatsApp by the browser;
  // saving them here gives the clinic an inbox in /admin that never loses a request.
  r.post("/api/leads", leadLimiter, upload.single("file"), asyncH(async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.json({ ref: "OK" }); // honeypot field: bots fill it, people never see it
    const type = Object.hasOwn(PREFIX, b.type) ? b.type : null;
    if (!type) throw new HttpError(400, "Unknown request type");

    const lead = {
      type, status: "new",
      name: str(b.name, 80), phone: phone10(b.phone), age: num(b.age, { max: 120 }), gender: str(b.gender, 20),
      visit: str(b.visit, 40), date: str(b.date, 20), slot: str(b.slot, 40), address: str(b.address, 400),
      tests: str(b.tests, 1000), items: strList(b.items, 60, 160), note: "",
      createdAt: new Date(), updatedAt: new Date(),
    };
    if (type === "booking" && (!lead.name || !lead.phone)) throw new HttpError(400, "Name and a valid 10-digit mobile number are required");
    if (type === "enquiry" && !lead.items.length) throw new HttpError(400, "Empty test list");
    if (type === "rate" && (!lead.phone || !lead.items.length)) throw new HttpError(400, "Please enter a valid 10-digit mobile number");
    if (type === "prescription") {
      if (!req.file) throw new HttpError(400, "Please choose your prescription photo");
      lead.file = await saveMedia(req.file.buffer, { kind: "private", allowPdf: true, name: req.file.originalname });
      lead.fileType = (await col("media").findOne({ _id: lead.file }, { projection: { contentType: 1 } }))?.contentType;
    }

    lead.ref = `${PREFIX[type]}-${await nextSeq("lead")}`;
    lead.key = crypto.randomBytes(12).toString("hex"); // lets this browser add name/phone afterwards
    await col("leads").insertOne(lead);
    res.status(201).json({ ref: lead.ref, key: lead.key });
  }));

  // The prescription is uploaded the moment it is chosen; name & mobile arrive when "Send" is tapped.
  r.patch("/api/leads/:ref", leadLimiter, express.json({ limit: "10kb" }), asyncH(async (req, res) => {
    const { key, name, phone } = req.body || {};
    const $set = { updatedAt: new Date() };
    if (name) $set.name = str(name, 80);
    if (phone10(phone)) $set.phone = phone10(phone);
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const r2 = await col("leads").updateOne({ ref: str(req.params.ref, 20), key: str(key, 40), createdAt: { $gt: since } }, { $set });
    if (!r2.matchedCount) throw new HttpError(404, "Request not found");
    res.json({ ok: true });
  }));

  return r;
}
