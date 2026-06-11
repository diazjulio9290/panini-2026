// server.js — small Express backend.
// Single owner (you). Only you can edit. Everyone else gets a read-only public view.

require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me-please';
const SESSION_DAYS = 30;
const IS_PROD = process.env.NODE_ENV === 'production';

// ---- tiny signed-cookie session (no external auth library needed) ----
function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${mac}`;
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [data, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function isOwner(req) {
  return !!verify(req.cookies && req.cookies.session);
}
function requireOwner(req, res, next) {
  if (!isOwner(req)) return res.status(401).json({ error: 'Not authorized. Owner login required.' });
  next();
}
function constantTimeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ---- API ----

// Public: current state of the collection + display name + whether viewer is owner.
app.get('/api/state', async (req, res) => {
  try {
    const [collection, displayName] = await Promise.all([
      db.getCollection(),
      db.getSetting('display_name', process.env.DISPLAY_NAME || 'My'),
    ]);
    res.json({ collection, displayName, owner: isOwner(req) });
  } catch (e) {
    console.error('GET /api/state', e);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// Owner login: send { password }. Sets an httpOnly session cookie on success.
app.post('/api/login', (req, res) => {
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || !constantTimeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  const token = sign({ exp: Date.now() + SESSION_DAYS * 86400000 });
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: SESSION_DAYS * 86400000,
  });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

// Owner: set one sticker's quantity. Body: { code, quantity }
app.put('/api/sticker', requireOwner, async (req, res) => {
  const { code, quantity } = req.body || {};
  if (typeof code !== 'string' || !code.length || code.length > 32) {
    return res.status(400).json({ error: 'Invalid sticker code.' });
  }
  try {
    const q = await db.setSticker(code, quantity);
    res.json({ ok: true, code, quantity: q });
  } catch (e) {
    console.error('PUT /api/sticker', e);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Owner: replace the whole collection (Import). Body: { collection: {code: qty} }
app.post('/api/import', requireOwner, async (req, res) => {
  const collection = req.body && req.body.collection;
  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
    return res.status(400).json({ error: 'Import must be a JSON object of code -> quantity.' });
  }
  try {
    await db.replaceCollection(collection);
    res.json({ ok: true, count: Object.keys(collection).length });
  } catch (e) {
    console.error('POST /api/import', e);
    res.status(500).json({ error: 'Database error during import.' });
  }
});

// Owner: wipe the collection.
app.post('/api/reset', requireOwner, async (req, res) => {
  try {
    await db.resetCollection();
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/reset', e);
    res.status(500).json({ error: 'Database error during reset.' });
  }
});

// Owner: set display name shown on the public page.
app.post('/api/settings', requireOwner, async (req, res) => {
  const name = req.body && req.body.displayName;
  if (typeof name !== 'string' || !name.trim() || name.length > 60) {
    return res.status(400).json({ error: 'Display name must be 1-60 characters.' });
  }
  try {
    await db.setSetting('display_name', name.trim());
    res.json({ ok: true, displayName: name.trim() });
  } catch (e) {
    console.error('POST /api/settings', e);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Health check — used by free uptime pingers (UptimeRobot, cron-job.org) to keep
// the Render free instance awake. No database hit, so pings are cheap.
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// ---- static frontend ----
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- start ----
db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Panini 2026 tracker running on http://localhost:${PORT}`);
      if (ADMIN_PASSWORD === 'changeme') {
        console.warn('WARNING: ADMIN_PASSWORD is the default "changeme". Set a real one in your environment.');
      }
    });
  })
  .catch((e) => {
    console.error('Failed to initialize database. Is DATABASE_URL set correctly?');
    console.error(e);
    process.exit(1);
  });
