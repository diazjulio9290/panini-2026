# ⚽ Panini World Cup 2026 — Sticker Tracker

A small cloud web app to track your Panini FIFA World Cup 2026 sticker album.

- **Only you log in and edit.** Everyone else who opens your link sees a **read‑only public page** — your completion %, your **Missing** list, and your **Duplicates for trade** — with one‑tap copy buttons for Facebook groups. That public page *is* your share page.
- **Your collection is stored in the cloud (Neon Postgres)** — not in the browser. Open it on your phone or your laptop and it's the same.
- **980 stickers**: Intro/Trophy (9) + FIFA Museum (11) + 48 teams × 20.
- Works great on a phone browser. It is a website, not an app to install.

---

## 🧪 Try it on your own computer first (no accounts needed)

You can run the whole thing locally before putting it online. In this "test mode" it
uses temporary memory instead of a real database (data clears when you stop it) — that's
fine just to see how it looks.

1. Install **Node.js** (the LTS version) from https://nodejs.org if you don't have it.
2. Open a terminal in this `panini-2026` folder and run:
   ```
   npm install
   npm start
   ```
3. Open **http://localhost:3000** in your browser.
4. Click **Owner login**. The test password is `changeme`.

That's it — click teams, press **+** / **−**, check the Missing and Duplicates pages.

---

## ☁️ Put it online (cloud version — your data is saved forever)

You need two free things: a **Neon** database and a **host** to run the app (Render).
Total time: ~15 minutes. Follow in order.

### Step 1 — Create the database (Neon)

1. Go to https://neon.tech and sign up (free).
2. Click **Create Project**. Give it any name (e.g. `panini-2026`).
3. After it's created, find the **Connection string** (Neon shows it on the dashboard,
   sometimes under "Connect"). Copy the one that looks like:
   ```
   postgresql://USER:PASSWORD@ep-something.neon.tech/neondb?sslmode=require
   ```
4. Keep that string handy for Step 3. **The app creates its own tables automatically** —
   you don't need to run any SQL.

### Step 2 — Put the code on GitHub

1. Create a free account at https://github.com if needed.
2. Make a new **private** repository (e.g. `panini-2026`).
3. Upload this whole `panini-2026` folder to it (GitHub's website has an
   "uploading an existing file" / drag‑and‑drop option), **or** if you're comfortable with
   git:
   ```
   git init
   git add .
   git commit -m "Panini 2026 tracker"
   git branch -M main
   git remote add origin https://github.com/YOURNAME/panini-2026.git
   git push -u origin main
   ```
   (The `.gitignore` already keeps your secrets and `node_modules` out of GitHub.)

### Step 3 — Deploy the app (Render)

1. Go to https://render.com and sign up (free). Connect your GitHub.
2. Click **New ➜ Web Service** and pick your `panini-2026` repo.
3. Fill in:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Open **Environment** (environment variables) and add these four:

   | Key              | Value                                                            |
   |------------------|------------------------------------------------------------------|
   | `DATABASE_URL`   | the Neon connection string from Step 1                           |
   | `ADMIN_PASSWORD` | a strong password only you know (this is how **you** log in)     |
   | `SESSION_SECRET` | a long random string (mash the keyboard)                         |
   | `NODE_ENV`       | `production`                                                     |

   (Optional: `DISPLAY_NAME` = the name shown on your public page, e.g. `Julio`. You can
   also change this later inside the app.)
5. Click **Create Web Service**. Wait a couple of minutes for it to build.
6. Render gives you a public link like `https://panini-2026.onrender.com`. **That's your
   app and your share link** — send it to your Facebook group.

> Railway, Vercel, or Fly.io work too — the idea is the same: point them at the repo,
> set the same environment variables, build with `npm install`, start with `npm start`.

### Step 4 — First login

1. Open your new link.
2. Click **Owner login** and enter your `ADMIN_PASSWORD`.
3. Start tapping stickers. Everything saves to Neon automatically.

---

## 🔁 Updating the sticker checklist later

The real Panini checklist may change (teams, names). You only edit **one file**:

```
public/catalog.js
```

- Change a team name, or set `confirmed: true` once a team officially qualifies (that
  removes its "Placeholder" badge).
- Replace the whole `TEAMS` list if needed.
- Sticker codes (ARG01…ARG20) are generated automatically — you don't type them by hand.

**Your saved counts are not affected** by editing the catalog, because the database only
stores quantities by code (e.g. `ARG04 = 1`). After editing, re‑upload to GitHub (or
`git push`) and Render redeploys automatically.

---

## 🔐 A few important notes

- **Only the owner can edit.** Visitors cannot change your counts — the server rejects any
  edit without your login cookie. They *can* copy your lists and export a backup (that's
  the point — it's public, shareable data).
- **Keep `ADMIN_PASSWORD` and `SESSION_SECRET` private.** Anyone with the password can edit.
- **Back up regularly:** the **Import / Export** page has a "Download JSON backup" button.
- Free Render services may "sleep" when idle and take ~30 seconds to wake on the first
  visit. That's normal on the free tier.

---

## 🗂️ What's in here

| File                | What it does                                                       |
|---------------------|-------------------------------------------------------------------|
| `server.js`         | The backend (Express). Login, save, import, reset, serves the site.|
| `db.js`             | Talks to Neon Postgres. Falls back to memory if no database set.  |
| `public/index.html` | The page shell.                                                   |
| `public/catalog.js` | **The editable 980‑sticker checklist** (edit this later).         |
| `public/app.js`     | All the app behavior (dashboard, grid, lists, copy, import/export).|
| `public/styles.css` | The dark "sticker album" look.                                    |
| `.env.example`      | A template of the settings you'll put on Render.                  |

---

## ⚙️ Tech

Node.js + Express backend · Neon Postgres database · plain HTML/CSS/JS frontend
(no build step, no framework). Single‑owner editing with a signed‑cookie session.
