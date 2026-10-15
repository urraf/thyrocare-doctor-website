import { ObjectId } from "mongodb";

// ---------- Input cleaning (never trust the client, admin included) ----------
export const str = (v, max = 500) => (v == null ? "" : String(v)).replace(/\u0000/g, "").trim().slice(0, max);
export const bool = (v) => v === true || v === "true" || v === "on" || v === 1 || v === "1";
export const num = (v, { min = 0, max = 10_000_000 } = {}) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
};
export const strList = (v, maxItems = 200, maxLen = 200) =>
  (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems);

export const oid = (v) => (typeof v === "string" && ObjectId.isValid(v) && String(new ObjectId(v)) === v ? new ObjectId(v) : null);

// Phone: keep digits, drop +91 / leading 0, return 10 digits or ""
export const phone10 = (v) => {
  const d = String(v ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^\d{10}$/.test(d) ? d : "";
};
export const phoneDisplay = (p) => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

// ---------- Output ----------
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Admin-editable copy supports **bold** only; everything else is escaped.
export const mdBold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
// JSON that is safe to embed inside <script type="application/json">
export const safeJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
