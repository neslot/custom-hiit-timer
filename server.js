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

app.get('/api/logs', (_req, res) => {
  const db = readDb();
  res.json(db.logs);
});

app.post('/api/logs', (req, res) => {
  const payload = req.body || {};
  const entry = {
    date: payload.date || new Date().toISOString(),
    durationSec: Number(payload.durationSec || 0),
    calories: Number(payload.calories || 0),
    avgHr: Number(payload.avgHr || 0)
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

app.listen(PORT, () => {
  console.log(`HIIT TIMER running on http://localhost:${PORT}`);
});