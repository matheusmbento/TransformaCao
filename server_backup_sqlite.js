const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'banco.db');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Erro:', err.message);
  else initDatabase();
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS system_state (key TEXT PRIMARY KEY, value TEXT)`);
  });
}

app.get('/api/db', (req, res) => {
  db.get("SELECT value FROM system_state WHERE key = 'state'", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json(null);
    try { res.json(JSON.parse(row.value)); } 
    catch (e) { res.status(500).json({ error: 'Erro ao processar dados salvos no banco' }); }
  });
});

app.post('/api/save', (req, res) => {
  const stateString = JSON.stringify(req.body);
  db.run("INSERT INTO system_state (key, value) VALUES ('state', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [stateString], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/shutdown', (req, res) => {
  res.json({ success: true });
  setTimeout(() => process.exit(0), 1000);
});

app.get('/api/backup/download', (req, res) => {
  const dateStr = new Date().toISOString().split('T')[0];
  res.download(DB_PATH, `banco_backup_${dateStr}.db`);
});

app.post('/api/backup/telegram', async (req, res) => {
  const { botToken, chatId } = req.body;
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', `Backup SQLite Local`);
    form.append('document', fs.createReadStream(DB_PATH), { filename: 'banco.db' });
    await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form, { headers: form.getHeaders() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/telegram/message', async (req, res) => {
  const { botToken, chatId, text } = req.body;
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text, parse_mode: 'HTML' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log('Servidor Local SQLite rodando...'));
