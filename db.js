// db.js — all Neon Postgres access lives here.
// The catalog of 980 stickers is defined in the frontend (public/catalog.js).
// The database only stores YOUR quantities: a small table mapping code -> quantity.
// Any sticker code that is NOT in the table is treated as quantity 0 (Need).
//
// LOCAL TEST MODE: if DATABASE_URL is NOT set, this file falls back to a simple
// in-memory store so you can run `npm start` and try the app with zero setup.
// In-memory data is wiped when the server stops. For real/permanent storage,
// set DATABASE_URL to your Neon connection string.

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const USE_MEMORY = !connectionString;

// ----- in-memory fallback (only used when there is no DATABASE_URL) -----
const mem = { collection: {}, settings: {} };
const memoryStore = {
  initDb: async () => {
    console.warn('No DATABASE_URL set — running in LOCAL TEST MODE (in-memory, not saved). Set DATABASE_URL for real storage.');
  },
  getCollection: async () => ({ ...mem.collection }),
  setSticker: async (code, quantity) => {
    const q = Math.max(0, Math.floor(Number(quantity) || 0));
    if (q === 0) delete mem.collection[code]; else mem.collection[code] = q;
    return q;
  },
  replaceCollection: async (obj) => {
    mem.collection = {};
    for (const [code, qtyRaw] of Object.entries(obj || {})) {
      const qty = Math.max(0, Math.floor(Number(qtyRaw) || 0));
      if (qty > 0 && typeof code === 'string' && code.length <= 32) mem.collection[code] = qty;
    }
  },
  resetCollection: async () => { mem.collection = {}; },
  getSetting: async (key, fallback = null) => (key in mem.settings ? mem.settings[key] : fallback),
  setSetting: async (key, value) => { mem.settings[key] = value; },
  pool: null,
};

// Neon (and most cloud Postgres) require SSL. Local Postgres usually does not.
const isLocal =
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Create tables on first run. Safe to call every startup.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection (
      code     TEXT PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Return the whole collection as a plain object: { "ARG04": 1, "BRA05": 3 }
async function getCollection() {
  const { rows } = await pool.query(
    'SELECT code, quantity FROM collection WHERE quantity > 0'
  );
  const out = {};
  for (const r of rows) out[r.code] = r.quantity;
  return out;
}

// Set one sticker's quantity. Quantity 0 removes the row (keeps the table tidy).
async function setSticker(code, quantity) {
  const q = Math.max(0, Math.floor(Number(quantity) || 0));
  if (q === 0) {
    await pool.query('DELETE FROM collection WHERE code = $1', [code]);
    return 0;
  }
  await pool.query(
    `INSERT INTO collection (code, quantity)
     VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [code, q]
  );
  return q;
}

// Replace the ENTIRE collection (used by Import). Wrapped in a transaction.
async function replaceCollection(obj) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE collection');
    const entries = Object.entries(obj || {});
    for (const [code, qtyRaw] of entries) {
      const qty = Math.max(0, Math.floor(Number(qtyRaw) || 0));
      if (qty > 0 && typeof code === 'string' && code.length <= 32) {
        await client.query(
          'INSERT INTO collection (code, quantity) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET quantity = EXCLUDED.quantity',
          [code, qty]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Wipe everything (used by Reset).
async function resetCollection() {
  await pool.query('TRUNCATE collection');
}

async function getSetting(key, fallback = null) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows.length ? rows[0].value : fallback;
}

async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

module.exports = USE_MEMORY
  ? memoryStore
  : {
      pool,
      initDb,
      getCollection,
      setSticker,
      replaceCollection,
      resetCollection,
      getSetting,
      setSetting,
    };
