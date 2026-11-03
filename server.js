const express = require('express');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const db = new DatabaseSync(process.env.DB_PATH || 'catatan.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL
  );
`);
db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

// ---------- Helper login ----------
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, Date.now() + SESSION_MS);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`);
}

function getToken(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  return m ? m[1] : null;
}

function requireLogin(req, res, next) {
  const token = getToken(req);
  if (token) {
    const row = db.prepare(
      `SELECT u.id, u.username, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    ).get(token);
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, username: row.username };
      return next();
    }
  }
  res.status(401).json({ error: 'Silakan login dulu' });
}

// ---------- Auth ----------
app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username 3-20 karakter: huruf kecil, angka, garis bawah' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' });
  }
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: 'Username sudah dipakai' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hasil = db.prepare(
    'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)'
  ).run(username, hashPassword(password, salt), salt);
  startSession(res, Number(hasil.lastInsertRowid));
  res.status(201).json({ username });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare(
    'SELECT id, username, password_hash, salt FROM users WHERE username = ?'
  ).get(username);

  // Tetap hitung hash walau user tidak ada, supaya waktu respons tidak membocorkan username
  const salt = user ? user.salt : '0'.repeat(32);
  const hash = Buffer.from(hashPassword(password, salt), 'hex');
  const ok = user && crypto.timingSafeEqual(hash, Buffer.from(user.password_hash, 'hex'));

  if (!ok) return res.status(401).json({ error: 'Username atau password salah' });
  startSession(res, user.id);
  res.json({ username: user.username });
});

app.post('/api/logout', (req, res) => {
  const token = getToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.sendStatus(204);
});

app.get('/api/me', requireLogin, (req, res) => {
  res.json({ username: req.user.username });
});

// ---------- Catatan (hanya milik pengguna yang login) ----------
app.get('/api/notes', requireLogin, (req, res) => {
  const notes = db.prepare('SELECT id, text FROM notes WHERE user_id = ? ORDER BY id')
    .all(req.user.id);
  res.json(notes);
});

app.post('/api/notes', requireLogin, (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks wajib diisi' });
  const hasil = db.prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)')
    .run(req.user.id, text);
  res.status(201).json({ id: Number(hasil.lastInsertRowid), text });
});

app.put('/api/notes/:id', requireLogin, (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks wajib diisi' });
  const hasil = db.prepare('UPDATE notes SET text = ? WHERE id = ? AND user_id = ?')
    .run(text, Number(req.params.id), req.user.id);
  if (hasil.changes === 0) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  res.json({ id: Number(req.params.id), text });
});

app.delete('/api/notes/:id', requireLogin, (req, res) => {
  const hasil = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (hasil.changes === 0) return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Jalan di port ' + PORT));