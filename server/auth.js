import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { col } from "./db.js";
import { asyncH, str, oid, HttpError } from "./util.js";

const COOKIE = "up166_admin";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // stay signed in for 7 days

const SECRET = process.env.JWT_SECRET || (() => {
  console.warn("[auth] JWT_SECRET is not set: using a random one, so admins are signed out on every restart. Set it in .env.");
  return crypto.randomBytes(48).toString("hex");
})();

function setSession(res, admin, req) {
  const token = jwt.sign({ sub: String(admin._id), v: admin.tokenVersion || 0 }, SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: "strict", path: "/", maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production" || req.secure,
  });
}

// Guards every /api/admin route below login.
export const requireAdmin = asyncH(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, "Please sign in");
  let payload;
  try { payload = jwt.verify(token, SECRET); } catch { throw new HttpError(401, "Session expired, please sign in again"); }
  const id = oid(payload.sub);
  const admin = id && (await col("admins").findOne({ _id: id }));
  // tokenVersion changes when the password changes → old sessions die.
  if (!admin || (admin.tokenVersion || 0) !== payload.v) throw new HttpError(401, "Session expired, please sign in again");
  req.admin = admin;
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait 15 minutes and try again." },
});

// Hash compared against when the username doesn't exist (same cost as a real check).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);

const me = (a) => ({ username: a.username, mustChange: !!a.mustChange });

export function authRouter() {
  const r = express.Router();

  r.post("/login", loginLimiter, asyncH(async (req, res) => {
    const username = str(req.body?.username, 60).toLowerCase();
    const password = String(req.body?.password ?? "");
    const admin = username && (await col("admins").findOne({ username }));
    // Compare even when the user doesn't exist, so timing doesn't reveal valid usernames.
    const ok = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
    if (!admin || !ok) throw new HttpError(401, "Wrong username or password");
    await col("admins").updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
    setSession(res, admin, req);
    res.json({ me: me(admin) });
  }));

  r.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  r.get("/me", requireAdmin, (req, res) => res.json({ me: me(req.admin) }));

  // Change username and/or password. Always requires the current password.
  r.put("/account", requireAdmin, asyncH(async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body || {};
    const admin = req.admin;
    if (!(await bcrypt.compare(String(currentPassword ?? ""), admin.passwordHash))) throw new HttpError(400, "Current password is wrong");

    const $set = { updatedAt: new Date() };
    const uname = str(newUsername, 60).toLowerCase();
    if (uname && uname !== admin.username) {
      if (!/^[a-z0-9._-]{3,40}$/.test(uname)) throw new HttpError(400, "Username: 3–40 letters, numbers, dot, dash or underscore");
      if (await col("admins").findOne({ username: uname })) throw new HttpError(400, "That username is taken");
      $set.username = uname;
    }
    if (newPassword) {
      const p = String(newPassword);
      if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) throw new HttpError(400, "New password needs at least 8 characters, with letters and numbers");
      if (await bcrypt.compare(p, admin.passwordHash)) throw new HttpError(400, "New password must be different from the current one");
      $set.passwordHash = await bcrypt.hash(p, 12);
      $set.mustChange = false;
    } else if (admin.mustChange) {
      throw new HttpError(400, "Please set a new password");
    }
    if (Object.keys($set).length === 1) throw new HttpError(400, "Nothing to change");

    const updated = await col("admins").findOneAndUpdate(
      { _id: admin._id },
      { $set, ...(newPassword ? { $inc: { tokenVersion: 1 } } : {}) }, // sign out other devices
      { returnDocument: "after" },
    );
    setSession(res, updated, req);
    res.json({ me: me(updated) });
  }));

  return r;
}
