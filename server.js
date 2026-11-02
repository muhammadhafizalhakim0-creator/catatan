const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const db = new DatabaseSync(process.env.DB_PATH || 'catatan.db');db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL
  )
`);

app.get('/api/notes', (req, res) => {
  const notes = db.prepare('SELECT id, text FROM notes ORDER BY id').all();
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks wajib diisi' });

  const hasil = db.prepare('INSERT INTO notes (text) VALUES (?)').run(text);
  res.status(201).json({ id: Number(hasil.lastInsertRowid), text });
});

app.put('/api/notes/:id', (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks wajib diisi' });

  const hasil = db.prepare('UPDATE notes SET text = ? WHERE id = ?')
    .run(text, Number(req.params.id));
  if (hasil.changes === 0) {
    return res.status(404).json({ error: 'Catatan tidak ditemukan' });
  }
  res.json({ id: Number(req.params.id), text });
});

app.delete('/api/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(Number(req.params.id));
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Jalan di port ' + PORT));