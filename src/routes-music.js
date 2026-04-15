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

// ==================== ARTIST BAÅVURU ====================

// BaÅvuru gÃ¶nder
// BaÅvuru gÃ¶nder (Ã¶rnek ÅarkÄ± ile)
router.post('/music/apply', uploadDisk.single('sampleAudio'), async (req, res) => {
  const audioPath = req.file?.path;
  try {
    const { userId, artistName, artistAlias, phone, email, realName } = req.body;
    if (!userId || !artistName) return res.status(400).json({ error: 'Eksik bilgi' });

    // Zaten artist mi?
    const existing = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(userId);
    if (existing) return res.status(400).json({ error: 'Zaten artist hesabÄ±nÄ±z var' });

    // Bekleyen baÅvuru var mÄ±?
    const pending = db.prepare("SELECT id FROM music_artist_applications WHERE user_id = ? AND status = 'pending'").get(userId);
    if (pending) return res.status(400).json({ error: 'Bekleyen baÅvurunuz var' });

    // Ãrnek ÅarkÄ± yÃ¼kle
    let sampleAudioUrl = null;
    if (req.file) {
      sampleAudioUrl = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(audioPath, {
          resource_type: 'video',
          folder: 'tsmusic/samples',
          public_id: `sample_${userId}_${Date.now()}`,
          timeout: 300000
        }, (err, result) => err ? reject(err) : resolve(result.secure_url));
      });
    }

    db.prepare('INSERT INTO music_artist_applications (user_id, artist_name, artist_alias, phone, email, real_name, sample_audio_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, artistName, artistAlias || null, phone || null, email || null, realName || null, sampleAudioUrl);

    res.json({ success: true });
  } catch(e) {
    console.error('BaÅvuru hatasÄ±:', e);
    res.status(500).json({ error: 'BaÅvuru gÃ¶nderilemedi: ' + e.message });
  } finally {
    try { if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch(e) {}
  }
});

// BaÅvuru durumunu getir
router.get('/music/apply/status/:userId', (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM music_artist_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.userId);
    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(req.params.userId);
    res.json({ application: app || null, artist: artist || null });
  } catch(e) {
    res.status(500).json({ error: 'Durum alÄ±namadÄ±' });
  }
});

// ==================== ÅARKI YÃKLEME ====================

// ÅarkÄ± yÃ¼kle (artist)
router.post('/music/song', uploadDisk.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  const audioPath = req.files?.audio?.[0]?.path;
  const coverPath = req.files?.cover?.[0]?.path;
  try {
    const { userId, title, genre, lyrics } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'Eksik bilgi' });

    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(userId);
    if (!artist) return res.status(403).json({ error: 'Artist hesabÄ±nÄ±z yok' });
    if (artist.is_suspended) return res.status(403).json({ error: 'HesabÄ±nÄ±z askÄ±ya alÄ±nmÄ±Å' });

    if (!req.files?.audio || !req.files?.cover) return res.status(400).json({ error: 'Ses ve kapak gerekli' });

    // Kapak yÃ¼kle
    const coverBuffer = fs.readFileSync(coverPath);
    const coverUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'tsmusic/covers', public_id: `cover_${Date.now()}` },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      stream.end(coverBuffer);
    });

    // Ses yÃ¼kle
    const audioUrl = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(audioPath, {
        resource_type: 'video', // Cloudinary'de audio = video resource_type
        folder: 'tsmusic/audio',
        public_id: `audio_${Date.now()}`,
        timeout: 600000
      }, (err, result) => err ? reject(err) : resolve(result.secure_url));
    });

    const result = db.prepare('INSERT INTO songs (artist_id, title, genre, lyrics, audio_url, cover_url, company_name) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(artist.id, title, genre || null, lyrics || null, audioUrl, coverUrl, req.body.companyName || null);

    res.json({ success: true, songId: result.lastInsertRowid });
  } catch(e) {
    console.error('ÅarkÄ± yÃ¼kleme hatasÄ±:', e);
    res.status(500).json({ error: 'ÅarkÄ± yÃ¼klenemedi: ' + e.message });
  } finally {
    try { if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch(e) {}
    try { if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath); } catch(e) {}
  }
});

// ==================== ÅARKI LÄ°STELEME ====================

// Anasayfa - yeni ÅarkÄ±lar + yeni artistler
router.get('/music/home', (req, res) => {
  try {
    const newSongs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.is_suspended = 0 AND a.is_suspended = 0
      ORDER BY RANDOM() LIMIT 20
    `).all();

    const newArtists = db.prepare(`
      SELECT a.*, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id AND is_suspended = 0) as song_count
      FROM music_artists a JOIN users u ON a.user_id = u.id
      WHERE a.is_suspended = 0
      ORDER BY RANDOM() LIMIT 10
    `).all();

    const popularSongs = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.is_suspended = 0 AND a.is_suspended = 0
      ORDER BY RANDOM() LIMIT 20
    `).all();

    res.json({ newSongs, newArtists, popularSongs });
  } catch(e) {
    res.status(500).json({ error: 'Veriler alÄ±namadÄ±' });
  }
});

// ÅarkÄ± arama (baÅlÄ±k, sÃ¶zler, artist)
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
    res.status(500).json({ error: 'Arama baÅarÄ±sÄ±z' });
  }
});

// Artist profili
router.get('/music/artist/:artistId', (req, res) => {
  try {
    const artist = db.prepare(`
      SELECT a.*, u.username, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id AND is_suspended = 0) as song_count,
             a.monthly_plays
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

// ÅarkÄ± detayÄ± + dinlenme sayÄ±sÄ± artÄ±r
router.get('/music/song/:songId', (req, res) => {
  try {
    const song = db.prepare(`
      SELECT s.*, a.artist_name, a.show_play_count, a.id as artist_id
      FROM songs s JOIN music_artists a ON s.artist_id = a.id
      WHERE s.id = ?
    `).get(req.params.songId);
    if (!song) return res.status(404).json({ error: 'ÅarkÄ± bulunamadÄ±' });
    // Dinlenme artır
    db.prepare('UPDATE songs SET play_count = play_count + 1 WHERE id = ?').run(req.params.songId);
    song.play_count += 1;
    
    // Sanatçının aylık dinlenme sayısını artır
    db.prepare('UPDATE music_artists SET monthly_plays = monthly_plays + 1 WHERE id = ?').run(song.artist_id);
    
    res.json(song);
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ± alÄ±namadÄ±' });
  }
});

// ==================== PLAYLÄ°ST ====================

// Playlist oluÅtur
router.post('/music/playlist', (req, res) => {
  try {
    const { userId, name, isPublic } = req.body;
    const result = db.prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)')
      .run(userId, name, isPublic !== false ? 1 : 0);
    res.json({ success: true, playlistId: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: 'Playlist oluÅturulamadÄ±' });
  }
});

// KullanÄ±cÄ±nÄ±n playlistleri
router.get('/music/playlists/:userId', (req, res) => {
  try {
    const playlists = db.prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
      FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC
    `).all(req.params.userId);
    res.json(playlists);
  } catch(e) {
    res.status(500).json({ error: 'Playlistler alÄ±namadÄ±' });
  }
});

// Playlist detayÄ±
router.get('/music/playlist/:playlistId', (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist bulunamadÄ±' });
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
    res.status(500).json({ error: 'Playlist alÄ±namadÄ±' });
  }
});

// Playlist'e ÅarkÄ± ekle
router.post('/music/playlist/:playlistId/song', (req, res) => {
  try {
    const { songId } = req.body;
    db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)').run(req.params.playlistId, songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ± eklenemedi' });
  }
});

// Playlist'ten ÅarkÄ± Ã§Ä±kar
router.delete('/music/playlist/:playlistId/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(req.params.playlistId, req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ± Ã§Ä±karÄ±lamadÄ±' });
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

// ==================== ÅARKI BEÄENÄ° ====================

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
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// BeÄenilen ÅarkÄ±lar
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
    res.status(500).json({ error: 'BeÄeniler alÄ±namadÄ±' });
  }
});

// Artist ayarlarÄ± (dinlenme sayÄ±sÄ± gÃ¶ster/gizle)
router.put('/music/artist/settings', (req, res) => {
  try {
    const { userId, showPlayCount } = req.body;
    db.prepare('UPDATE music_artists SET show_play_count = ? WHERE user_id = ?').run(showPlayCount ? 1 : 0, userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ayarlar gÃ¼ncellenemedi' });
  }
});

// Artist durumu kontrol
router.get('/music/artist-status/:userId', (req, res) => {
  try {
    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(req.params.userId);
    res.json({ isArtist: !!artist, artist: artist || null });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol yapÄ±lamadÄ±' });
  }
});

// Kendi ÅarkÄ±larÄ±m
router.get('/music/my-songs/:userId', (req, res) => {
  try {
    const artist = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(req.params.userId);
    if (!artist) return res.json([]);
    const songs = db.prepare('SELECT * FROM songs WHERE artist_id = ? ORDER BY created_at DESC').all(artist.id);
    res.json(songs);
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ±lar alÄ±namadÄ±' });
  }
});

// ÅarkÄ± gÃ¼ncelle (dinlenme sayÄ±sÄ± sÄ±fÄ±rlanmaz)
router.put('/music/song/:songId', upload.single('cover'), async (req, res) => {
  try {
    const { title, genre, lyrics } = req.body;
    let updateQuery = 'UPDATE songs SET title = ?, genre = ?, lyrics = ?';
    let params = [title, genre || null, lyrics || null];

    if (req.file) {
      const coverUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'teatube/music/covers' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(req.file.buffer);
      });
      updateQuery += ', cover_url = ?';
      params.push(coverUrl);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.songId);
    db.prepare(updateQuery).run(...params);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'GÃ¼ncellenemedi: ' + e.message });
  }
});

// ÅarkÄ± sil
router.delete('/music/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.songId);
    db.prepare('DELETE FROM playlist_songs WHERE song_id = ?').run(req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Silinemedi' });
  }
});

module.exports = router;

// ==================== ÅARKI YAZ ====================

// ÅarkÄ± yaz (artist - beat + lyrics)
router.post('/music/writing', upload.single('beat'), async (req, res) => {
  try {
    const { userId, title, lyrics, genre, beatName } = req.body;
    if (!userId || !title || !lyrics) return res.status(400).json({ error: 'BaÅlÄ±k ve ÅarkÄ± sÃ¶zÃ¼ gerekli' });

    const artist = db.prepare('SELECT * FROM music_artists WHERE user_id = ?').get(userId);
    if (!artist) return res.status(403).json({ error: 'Artist hesabÄ±nÄ±z yok' });

    let beatUrl = null;
    if (req.file) {
      beatUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'tsmusic/beats', public_id: `beat_${Date.now()}` },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(req.file.buffer);
      });
    }

    const result = db.prepare(
      'INSERT INTO song_writings (artist_id, title, lyrics, beat_url, beat_name, genre, allow_rating) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(artist.id, title, lyrics, beatUrl, beatName || null, genre || null, req.body.allowRating !== '0' ? 1 : 0);

    res.json({ success: true, writingId: result.lastInsertRowid });
  } catch(e) {
    console.error('ÅarkÄ± yazma hatasÄ±:', e);
    res.status(500).json({ error: 'Kaydedilemedi: ' + e.message });
  }
});

// TÃ¼m yazÄ±lan ÅarkÄ±lar (keÅfet)
router.get('/music/writings', (req, res) => {
  try {
    const { userId } = req.query;
    const writings = db.prepare(`
      SELECT sw.*,
             a.artist_name, a.is_verified,
             u.profile_photo,
             ROUND(AVG(swr.beat_rating), 1) as avg_beat_rating,
             ROUND(AVG(swr.lyrics_rating), 1) as avg_lyrics_rating,
             COUNT(DISTINCT swr.id) as rating_count,
             COUNT(DISTINCT swc.id) as comment_count
      FROM song_writings sw
      JOIN music_artists a ON sw.artist_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN song_writing_ratings swr ON swr.writing_id = sw.id
      LEFT JOIN song_writing_comments swc ON swc.writing_id = sw.id
      WHERE sw.status = 'published' AND a.is_suspended = 0
      GROUP BY sw.id
      ORDER BY sw.created_at DESC
      LIMIT 50
    `).all();

    // KullanÄ±cÄ±nÄ±n kendi puanlarÄ±nÄ± ekle
    if (userId) {
      const myRatings = db.prepare('SELECT * FROM song_writing_ratings WHERE user_id = ?').all(userId);
      const ratingMap = {};
      myRatings.forEach(r => { ratingMap[r.writing_id] = r; });
      writings.forEach(w => { w.my_rating = ratingMap[w.id] || null; });
    }

    res.json(writings);
  } catch(e) {
    res.status(500).json({ error: 'Veriler alÄ±namadÄ±' });
  }
});

// Artist'in kendi yazÄ±larÄ±
router.get('/music/writings/my/:userId', (req, res) => {
  try {
    const artist = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(req.params.userId);
    if (!artist) return res.json([]);

    const writings = db.prepare(`
      SELECT sw.*,
             ROUND(AVG(swr.beat_rating), 1) as avg_beat_rating,
             ROUND(AVG(swr.lyrics_rating), 1) as avg_lyrics_rating,
             COUNT(DISTINCT swr.id) as rating_count,
             COUNT(DISTINCT swc.id) as comment_count
      FROM song_writings sw
      LEFT JOIN song_writing_ratings swr ON swr.writing_id = sw.id
      LEFT JOIN song_writing_comments swc ON swc.writing_id = sw.id
      WHERE sw.artist_id = ?
      GROUP BY sw.id
      ORDER BY sw.created_at DESC
    `).all(artist.id);

    res.json(writings);
  } catch(e) {
    res.status(500).json({ error: 'Veriler alÄ±namadÄ±' });
  }
});

// ÅarkÄ± yazÄ±sÄ± detayÄ±
router.get('/music/writing/:id', (req, res) => {
  try {
    const { userId } = req.query;
    const writing = db.prepare(`
      SELECT sw.*,
             a.artist_name, a.is_verified, a.id as artist_id,
             u.profile_photo, u.id as user_id_owner,
             ROUND(AVG(swr.beat_rating), 1) as avg_beat_rating,
             ROUND(AVG(swr.lyrics_rating), 1) as avg_lyrics_rating,
             COUNT(DISTINCT swr.id) as rating_count,
             COUNT(DISTINCT swc.id) as comment_count
      FROM song_writings sw
      JOIN music_artists a ON sw.artist_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN song_writing_ratings swr ON swr.writing_id = sw.id
      LEFT JOIN song_writing_comments swc ON swc.writing_id = sw.id
      WHERE sw.id = ?
      GROUP BY sw.id
    `).get(req.params.id);

    if (!writing) return res.status(404).json({ error: 'BulunamadÄ±' });

    const comments = db.prepare(`
      SELECT swc.*, u.nickname, u.profile_photo
      FROM song_writing_comments swc
      JOIN users u ON swc.user_id = u.id
      WHERE swc.writing_id = ?
      ORDER BY swc.created_at DESC
    `).all(req.params.id);

    let myRating = null;
    if (userId) {
      myRating = db.prepare('SELECT * FROM song_writing_ratings WHERE writing_id = ? AND user_id = ?').get(req.params.id, userId);
    }

    res.json({ writing, comments, myRating });
  } catch(e) {
    res.status(500).json({ error: 'Veri alÄ±namadÄ±' });
  }
});

// Puanla (beat + lyrics ayrÄ±)
router.post('/music/writing/:id/rate', (req, res) => {
  try {
    const { userId, beatRating, lyricsRating } = req.body;
    if (!userId) return res.status(400).json({ error: 'KullanÄ±cÄ± gerekli' });

    // allow_rating kontrolÃ¼
    const writing = db.prepare('SELECT allow_rating FROM song_writings WHERE id = ?').get(req.params.id);
    if (writing && writing.allow_rating === 0) {
      return res.status(403).json({ error: 'Bu ÅarkÄ± iÃ§in puanlama kapalÄ±' });
    }

    const existing = db.prepare('SELECT id FROM song_writing_ratings WHERE writing_id = ? AND user_id = ?').get(req.params.id, userId);
    if (existing) {
      db.prepare('UPDATE song_writing_ratings SET beat_rating = ?, lyrics_rating = ?, updated_at = datetime("now") WHERE writing_id = ? AND user_id = ?')
        .run(beatRating || null, lyricsRating || null, req.params.id, userId);
    } else {
      db.prepare('INSERT INTO song_writing_ratings (writing_id, user_id, beat_rating, lyrics_rating) VALUES (?, ?, ?, ?)')
        .run(req.params.id, userId, beatRating || null, lyricsRating || null);
    }

    // GÃ¼ncel ortalamalar
    const avgs = db.prepare('SELECT ROUND(AVG(beat_rating),1) as avg_beat, ROUND(AVG(lyrics_rating),1) as avg_lyrics, COUNT(*) as cnt FROM song_writing_ratings WHERE writing_id = ?').get(req.params.id);
    res.json({ success: true, ...avgs });
  } catch(e) {
    res.status(500).json({ error: 'Puanlama baÅarÄ±sÄ±z' });
  }
});

// Yorum ekle
router.post('/music/writing/:id/comment', (req, res) => {
  try {
    const { userId, comment } = req.body;
    if (!userId || !comment?.trim()) return res.status(400).json({ error: 'Yorum gerekli' });

    const result = db.prepare('INSERT INTO song_writing_comments (writing_id, user_id, comment) VALUES (?, ?, ?)')
      .run(req.params.id, userId, comment.trim());

    const newComment = db.prepare(`
      SELECT swc.*, u.nickname, u.profile_photo
      FROM song_writing_comments swc
      JOIN users u ON swc.user_id = u.id
      WHERE swc.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, comment: newComment });
  } catch(e) {
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

// Yorum sil
router.delete('/music/writing/comment/:commentId', (req, res) => {
  try {
    const { userId } = req.body;
    const comment = db.prepare('SELECT * FROM song_writing_comments WHERE id = ?').get(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Yorum bulunamadÄ±' });
    // Sadece yorum sahibi silebilir
    if (comment.user_id != userId) return res.status(403).json({ error: 'Yetkisiz' });
    db.prepare('DELETE FROM song_writing_comments WHERE id = ?').run(req.params.commentId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Silinemedi' });
  }
});

// ÅarkÄ± yazÄ±sÄ± sil (artist)
router.delete('/music/writing/:id', (req, res) => {
  try {
    const { userId } = req.body;
    const artist = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(userId);
    if (!artist) return res.status(403).json({ error: 'Yetkisiz' });
    const writing = db.prepare('SELECT * FROM song_writings WHERE id = ? AND artist_id = ?').get(req.params.id, artist.id);
    if (!writing) return res.status(404).json({ error: 'BulunamadÄ±' });
    db.prepare('DELETE FROM song_writings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Silinemedi' });
  }
});
