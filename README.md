# Thyrocare UP166 Lucknow — website

Static single-page site: `index.html`, `styles.css`, `app.js`, `assets/`. No build step and no server. Upload the folder to any static host (Netlify, Vercel, Hostinger, GitHub Pages).

Bookings, test lists and enquiries are sent to WhatsApp **70800 14014**. To change the number, edit `CONFIG.whatsapp` in `app.js`.

## Prescription upload (one-tap, optional)

A WhatsApp link can only carry text, so by default the patient attaches the photo in WhatsApp themselves: a share sheet on phones, Ctrl/⌘+V on desktop.

For true one-tap sending, the browser can upload the photo straight to a free Cloudinary account. The WhatsApp message then contains the photo's link. No server code is needed.

1. Create a free account at https://cloudinary.com, ideally signed up with the clinic's email.
2. Go to **Settings → Upload → Upload presets → Add upload preset**:
   - Signing mode: **Unsigned**
   - Folder: `prescriptions`
   - Save, and copy the preset name.
3. To accept PDF prescriptions, turn on **Settings → Security → "Allow delivery of PDF and ZIP files"**.
4. In `app.js`, fill in:
   ```js
   upload: { cloudName: "your-cloud-name", preset: "your-preset-name" },
   ```
   The cloud name is shown on the Cloudinary dashboard.

If the upload ever fails (no internet, quota reached), the site falls back to the attach-in-WhatsApp flow on its own.

**Privacy note:** each uploaded file gets a long, unguessable link, but anyone who has that link can open it. Only the clinic receives the link. The clinic should delete old prescriptions from **Cloudinary → Media Library → prescriptions** from time to time.

## Content to update
- Package prices: `PACKAGES` in `app.js`. Entries with `price: null` show "Ask for best rate".
- Team members and certificates: `TEAM` in `app.js`, with images in `assets/img/certs/`.
- Hero photo: `assets/img/photos/doctor-namaste.webp`. Replace it with a real photo of the doctor in a portrait ratio of about 760×900.

## Credits
Photos: Unsplash (free under the Unsplash License). Medical icons: Healthicons (CC0).
