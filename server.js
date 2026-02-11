const express = require('express');
const fs = require('fs');
const path = require('path');

let Pool = null;
try {
  ({ Pool } = require('pg'));
} catch {
  Pool = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const DATABASE_URL = process.env.DATABASE_URL;

app.use(express.json());
app.use(express.static(__dirname));

function readFileDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { logs: [] };
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.logs)) {
      return { logs: [] };
    }
    return parsed;
  } catch {
    return { logs: [] };
  }
}

function writeFileDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max) {
  if (value === null) return null;
  return Math.min(max, Math.max(min, value));
}

function sanitizeInstrument(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'running' || normalized === 'rowing' || normalized === 'riding' || normalized === 'spin') {
    return normalized;
  }
  return 'running';
}

function sanitizeUser(value) {
  if (value === 'Toby' || value === 'Anna') return value;
  return 'Toby';
}

function sanitizeProtocolId(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'copenhagen' || normalized === 'norwegian' || normalized === 'tabata' || normalized === 'custom') {
    return normalized;
  }
  return 'unknown';
}

function sanitizeProtocolLabel(value, protocolId) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 80);
  }
  if (protocolId === 'copenhagen') return 'University of Copenhagen';
  if (protocolId === 'norwegian') return 'Norwegian 4x4 Style';
  if (protocolId === 'tabata') return 'Tabata';
  if (protocolId === 'custom') return 'Custom';
  return 'Unknown';
}

function sanitizeMetrics(instrument, metrics) {
  const source = metrics && typeof metrics === 'object' ? metrics : {};

  if (instrument === 'running') {
    return {
      distanceKm: toFiniteNumber(source.distanceKm),
      pace: typeof source.pace === 'string' && source.pace.trim() ? source.pace.trim() : null
    };
  }

  if (instrument === 'rowing') {
    return {
      distanceM: toFiniteNumber(source.distanceM),
      level: clamp(toFiniteNumber(source.level), 0, 10)
    };
  }

  if (instrument === 'spin') {
    return {
      distanceKm: toFiniteNumber(source.distanceKm),
      cadence: clamp(toFiniteNumber(source.cadence), 0, 300)
    };
  }

  return {
    distanceKm: toFiniteNumber(source.distanceKm),
    level: clamp(toFiniteNumber(source.level), 0, 10)
  };
}

class Storage {
  constructor() {
    this.pool = null;
    this.mode = 'file';
  }

  async init() {
    if (!DATABASE_URL || !Pool) {
      this.ensureFile();
      this.mode = 'file';
      if (DATABASE_URL && !Pool) {
        console.warn('DATABASE_URL is set but pg is not installed; using file storage.');
      }
      return;
    }

    const ssl = DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false };

    try {
      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl
      });

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workout_logs (
          id BIGSERIAL PRIMARY KEY,
          log_date TIMESTAMPTZ NOT NULL,
          user_name TEXT NOT NULL,
          instrument TEXT NOT NULL,
          entry JSONB NOT NULL
        );
      `);

      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS workout_logs_log_date_idx
        ON workout_logs (log_date DESC);
      `);

      this.mode = 'postgres';
      console.log('Storage backend: postgres');
    } catch (error) {
      console.error('Postgres unavailable, falling back to file storage:', error.message);
      this.mode = 'file';
      this.pool = null;
      this.ensureFile();
    }
  }

  ensureFile() {
    if (!fs.existsSync(DB_PATH)) {
      writeFileDb({ logs: [] });
    }
  }

  async getLogs() {
    if (this.mode === 'postgres' && this.pool) {
      const result = await this.pool.query(
        `SELECT entry
         FROM workout_logs
         ORDER BY log_date DESC
         LIMIT 500;`
      );
      return result.rows.map((row) => row.entry);
    }

    const db = readFileDb();
    const logs = Array.isArray(db.logs) ? db.logs : [];
    return logs
      .slice(0, 500)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  async addLog(entry) {
    if (this.mode === 'postgres' && this.pool) {
      await this.pool.query(
        `INSERT INTO workout_logs (log_date, user_name, instrument, entry)
         VALUES ($1::timestamptz, $2::text, $3::text, $4::jsonb);`,
        [entry.date, entry.user, entry.instrument, JSON.stringify(entry)]
      );
      return;
    }

    const db = readFileDb();
    db.logs = Array.isArray(db.logs) ? db.logs : [];
    db.logs.unshift(entry);
    db.logs = db.logs.slice(0, 500);
    writeFileDb(db);
  }
}

const storage = new Storage();

app.get('/api/logs', async (_req, res) => {
  try {
    const logs = await storage.getLogs();
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read logs.' });
  }
});

app.post('/api/logs', async (req, res) => {
  const payload = req.body || {};
  const instrument = sanitizeInstrument(payload.instrument);
  const user = sanitizeUser(payload.user);
  const protocolId = sanitizeProtocolId(payload.protocolId || payload.protocol);
  const protocolLabel = sanitizeProtocolLabel(payload.protocolLabel, protocolId);

  const entry = {
    date: payload.date || new Date().toISOString(),
    durationSec: Math.max(0, Number(payload.durationSec || 0)),
    user,
    instrument,
    protocolId,
    protocolLabel,
    calories: Math.max(0, Number(payload.calories || 0)),
    avgHr: Math.max(0, Number(payload.avgHr || 0)),
    metrics: sanitizeMetrics(instrument, payload.metrics)
  };

  try {
    await storage.addLog(entry);
    res.status(201).json({ ok: true, entry, storage: storage.mode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save log.' });
  }
});

app.get('/api/storage', (_req, res) => {
  res.json({ backend: storage.mode });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  await storage.init();
  const server = app.listen(PORT, () => {
    console.log(`HIIT TIMER running on http://localhost:${PORT}`);
  });

  module.exports = { app, server, storage };
}

start();
