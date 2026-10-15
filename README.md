# Thyrocare UP166 Lucknow — Website + Admin Panel

A single-page website for the Thyrocare Authorised Service Centre (UP166), Mansoor Nagar, Lucknow, with a private admin panel at **`/admin`** (there is no link to it on the public site).

- **Website:** full body checkup posters (Aarogyam / Jaanch), packages and tests with prices, browse by health concern, home collection booking, prescription upload, certified team, FAQs, map.
- **Admin panel:** works on phone and computer.
  - Edit health profiles (posters), packages and tests, the team, FAQs, all website texts, the offer banner and contact numbers.
  - An inbox of every booking and prescription.
  - Change the admin username and password.
- **Stack:** Node.js + Express + MongoDB. No build step. Images and prescriptions are stored in MongoDB, so a MongoDB URL is the only external service needed.

```
public/            website (index.html is a template the server fills in)
public/admin/      admin panel
server/            API, auth, MongoDB, first-run seed data (posters, certificates)
```

## Run locally

```bash
npm install
cp .env.example .env      # then fill MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:3000   admin: http://localhost:3000/admin
```

On the first start, the database is filled automatically with:
- 7 health profiles (with their posters)
- 24 Jaanch packages and 25 single tests
- the team with their certificates
- FAQs and the website texts

## First admin login

| Username | Password |
|---|---|
| `admin` | `Thyrocare@166` |

The panel forces a new password on first login. To start with your own password instead, set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` **before** the first start.

Forgot the password? Delete the document in the `admins` collection (MongoDB Atlas → Browse Collections) and restart the app. The default login above is created again.

## MongoDB Atlas (free)

1. Create a free **M0** cluster at https://cloud.mongodb.com.
2. **Database Access** → add a user with a strong password.
3. **Network Access** → add `0.0.0.0/0`. This is needed for hosts like Render whose IP addresses change.
4. **Connect → Drivers** → copy the connection string into `MONGODB_URI`. Put the database name before the `?`, for example `.../thyrocare_up166?retryWrites=true&w=majority`.

## Deploy (Render, Railway or any VPS)

The site now needs a Node server, so GitHub Pages can no longer host it.

**Render.com**
1. New → **Web Service** → connect this GitHub repo.
2. Build command: `npm install`. Start command: `npm start`.
3. Environment variables: `MONGODB_URI`, `JWT_SECRET` (a long random string), `NODE_ENV=production`.
4. Settings → **Custom Domain** → add your domain and follow the DNS steps. HTTPS is automatic.

Render's free plan sleeps after inactivity, which makes the first visit slow. A paid instance (about $7/month) avoids that for a business site.

**VPS (Hostinger, DigitalOcean…):** install Node 20+, run `npm install`, then `npm start` under `pm2`, behind Nginx with HTTPS (Let's Encrypt).

## How requests reach the clinic

- **Booking / test list:** the patient's WhatsApp opens with the full message to the clinic's number, and a copy is saved in **Admin → Requests**.
- **Prescription:**
  1. The photo uploads privately as soon as it is chosen. Only a signed-in admin can open it.
  2. One tap sends a WhatsApp message with its reference (e.g. *P-1002*).
  3. The clinic opens Requests to see the photo, then calls or WhatsApps the patient from there.

## Security notes
- Passwords are hashed with bcrypt. Sessions use an httpOnly, SameSite=strict cookie for 7 days.
- Changing the password signs out all other devices.
- Sign-in is rate-limited to 10 attempts per 15 minutes. Public forms are rate-limited too.
- Uploads are checked by their real file type (JPG, PNG, WEBP, HEIC or PDF) and limited to 8 MB.
- The admin is never indexed by search engines, and all admin-editable text is escaped before display.
- The earlier Cloudinary upload preset (`up166_prescriptions`) is no longer used. You can delete it from your Cloudinary account.

## Credits
Photos: Unsplash (free under the Unsplash License). Medical icons: Healthicons (CC0). Posters and rate cards: Thyrocare.
