const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(__dirname));

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { logs: [] };
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.logs)) return { logs: [] };
    return parsed;
  } catch {
    return { logs: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeInstrument(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'running' || normalized === 'rowing' || normalized === 'riding') {
    return normalized;
  }
  return 'running';
}

function sanitizeUser(value) {
  if (value === 'Toby' || value === 'Anna') return value;
  return 'Toby';
}

function clamp(value, min, max) {
  if (value === null) return null;
  return Math.min(max, Math.max(min, value));
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
  return {
    distanceKm: toFiniteNumber(source.distanceKm),
    level: clamp(toFiniteNumber(source.level), 0, 10)
  };
}

app.get('/api/logs', (_req, res) => {
  const db = readDb();
  res.json(db.logs);
});

app.post('/api/logs', (req, res) => {
  const payload = req.body || {};
  const instrument = sanitizeInstrument(payload.instrument);
  const user = sanitizeUser(payload.user);
  const entry = {
    date: payload.date || new Date().toISOString(),
    durationSec: Number(payload.durationSec || 0),
    user,
    instrument,
    calories: Number(payload.calories || 0),
    avgHr: Number(payload.avgHr || 0),
    metrics: sanitizeMetrics(instrument, payload.metrics)
  };

  const db = readDb();
  db.logs.unshift(entry);
  db.logs = db.logs.slice(0, 500);
  writeDb(db);

  res.status(201).json({ ok: true, entry });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`HIIT TIMER running on http://localhost:${PORT}`);
});

module.exports = { app, server };
