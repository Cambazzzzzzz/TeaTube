const express = require('express');
const router = express.Router();
const db = require('./database');
const multer = require('multer');
const cloudinaryModule = require('./cloudinary');
const cloudinary = cloudinaryModule.cloudinary;
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});
const upload = multer({ storage: multer.memoryStorage() });
const uploadDisk = multer({ storage: diskStorage });

// ==================== ARTIST BAŞVURU ====================

// Başvuru gönder
router.post('/music/apply', (req, res) => {
  try {
    const { userId, artistName, artistAlias, phone, email, realName } = req.body;
    if (!userId || !artistName) return res.status(400).json({ error: 'Eksik bilgi' });

    // Zaten artist mi?
    const existing = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(userId);
    if (existing) return res.status(400).json({ error: 'Zaten artist hesabınız var' });

    // Bekleyen başvuru var mı?
    const pending = db.prepare("SELECT id FROM music_artist_applications WHERE user_id = ? AND status = 'pending'").get(userId);
    if (pending) return res.status(400).json({ error: 'Bekleyen başvurunuz var' });

    db.prepare('INSERT INTO music_artist_applications (user_id, artist_name, artist_alias, phone, email, real_name) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, artistName, artistAlias || null, phone || null, email || null, realName || null);

    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Başvuru gönderilemedi' });
  }
});

// Başvuru durumunu getir
router.get('/music/apply/status/:userId', (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM music_artist_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.userId);
    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(req.params.userId);
    res.json({ application: app || null, artist: artist || null });
  } catch(e) {
    res.status(500).json({ error: 'Durum alınamadı' });
  }
});

// ==================== ŞARKI YÜKLEME ====================

// Şarkı yükle (artist)
router.post('/music/song', uploadDisk.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  const audioPath = req.files?.audio?.[0]?.path;
  const coverPath = req.files?.cover?.[0]?.path;
  try {
    const { userId, title, genre, lyrics } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'Eksik bilgi' });

    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(userId);
    if (!artist) return res.status(403).json({ error: 'Artist hesabınız yok' });
    if (artist.is_suspended) return res.status(403).json({ error: 'Hesabınız askıya alınmış' });

    if (!req.files?.audio || !req.files?.cover) return res.status(400).json({ error: 'Ses ve kapak gerekli' });

    // Kapak yükle
    const coverBuffer = fs.readFileSync(coverPath);
    const coverUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'tsmusic/covers', public_id: `cover_${Date.now()}` },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      stream.end(coverBuffer);
    });

    // Ses yükle
    const audioUrl = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(audioPath, {
        resource_type: 'video', // Cloudinary'de audio = video resource_type
        folder: 'tsmusic/audio',
        public_id: `audio_${Date.now()}`,
        timeout: 600000
      }, (err, result) => err ? reject(err) : resolve(result.secure_url));
    });

    const result = db.prepare('INSERT INTO songs (artist_id, title, genre, lyrics, audio_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)')
      .run(artist.id, title, genre || null, lyrics || null, audioUrl, coverUrl);

    res.json({ success: true, songId: result.lastInsertRowid });
  } catch(e) {
    console.error('Şarkı yükleme hatası:', e);
    res.status(500).json({ error: 'Şarkı yüklenemedi: ' + e.message });
  } finally {
    try { if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch(e) {}
    try { if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath); } catch(e) {}
  }
});

// ==================== ŞARKI LİSTELEME ====================

// Anasayfa - yeni şarkılar + yeni artistler
router.get('/music/home', (req, res) => {
  try {
    const newSongs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.is_suspended = 0 AND a.is_suspended = 0
      ORDER BY s.created_at DESC LIMIT 20
    `).all();

    const newArtists = db.prepare(`
      SELECT a.*, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id AND is_suspended = 0) as song_count
      FROM music_artists a JOIN users u ON a.user_id = u.id
      WHERE a.is_suspended = 0
      ORDER BY a.created_at DESC LIMIT 10
    `).all();

    const popularSongs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.is_suspended = 0 AND a.is_suspended = 0
      ORDER BY s.play_count DESC LIMIT 20
    `).all();

    res.json({ newSongs, newArtists, popularSongs });
  } catch(e) {
    res.status(500).json({ error: 'Veriler alınamadı' });
  }
});

// Şarkı arama (başlık, sözler, artist)
router.get('/music/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ songs: [], artists: [] });

    const songs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.is_suspended = 0 AND a.is_suspended = 0
        AND (s.title LIKE ? OR s.lyrics LIKE ? OR a.artist_name LIKE ?)
      ORDER BY s.play_count DESC LIMIT 30
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);

    const artists = db.prepare(`
      SELECT a.*, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id AND is_suspended = 0) as song_count
      FROM music_artists a JOIN users u ON a.user_id = u.id
      WHERE a.is_suspended = 0 AND (a.artist_name LIKE ? OR a.artist_alias LIKE ?)
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`);

    res.json({ songs, artists });
  } catch(e) {
    res.status(500).json({ error: 'Arama başarısız' });
  }
});

// Artist profili
router.get('/music/artist/:artistId', (req, res) => {
  try {
    const artist = db.prepare(`
      SELECT a.*, u.username, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id AND is_suspended = 0) as song_count
      FROM music_artists a JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(req.params.artistId);
    if (!artist) return res.status(404).json({ error: 'Artist bulunamadı' });

    const songs = db.prepare('SELECT * FROM songs WHERE artist_id = ? AND is_suspended = 0 ORDER BY created_at DESC').all(req.params.artistId);
    res.json({ artist, songs });
  } catch(e) {
    res.status(500).json({ error: 'Artist alınamadı' });
  }
});

// Şarkı detayı + dinlenme sayısı artır
router.get('/music/song/:songId', (req, res) => {
  try {
    const song = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count, a.id as artist_id
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.id = ?
    `).get(req.params.songId);
    if (!song) return res.status(404).json({ error: 'Şarkı bulunamadı' });
    // Dinlenme artır
    db.prepare('UPDATE songs SET play_count = play_count + 1 WHERE id = ?').run(req.params.songId);
    song.play_count += 1;
    res.json(song);
  } catch(e) {
    res.status(500).json({ error: 'Şarkı alınamadı' });
  }
});

// ==================== PLAYLİST ====================

// Playlist oluştur
router.post('/music/playlist', (req, res) => {
  try {
    const { userId, name, isPublic } = req.body;
    const result = db.prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)')
      .run(userId, name, isPublic !== false ? 1 : 0);
    res.json({ success: true, playlistId: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: 'Playlist oluşturulamadı' });
  }
});

// Kullanıcının playlistleri
router.get('/music/playlists/:userId', (req, res) => {
  try {
    const playlists = db.prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
      FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC
    `).all(req.params.userId);
    res.json(playlists);
  } catch(e) {
    res.status(500).json({ error: 'Playlistler alınamadı' });
  }
});

// Playlist detayı
router.get('/music/playlist/:playlistId', (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist bulunamadı' });
    const songs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM playlist_songs ps
      JOIN songs s ON ps.song_id = s.id
      JOIN music_artists a ON s.artist_id = a.id
      WHERE ps.playlist_id = ? AND s.is_suspended = 0
      ORDER BY ps.added_at ASC
    `).all(req.params.playlistId);
    res.json({ playlist, songs });
  } catch(e) {
    res.status(500).json({ error: 'Playlist alınamadı' });
  }
});

// Playlist'e şarkı ekle
router.post('/music/playlist/:playlistId/song', (req, res) => {
  try {
    const { songId } = req.body;
    db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)').run(req.params.playlistId, songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şarkı eklenemedi' });
  }
});

// Playlist'ten şarkı çıkar
router.delete('/music/playlist/:playlistId/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(req.params.playlistId, req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şarkı çıkarılamadı' });
  }
});

// Playlist sil
router.delete('/music/playlist/:playlistId', (req, res) => {
  try {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.playlistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Playlist silinemedi' });
  }
});

// ==================== ŞARKI BEĞENİ ====================

router.post('/music/song/:songId/like', (req, res) => {
  try {
    const { userId } = req.body;
    const existing = db.prepare('SELECT id FROM song_likes WHERE user_id = ? AND song_id = ?').get(userId, req.params.songId);
    if (existing) {
      db.prepare('DELETE FROM song_likes WHERE user_id = ? AND song_id = ?').run(userId, req.params.songId);
      res.json({ liked: false });
    } else {
      db.prepare('INSERT INTO song_likes (user_id, song_id) VALUES (?, ?)').run(userId, req.params.songId);
      res.json({ liked: true });
    }
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Beğenilen şarkılar
router.get('/music/liked/:userId', (req, res) => {
  try {
    const songs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM song_likes sl
      JOIN songs s ON sl.song_id = s.id
      JOIN music_artists a ON s.artist_id = a.id
      WHERE sl.user_id = ? AND s.is_suspended = 0
      ORDER BY sl.created_at DESC
    `).all(req.params.userId);
    res.json(songs);
  } catch(e) {
    res.status(500).json({ error: 'Beğeniler alınamadı' });
  }
});

// Artist ayarları (dinlenme sayısı göster/gizle)
router.put('/music/artist/settings', (req, res) => {
  try {
    const { userId, showPlayCount } = req.body;
    db.prepare('UPDATE music_artists SET show_play_count = ? WHERE user_id = ?').run(showPlayCount ? 1 : 0, userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

module.exports = router;
