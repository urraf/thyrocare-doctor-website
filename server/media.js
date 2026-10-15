import { Binary } from "mongodb";
import { col } from "./db.js";
import { HttpError } from "./util.js";

// Images live in MongoDB so the only thing to host is this app + a Mongo URL.
// "public" media (posters, certificates) is served at /media/:id;
// "private" media (patients' prescriptions) only through the admin API.

const MAX_BYTES = 8 * 1024 * 1024;

// Detect the real type from the file's first bytes; the browser-sent type can lie.
export function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.slice(0, 4).toString() === "%PDF") return "application/pdf";
  if (buf.slice(4, 12).toString() === "ftypheic" || buf.slice(4, 12).toString() === "ftypheix" || buf.slice(4, 12).toString() === "ftypmif1") return "image/heic";
  return null;
}

export async function saveMedia(buf, { kind = "public", allowPdf = false, name = "" } = {}) {
  if (!buf?.length) throw new HttpError(400, "Empty file");
  if (buf.length > MAX_BYTES) throw new HttpError(413, "File is larger than 8 MB");
  const type = sniff(buf);
  if (!type || (type === "application/pdf" && !allowPdf)) throw new HttpError(415, allowPdf ? "Please upload a JPG, PNG, WEBP, HEIC or PDF file" : "Please upload a JPG, PNG or WEBP image");
  const doc = { data: new Binary(buf), contentType: type, size: buf.length, kind, name: String(name).slice(0, 120), createdAt: new Date() };
  const r = await col("media").insertOne(doc);
  return r.insertedId;
}

export async function deleteMedia(id) {
  if (id) await col("media").deleteOne({ _id: id });
}

export async function sendMedia(res, id, { kind }) {
  const m = id && (await col("media").findOne({ _id: id, kind }));
  if (!m) return res.status(404).end();
  res.set({
    "Content-Type": m.contentType,
    "Content-Length": m.size,
    "Cache-Control": kind === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ETag: `"${id}"`,
  });
  if (m.contentType === "application/pdf") res.set("Content-Disposition", `inline; filename="${(m.name || "prescription").replace(/[^\w.-]/g, "_")}"`);
  res.end(m.data.buffer);
}

export const mediaUrl = (id) => (id ? `/media/${id}` : null);
