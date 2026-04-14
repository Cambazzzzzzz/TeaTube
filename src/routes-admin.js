const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

// ==================== ADMIN AUTH ====================

// Admin giriÅ
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: 'HatalÄ± kullanÄ±cÄ± adÄ± veya Åifre' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'HatalÄ± kullanÄ±cÄ± adÄ± veya Åifre' });
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  } catch(e) {
    res.status(500).json({ error: 'GiriÅ hatasÄ±' });
  }
});

// Admin Åifre deÄiÅtir
router.put('/admin/password', async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadÄ±' });
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'Eski Åifre hatalÄ±' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, adminId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Åifre deÄiÅtirilemedi' });
  }
});

// Admin mevcut Åifreyi gÃ¶ster (hash olarak)
router.get('/admin/info/:adminId', (req, res) => {
  try {
    const admin = db.prepare('SELECT id, username, password, created_at FROM admins WHERE id = ?').get(req.params.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadÄ±' });
    res.json(admin);
  } catch(e) {
    res.status(500).json({ error: 'Bilgi alÄ±namadÄ±' });
  }
});

// ==================== ADMIN DASHBOARD ====================

// Genel istatistikler
router.get('/admin/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const suspendedUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 1').get().cnt;
    const totalVideos = db.prepare('SELECT COUNT(*) as cnt FROM videos').get().cnt;
    const totalChannels = db.prepare('SELECT COUNT(*) as cnt FROM channels WHERE account_type = "channel"').get().cnt;
    const totalPersonal = db.prepare('SELECT COUNT(*) as cnt FROM channels WHERE account_type = "personal"').get().cnt;
    const totalSongs = db.prepare('SELECT COUNT(*) as cnt FROM songs').get().cnt;
    const totalArtists = db.prepare('SELECT COUNT(*) as cnt FROM music_artists').get().cnt;
    const pendingApplications = db.prepare('SELECT COUNT(*) as cnt FROM music_artist_applications WHERE status = "pending"').get().cnt;
    const bannedIPs = db.prepare("SELECT COUNT(*) as cnt FROM ip_blocks WHERE blocked_until > datetime('now')").get().cnt;

    res.json({
      totalUsers, suspendedUsers, totalVideos, totalChannels,
      totalPersonal, totalSongs, totalArtists, pendingApplications, bannedIPs
    });
  } catch(e) {
    res.status(500).json({ error: 'Ä°statistikler alÄ±namadÄ±' });
  }
});

// ==================== KULLANICI YÃNETÄ°MÄ° ====================

// TÃ¼m kullanÄ±cÄ±lar
router.get('/admin/users', (req, res) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.username, u.nickname, u.profile_photo, u.created_at, u.is_suspended, u.suspend_reason, u.last_ip, u.is_red_verified,
             c.id as channel_id, c.channel_name, c.account_type,
             (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as sub_count
      FROM users u
      LEFT JOIN channels c ON c.user_id = u.id
    `;
    const params = [];
    if (q) { query += ` WHERE u.username LIKE ? OR u.nickname LIKE ?`; params.push(`%${q}%`, `%${q}%`); }
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch(e) {
    res.status(500).json({ error: 'KullanÄ±cÄ±lar alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ± detayÄ±
router.get('/admin/user/:userId', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, c.id as channel_id, c.channel_name, c.account_type, c.about
      FROM users u LEFT JOIN channels c ON c.user_id = u.id
      WHERE u.id = ?
    `).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: 'KullanÄ±cÄ± alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ± giriÅ denemeleri (Åifresiz)
router.get('/admin/user/:userId/login-attempts', (req, res) => {
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    const attempts = db.prepare(
      'SELECT ip_address, success, attempted_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);
    res.json(attempts);
  } catch(e) {
    res.status(500).json({ error: 'Denemeler alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ± mesajlarÄ±
router.get('/admin/user/:userId/messages', (req, res) => {
  try {
    // Firebase mesajlarÄ± DB'de olmadÄ±ÄÄ± iÃ§in sadece bildirim geÃ§miÅini dÃ¶ndÃ¼r
    const notifs = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.userId);
    res.json(notifs);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ± askÄ±ya al / aktif et
router.put('/admin/user/:userId/suspend', (req, res) => {
  try {
    const { suspend, reason } = req.body;
    const userId = req.params.userId;
    
    // KullanÄ±cÄ±yÄ± askÄ±ya al/kaldÄ±r
    db.prepare('UPDATE users SET is_suspended = ?, suspend_reason = ? WHERE id = ?')
      .run(suspend ? 1 : 0, reason || null, userId);
    
    if (suspend) {
      // TÃ¼m videolarÄ±nÄ± askÄ±ya al
      db.prepare('UPDATE videos SET is_suspended = 1 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
      // TÃ¼m gruplardan Ã§Ä±kar (owner deÄilse)
      db.prepare('DELETE FROM group_members WHERE user_id = ? AND role != "owner"').run(userId);
    } else {
      // AskÄ±yÄ± kaldÄ±rÄ±nca videolarÄ± da geri getir
      db.prepare('UPDATE videos SET is_suspended = 0 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// KullanÄ±cÄ± Åifresini deÄiÅtir
router.put('/admin/user/:userId/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Åifre deÄiÅtirilemedi' });
  }
});

// KullanÄ±cÄ± isim/nickname deÄiÅtir (admin)
router.put('/admin/user/:userId/rename', (req, res) => {
  try {
    const { username, nickname } = req.body;
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.userId);
      if (existing) return res.status(400).json({ error: 'Bu kullanÄ±cÄ± adÄ± zaten kullanÄ±lÄ±yor' });
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.params.userId);
    }
    if (nickname) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.params.userId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°sim deÄiÅtirilemedi' });
  }
});

// KullanÄ±cÄ± sil
router.delete('/admin/user/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'KullanÄ±cÄ± silinemedi' });
  }
});

// KullanÄ±cÄ±ya yasak ekle (mesaj/yorum/video)
router.post('/admin/user/:userId/ban', (req, res) => {
  try {
    const { banType, reason, isPermanent, bannedUntil } = req.body;
    db.prepare('INSERT OR REPLACE INTO user_bans (user_id, ban_type, reason, is_permanent, banned_until) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.userId, banType, reason, isPermanent ? 1 : 0, bannedUntil || null);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Yasak eklenemedi' });
  }
});

// KullanÄ±cÄ± yasaklarÄ±nÄ± getir
router.get('/admin/user/:userId/bans', (req, res) => {
  try {
    const bans = db.prepare('SELECT * FROM user_bans WHERE user_id = ?').all(req.params.userId);
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Yasaklar alÄ±namadÄ±' });
  }
});

// Yasak kaldÄ±r
router.delete('/admin/ban/:banId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_bans WHERE id = ?').run(req.params.banId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Yasak kaldÄ±rÄ±lamadÄ±' });
  }
});

// IP ban
router.post('/admin/ip-ban', (req, res) => {
  try {
    const { ip, hours } = req.body;
    const until = new Date(Date.now() + (hours || 24) * 3600000).toISOString();
    db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until) VALUES (?, ?)').run(ip, until);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'IP banlanamadÄ±' });
  }
});

// IP ban kaldÄ±r
router.delete('/admin/ip-ban/:ip', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(decodeURIComponent(req.params.ip));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldÄ±rÄ±lamadÄ±' });
  }
});

// TÃ¼m IP banlarÄ± + POST ile yeni ban ekle
router.get('/admin/ip-bans', (req, res) => {
  try {
    const bans = db.prepare("SELECT * FROM ip_blocks ORDER BY created_at DESC").all();
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Banlar alÄ±namadÄ±' });
  }
});

router.post('/admin/ip-bans', (req, res) => {
  try {
    const { ip, reason, hours } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP gerekli' });
    const until = new Date(Date.now() + (hours || 24 * 365) * 3600000).toISOString();
    db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until) VALUES (?, ?)').run(ip, until);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'IP banlanamadÄ±' });
  }
});

router.delete('/admin/ip-bans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldÄ±rÄ±lamadÄ±' });
  }
});

// ==================== VÄ°DEO YÃNETÄ°MÄ° ====================

// TÃ¼m videolar
router.get('/admin/videos', (req, res) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT v.*, c.channel_name, u.username, u.nickname
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
    `;
    const params = [];
    if (q) { query += ` WHERE v.title LIKE ? OR c.channel_name LIKE ?`; params.push(`%${q}%`, `%${q}%`); }
    query += ` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const videos = db.prepare(query).all(...params);
    res.json(videos);
  } catch(e) {
    res.status(500).json({ error: 'Videolar alÄ±namadÄ±' });
  }
});

// Video askÄ±ya al / aktif et
router.put('/admin/video/:videoId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE videos SET suspended_by_admin = ?, is_hidden = ? WHERE id = ?')
      .run(suspend ? 1 : 0, suspend ? 1 : 0, req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// Video sil
router.delete('/admin/video/:videoId', (req, res) => {
  try {
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Video silinemedi' });
  }
});

// Video dÃ¼zenle
router.put('/admin/video/:videoId', (req, res) => {
  try {
    const { title, description, tags, views } = req.body;
    if (views !== undefined && views !== null && views !== '') {
      db.prepare('UPDATE videos SET title = ?, description = ?, tags = ?, views = ? WHERE id = ?')
        .run(title, description || null, tags || null, parseInt(views) || 0, req.params.videoId);
    } else {
      db.prepare('UPDATE videos SET title = ?, description = ?, tags = ? WHERE id = ?')
        .run(title, description || null, tags || null, req.params.videoId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Video dÃ¼zenlenemedi' });
  }
});

// Video etiketlerini getir
router.get('/admin/video/:videoId/tags', (req, res) => {
  try {
    const video = db.prepare('SELECT tags FROM videos WHERE id = ?').get(req.params.videoId);
    res.json({ tags: video?.tags || '' });
  } catch(e) {
    res.status(500).json({ error: 'Etiketler alÄ±namadÄ±' });
  }
});

// ==================== KANAL YÃNETÄ°MÄ° ====================

// TÃ¼m kanallar
router.get('/admin/channels', (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT c.*, u.username, u.nickname, u.profile_photo, u.is_suspended,
             (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as sub_count
      FROM channels c JOIN users u ON c.user_id = u.id
    `;
    if (type === 'channel') query += ` WHERE c.account_type = 'channel'`;
    else if (type === 'personal') query += ` WHERE c.account_type = 'personal'`;
    query += ` ORDER BY c.created_at DESC`;
    const channels = db.prepare(query).all();
    res.json(channels);
  } catch(e) {
    res.status(500).json({ error: 'Kanallar alÄ±namadÄ±' });
  }
});

// Kanal dÃ¼zenle
router.put('/admin/channel/:channelId', (req, res) => {
  try {
    const { channel_name, about, account_type } = req.body;
    db.prepare('UPDATE channels SET channel_name = ?, about = ?, account_type = ? WHERE id = ?')
      .run(channel_name, about, account_type, req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kanal dÃ¼zenlenemedi' });
  }
});

// ==================== TS MUSIC ADMIN ====================

// TÃ¼m baÅvurular
router.get('/admin/music/applications', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, u.username, u.nickname, u.profile_photo
      FROM music_artist_applications a
      JOIN users u ON a.user_id = u.id
    `;
    if (status) query += ` WHERE a.status = '${status}'`;
    query += ` ORDER BY a.created_at DESC`;
    const apps = db.prepare(query).all();
    res.json(apps);
  } catch(e) {
    res.status(500).json({ error: 'BaÅvurular alÄ±namadÄ±' });
  }
});

// BaÅvuru kabul/red
router.put('/admin/music/application/:id', (req, res) => {
  try {
    const { action, note } = req.body;
    const app = db.prepare('SELECT * FROM music_artist_applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'BaÅvuru bulunamadÄ±: id=' + req.params.id });

    db.prepare('UPDATE music_artist_applications SET status = ?, admin_note = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
      .run(action, note || null, req.params.id);

    if (action === 'accepted') {
      const existing = db.prepare('SELECT id FROM music_artists WHERE user_id = ?').get(app.user_id);
      if (!existing) {
        db.prepare('INSERT INTO music_artists (user_id, artist_name, artist_alias) VALUES (?, ?, ?)')
          .run(app.user_id, app.artist_name, app.artist_alias || null);
      }
      try {
        db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
          .run(app.user_id, 'music_accepted', 'TS Music baÅvurunuz kabul edildi! ArtÄ±k ÅarkÄ± yÃ¼kleyebilirsiniz.');
      } catch(ne) {}
    } else if (action === 'rejected') {
      try {
        db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
          .run(app.user_id, 'music_rejected', `TS Music baÅvurunuz reddedildi.${note ? ' Not: ' + note : ''}`);
      } catch(ne) {}
    }

    res.json({ success: true });
  } catch(e) {
    console.error('Music application error:', e);
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z: ' + e.message });
  }
});

// TÃ¼m ÅarkÄ±lar (admin)
router.get('/admin/music/songs', (req, res) => {
  try {
    const songs = db.prepare(`
      SELECT s.*, a.artist_name, u.username
      FROM songs s
      JOIN music_artists a ON s.artist_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(songs);
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ±lar alÄ±namadÄ±' });
  }
});

// ÅarkÄ± askÄ±ya al / aktif et
router.put('/admin/music/song/:songId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE songs SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// ÅarkÄ± sil
router.delete('/admin/music/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ± silinemedi' });
  }
});

// ÅarkÄ± dÃ¼zenle (admin)
router.put('/admin/music/song/:songId', (req, res) => {
  try {
    const { title, genre, play_count } = req.body;
    // play_count gÃ¶nderilmemiÅse mevcut deÄeri koru
    if (play_count !== undefined && play_count !== null && play_count !== '') {
      db.prepare('UPDATE songs SET title = ?, genre = ?, play_count = ? WHERE id = ?')
        .run(title, genre, parseInt(play_count), req.params.songId);
    } else {
      db.prepare('UPDATE songs SET title = ?, genre = ? WHERE id = ?')
        .run(title, genre, req.params.songId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÅarkÄ± dÃ¼zenlenemedi' });
  }
});

// TÃ¼m artistler (admin)
router.get('/admin/music/artists', (req, res) => {
  try {
    const artists = db.prepare(`
      SELECT a.*, u.username, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM songs WHERE artist_id = a.id) as song_count
      FROM music_artists a JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `).all();
    res.json(artists);
  } catch(e) {
    res.status(500).json({ error: 'Artistler alÄ±namadÄ±' });
  }
});

// Artist askÄ±ya al
router.put('/admin/music/artist/:artistId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE music_artists SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// Artist sil
router.delete('/admin/music/artist/:artistId', (req, res) => {
  try {
    db.prepare('DELETE FROM music_artists WHERE id = ?').run(req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Artist silinemedi' });
  }
});

// Artist dÃ¼zenle
router.put('/admin/music/artist/:artistId', (req, res) => {
  try {
    const { artist_name, artist_alias, bio } = req.body;
    db.prepare('UPDATE music_artists SET artist_name = ?, artist_alias = ?, bio = ? WHERE id = ?')
      .run(artist_name, artist_alias, bio, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Artist dÃ¼zenlenemedi' });
  }
});

module.exports = router;

// ==================== BYPASS ÅÄ°FRESÄ° ====================

// Bypass Åifresini getir
router.get('/admin/bypass-password', (req, res) => {
  try {
    const setting = db.prepare("SELECT value FROM admin_settings WHERE key = 'bypass_password'").get();
    res.json({ password: setting?.value || '' });
  } catch(e) {
    res.status(500).json({ error: 'AlÄ±namadÄ±' });
  }
});

// Bypass Åifresini gÃ¼ncelle
router.put('/admin/bypass-password', (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Åifre en az 8 karakter olmalÄ±' });
    db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('bypass_password', ?)").run(password);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'GÃ¼ncellenemedi' });
  }
});

// ==================== KIRMIZI TÄ°K ====================

// KÄ±rmÄ±zÄ± tik ver
router.post('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 1 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// KÄ±rmÄ±zÄ± tik al
router.delete('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// ==================== FIREBASE ADMIN - MESAJLAÅMA ====================
// Firebase Admin SDK'yÄ± yÃ¼kle
let firebaseAdmin = null;
try {
  firebaseAdmin = require('./firebase-admin');
} catch(e) {
  console.warn('â ï¸ Firebase Admin SDK yÃ¼klenmedi. MesajlaÅma Ã¶zellikleri Ã§alÄ±Åmayacak.');
}

// TÃ¼m DM konuÅmalarÄ±nÄ± listele
router.get('/admin/firebase/conversations', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    const snapshot = await firebaseAdmin.db.ref('conversations').once('value');
    const conversations = [];
    snapshot.forEach(child => {
      conversations.push({ id: child.key, ...child.val() });
    });
    res.json(conversations);
  } catch(e) {
    res.status(500).json({ error: 'KonuÅmalar alÄ±namadÄ±', message: e.message });
  }
});

// Belirli bir konuÅmanÄ±n mesajlarÄ±nÄ± getir
router.get('/admin/firebase/messages/:conversationId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`messages/${req.params.conversationId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alÄ±namadÄ±', message: e.message });
  }
});

// Admin olarak mesaj gÃ¶nder
router.post('/admin/firebase/send-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    const { conversationId, senderId, text, type = 'text' } = req.body;
    const messageRef = firebaseAdmin.db.ref(`messages/${conversationId}`).push();
    await messageRef.set({
      senderId,
      text,
      type,
      timestamp: Date.now(),
      read: false
    });
    res.json({ success: true, messageId: messageRef.key });
  } catch(e) {
    res.status(500).json({ error: 'Mesaj gÃ¶nderilemedi', message: e.message });
  }
});

// Mesaj sil
router.delete('/admin/firebase/message/:conversationId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    await firebaseAdmin.db.ref(`messages/${req.params.conversationId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Mesaj silinemedi', message: e.message });
  }
});

// ==================== FIREBASE ADMIN - GRUP YÃNETÄ°MÄ° ====================

// TÃ¼m grup mesajlarÄ±nÄ± listele
router.get('/admin/firebase/group-messages/:groupId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajlarÄ± alÄ±namadÄ±', message: e.message });
  }
});

// Admin olarak gruba mesaj gÃ¶nder
router.post('/admin/firebase/send-group-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    const { groupId, senderId, text, type = 'text' } = req.body;
    const messageRef = firebaseAdmin.db.ref(`groupMessages/${groupId}`).push();
    await messageRef.set({
      senderId,
      text,
      type,
      timestamp: Date.now()
    });
    res.json({ success: true, messageId: messageRef.key });
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajÄ± gÃ¶nderilemedi', message: e.message });
  }
});

// Grup mesajÄ± sil
router.delete('/admin/firebase/group-message/:groupId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÄ±landÄ±rÄ±lmamÄ±Å' });
  try {
    await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajÄ± silinemedi', message: e.message });
  }
});

// ==================== GRUP YÃNETÄ°MÄ° (SQL) ====================

// Grup adÄ±nÄ± deÄiÅtir
router.put('/admin/group/:groupId/name', (req, res) => {
  try {
    const { name } = req.body;
    db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup adÄ± deÄiÅtirilemedi' });
  }
});

// Grup aÃ§Ä±klamasÄ±nÄ± deÄiÅtir
router.put('/admin/group/:groupId/description', (req, res) => {
  try {
    const { description } = req.body;
    db.prepare('UPDATE groups SET description = ? WHERE id = ?').run(description, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup aÃ§Ä±klamasÄ± deÄiÅtirilemedi' });
  }
});

// Grup Ã¼yesini Ã§Ä±kar
router.delete('/admin/group/:groupId/member/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
      .run(req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ãye Ã§Ä±karÄ±lamadÄ±' });
  }
});

// Grup Ã¼yesinin rolÃ¼nÃ¼ deÄiÅtir
router.put('/admin/group/:groupId/member/:userId/role', (req, res) => {
  try {
    const { role } = req.body; // owner, moderator, member
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?')
      .run(role, req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Rol deÄiÅtirilemedi' });
  }
});

// Grubu sil
router.delete('/admin/group/:groupId', (req, res) => {
  try {
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup silinemedi' });
  }
});

// ==================== ROZET YÃNETÄ°MÄ° ====================

// TÃ¼m rozetler
router.get('/admin/badges', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY created_at DESC').all();
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alÄ±namadÄ±' }); }
});

// Rozet oluÅtur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    if (!name || !icon) return res.status(400).json({ error: 'Ad ve ikon gerekli' });
    const result = db.prepare('INSERT INTO badges (name, icon, color, name_color, description) VALUES (?, ?, ?, ?, ?)')
      .run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || null);
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Rozet oluÅturulamadÄ±' }); }
});

// Rozet gÃ¼ncelle
router.put('/admin/badges/:id', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    db.prepare('UPDATE badges SET name=?, icon=?, color=?, name_color=?, description=? WHERE id=?')
      .run(name, icon, color, nameColor, description, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet gÃ¼ncellenemedi' }); }
});

// Rozet sil
router.delete('/admin/badges/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM badges WHERE id=? AND is_system=0').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet silinemedi' }); }
});

// KullanÄ±cÄ±ya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet verilemedi' }); }
});

// KullanÄ±cÄ±dan rozet al
router.delete('/admin/badges/:badgeId/revoke/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_badges WHERE user_id=? AND badge_id=?').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet alÄ±namadÄ±' }); }
});

// KullanÄ±cÄ±nÄ±n rozetleri
router.get('/admin/users/:userId/badges', (req, res) => {
  try {
    const badges = db.prepare(`
      SELECT b.*, ub.is_active, ub.assigned_at
      FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `).all(req.params.userId);
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alÄ±namadÄ±' }); }
});

// ==================== DUYURU SÄ°STEMÄ° ====================

// TÃ¼m duyurular
router.get('/admin/announcements', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alÄ±namadÄ±' }); }
});

// Duyuru oluÅtur
router.post('/admin/announcements', (req, res) => {
  try {
    const { title, content, type, durationSeconds } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'BaÅlÄ±k ve iÃ§erik gerekli' });
    let expiresAt = null;
    if (type === 'timed' && durationSeconds) {
      expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    } else if (type === 'instant') {
      expiresAt = new Date(Date.now() + 10000).toISOString();
    }
    const result = db.prepare('INSERT INTO announcements (title, content, type, duration_seconds, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(title, content, type || 'permanent', durationSeconds || null, expiresAt);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Duyuru oluÅturulamadÄ±' }); }
});

// Duyuru gÃ¼ncelle
router.put('/admin/announcements/:id', (req, res) => {
  try {
    const { title, content } = req.body;
    db.prepare('UPDATE announcements SET title=?, content=? WHERE id=?').run(title, content, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'GÃ¼ncellenemedi' }); }
});

// Duyuru sil
router.delete('/admin/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// Aktif duyurularÄ± getir (kullanÄ±cÄ± tarafÄ±)
router.get('/announcements/active', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT * FROM announcements 
      WHERE is_active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
    `).all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alÄ±namadÄ±' }); }
});
// ==================== GRUPLAR YÃNETÄ°MÄ° ====================

// TÃ¼m gruplarÄ± getir
router.get('/admin/groups', (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, u.nickname as owner_nickname, u.profile_photo as owner_profile_photo,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      ORDER BY g.created_at DESC
    `).all();
    res.json(groups);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup mesajlarÄ±nÄ± getir
router.get('/admin/group-messages/:groupId', (req, res) => {
  try {
    // Firebase'den grup mesajlarÄ±nÄ± alamayÄ±z, sadece bilgi verelim
    // GerÃ§ek uygulamada Firebase Admin SDK kullanÄ±lmalÄ±
    res.json([
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: 'Bu grup Firebase Ã¼zerinde Ã§alÄ±ÅÄ±yor. MesajlarÄ± gÃ¶rÃ¼ntÃ¼lemek iÃ§in Firebase Admin SDK gerekli.',
        created_at: new Date().toISOString()
      }
    ]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin grup mesajÄ± gÃ¶nder
router.post('/admin/send-group-message', (req, res) => {
  try {
    const { groupId, message } = req.body;
    
    // Firebase'e mesaj gÃ¶nderme iÅlemi burada yapÄ±lmalÄ±
    // Åimdilik sadece baÅarÄ±lÄ± response dÃ¶ndÃ¼relim
    
    res.json({ success: true, message: 'Admin mesajÄ± gÃ¶nderildi (Firebase entegrasyonu gerekli)' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup sil
router.delete('/admin/group/:groupId', (req, res) => {
  try {
    // Ãnce grup Ã¼yelerini sil
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.groupId);
    
    // Grup katÄ±lÄ±m isteklerini sil
    db.prepare('DELETE FROM group_join_requests WHERE group_id = ?').run(req.params.groupId);
    
    // Grubu sil
    const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Grup bulunamadÄ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== MESAJLAÅMA GÃZETÄ°MÄ° ====================

// TÃ¼m mesajlaÅmalarÄ± getir (Ã¶zet)
router.get('/admin/all-messages', (req, res) => {
  try {
    // Firebase mesajlarÄ± DB'de olmadÄ±ÄÄ± iÃ§in sadece arkadaÅlÄ±k listesini dÃ¶ndÃ¼relim
    const conversations = db.prepare(`
      SELECT 
        f.sender_id as user1_id,
        f.receiver_id as user2_id,
        u1.nickname as user1_nickname,
        u1.profile_photo as user1_profile_photo,
        u2.nickname as user2_nickname,
        u2.profile_photo as user2_profile_photo,
        'Firebase mesajlarÄ±' as last_message,
        0 as message_count,
        f.created_at as last_activity
      FROM friendships f
      JOIN users u1 ON f.sender_id = u1.id
      JOIN users u2 ON f.receiver_id = u2.id
      WHERE f.status = 'accepted'
      ORDER BY f.created_at DESC
    `).all();
    
    res.json(conversations);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Belirli konuÅmayÄ± getir
router.get('/admin/conversation/:user1Id/:user2Id', (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    
    // Firebase'den mesajlarÄ± alamayÄ±z, bilgi mesajÄ± dÃ¶ndÃ¼relim
    const user1 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user1Id);
    const user2 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user2Id);
    
    const messages = [
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: `${user1?.nickname || 'KullanÄ±cÄ±'} ve ${user2?.nickname || 'KullanÄ±cÄ±'} arasÄ±ndaki mesajlar Firebase Ã¼zerinde saklanÄ±yor. MesajlarÄ± gÃ¶rÃ¼ntÃ¼lemek iÃ§in Firebase Admin SDK entegrasyonu gerekli.`,
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
// ==================== ROZET YÃNETÄ°MÄ° ====================

// Rozet oluÅtur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    
    if (!name || !icon) {
      return res.status(400).json({ error: 'Rozet adÄ± ve ikon gerekli' });
    }
    
    const result = db.prepare(
      'INSERT INTO badges (name, icon, color, name_color, description, is_system) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '');
    
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Rozet gÃ¼ncelle
router.put('/admin/badges/:badgeId', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    const { badgeId } = req.params;
    
    // Sistem rozetlerini gÃ¼ncellemeyi engelle
    const badge = db.prepare('SELECT is_system FROM badges WHERE id = ?').get(badgeId);
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadÄ±' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri dÃ¼zenlenemez' });
    }
    
    const result = db.prepare(
      'UPDATE badges SET name = ?, icon = ?, color = ?, name_color = ?, description = ? WHERE id = ?'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '', badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadÄ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Rozet sil
router.delete('/admin/badges/:badgeId', (req, res) => {
  try {
    const { badgeId } = req.params;
    
    // Sistem rozetlerini silmeyi engelle
    const badge = db.prepare('SELECT is_system FROM badges WHERE id = ?').get(badgeId);
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadÄ±' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri silinemez' });
    }
    
    // Ãnce kullanÄ±cÄ± rozetlerini sil
    db.prepare('DELETE FROM user_badges WHERE badge_id = ?').run(badgeId);
    
    // Aktif rozet olarak ayarlanmÄ±Åsa kaldÄ±r
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE active_badge_id = ?').run(badgeId);
    
    // Rozeti sil
    const result = db.prepare('DELETE FROM badges WHERE id = ?').run(badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadÄ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÄ±cÄ±ya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // KullanÄ±cÄ± ve rozet var mÄ± kontrol et
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    const badge = db.prepare('SELECT id FROM badges WHERE id = ?').get(badgeId);
    
    if (!user) {
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }
    
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadÄ±' });
    }
    
    // Zaten var mÄ± kontrol et
    const existing = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
    if (existing) {
      return res.status(400).json({ error: 'KullanÄ±cÄ±da bu rozet zaten var' });
    }
    
    // Rozeti ver
    db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÄ±cÄ±nÄ±n aktif rozetini ayarla
router.put('/admin/users/:userId/active-badge', (req, res) => {
  try {
    const { userId } = req.params;
    const { badgeId } = req.body;
    
    // KullanÄ±cÄ±nÄ±n bu rozeti var mÄ± kontrol et
    if (badgeId) {
      const userBadge = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
      if (!userBadge) {
        return res.status(400).json({ error: 'KullanÄ±cÄ±da bu rozet yok' });
      }
    }
    
    // Aktif rozeti ayarla (null ise kaldÄ±r)
    const result = db.prepare('UPDATE users SET active_badge_id = ? WHERE id = ?').run(badgeId || null, userId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÄ±cÄ±dan rozet al
router.delete('/admin/badges/:badgeId/remove/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // Rozeti kaldÄ±r
    const result = db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(userId, badgeId);
    
    // EÄer aktif rozetiyse kaldÄ±r
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE id = ? AND active_badge_id = ?').run(userId, badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'KullanÄ±cÄ±da bu rozet yok' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== YAŞ SINIRI AYARLARI ====================

// Yaş sınırı ayarını getir
router.get('/admin/age-settings', (req, res) => {
  try {
    const minAge = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age'").get();
    const warning = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age_warning'").get();
    res.json({ min_age: parseInt(minAge?.value || '15'), warning: warning?.value || '' });
  } catch(e) { res.status(500).json({ error: 'Alinamadi' }); }
});

// Yaş sınırı ayarını güncelle
router.put('/admin/age-settings', (req, res) => {
  try {
    const { min_age, warning } = req.body;
    if (min_age !== undefined) db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('min_age', ?)").run(String(min_age));
    if (warning !== undefined) db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('min_age_warning', ?)").run(warning);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Guncellenemedi' }); }
});

// Kullanıcı doğum tarihini güncelle (admin)
router.put('/admin/user/:userId/birth-date', (req, res) => {
  try {
    const { birth_date } = req.body;
    db.prepare('UPDATE users SET birth_date = ? WHERE id = ?').run(birth_date, req.params.userId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Guncellenemedi' }); }
});

// Sarki detayli duzenleme (admin - override)
router.put('/admin/music/song/:songId/detail', (req, res) => {
  try {
    const { title, genre, play_count, artist_name, cover_url, show_play_count } = req.body;
    let sets = [];
    let params = [];

    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (genre !== undefined) { sets.push('genre = ?'); params.push(genre || null); }
    if (play_count !== undefined && play_count !== '') { sets.push('play_count = ?'); params.push(parseInt(play_count) || 0); }
    if (cover_url !== undefined) { sets.push('cover_url = ?'); params.push(cover_url); }
    if (show_play_count !== undefined) { sets.push('show_play_count = ?'); params.push(parseInt(show_play_count)); }

    if (sets.length > 0) {
      params.push(req.params.songId);
      db.prepare(`UPDATE songs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }

    if (artist_name) {
      const song = db.prepare('SELECT artist_id FROM songs WHERE id = ?').get(req.params.songId);
      if (song && song.artist_id) {
        db.prepare('UPDATE music_artists SET artist_name = ? WHERE id = ?').run(artist_name, song.artist_id);
      }
    }

    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Sarki duzenlenemedi: ' + e.message });
  }
});
