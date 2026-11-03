# Catatan

Aplikasi catatan sederhana dengan login. Setiap pengguna hanya bisa melihat, mengubah, dan menghapus catatannya sendiri. Dibuat sebagai proyek belajar fullstack (frontend, API, database).

## Fitur

- Daftar, masuk, dan keluar
- Tambah, lihat, ubah (edit langsung di tempat), dan hapus catatan
- Data tiap pengguna terpisah
- Pesan error yang jelas di layar saat server tidak bisa dihubungi

## Teknologi

- **Frontend:** HTML, CSS, JavaScript biasa (tanpa framework), memakai `fetch`
- **Backend:** Node.js + Express
- **Database:** SQLite lewat modul bawaan Node (`node:sqlite`), satu file `catatan.db`
- **Keamanan:** password di-hash dengan `scrypt`, sesi lewat cookie `HttpOnly`

## Cara menjalankan

Syarat: Node.js versi baru yang punya modul `node:sqlite` (dikembangkan dengan v26.13.0).

```bash
git clone https://github.com/muhammadhafizalhakim0-creator/catatan.git
cd catatan
npm install
npm start
```

Buka `http://localhost:3000`, klik **Daftar**, lalu mulai menulis catatan. File `catatan.db` dibuat otomatis saat server pertama kali jalan.

### Variabel lingkungan (opsional)

| Nama | Fungsi | Bawaan |
|---|---|---|
| `PORT` | Port server | `3000` |
| `DB_PATH` | Lokasi file database | `catatan.db` |
| `NODE_ENV` | Isi `production` agar cookie sesi memakai atribut `Secure` (wajib bila diakses lewat HTTPS) | kosong |

## Struktur proyek

```
catatan/
├── server.js          # Server Express, API, dan database
├── public/
│   └── index.html     # Seluruh tampilan dan logika frontend
├── package.json
└── .gitignore
```

## API

| Metode | Alamat | Fungsi | Perlu login |
|---|---|---|---|
| POST | `/api/register` | Buat akun baru | Tidak |
| POST | `/api/login` | Masuk | Tidak |
| POST | `/api/logout` | Keluar | Tidak |
| GET | `/api/me` | Cek siapa yang sedang login | Ya |
| GET | `/api/notes` | Daftar catatan milik sendiri | Ya |
| POST | `/api/notes` | Tambah catatan | Ya |
| PUT | `/api/notes/:id` | Ubah catatan | Ya |
| DELETE | `/api/notes/:id` | Hapus catatan | Ya |

Perubahan dan penghapusan selalu dicek terhadap pemilik catatan di sisi server (`WHERE id = ? AND user_id = ?`), sehingga pengguna lain tidak bisa mengaksesnya hanya dengan menebak ID.

## Batasan yang diketahui

Proyek ini untuk belajar, bukan untuk produksi. Yang belum ada:

- Pembatasan percobaan login (rate limiting)
- Reset password
- Token sesi disimpan apa adanya di database (praktik yang lebih baik: simpan hash-nya)
- Perlindungan CSRF hanya mengandalkan `SameSite=Lax`
- Belum ada tes otomatis
- Belum di-deploy. Hosting gratis umumnya tidak menyimpan file SQLite secara permanen, jadi data bisa hilang saat server restart.

Untuk aplikasi dengan data pengguna sungguhan, pakai library atau layanan autentikasi yang sudah teruji, bukan implementasi sendiri seperti di sini.
