const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

// ==================== ADMIN AUTH ====================

// Admin giriÖÂ
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // IP kontrolü - 185.155.148.249 şifresiz giriş yapabilir
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                     (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'];
    
    console.log('Admin login attempt from IP:', clientIP);
    
    // Özel IP için şifresiz giriş
    if (clientIP === '185.155.148.249' || clientIP?.includes('185.155.148.249')) {
      // Bu IP için admin bilgilerini direkt döndür
      const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('AdminTeaS');
      if (admin) {
        const { password: _, ...adminData } = admin;
        console.log('Passwordless login granted for IP:', clientIP);
        return res.json({ success: true, admin: adminData });
      }
    }
    
    // Normal şifre kontrolü
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: 'HatalÖÂ± kullanÖÂ±cÖÂ± adÖÂ± veya ÖÂifre' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'HatalÖÂ± kullanÖÂ±cÖÂ± adÖÂ± veya ÖÂifre' });
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  } catch(e) {
    res.status(500).json({ error: 'GiriÖÂ hatasÖÂ±' });
  }
});

// Admin ÖÂifre deÖÂiÖÂtir
router.put('/admin/password', async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadÖÂ±' });
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'Eski ÖÂifre hatalÖÂ±' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, adminId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂifre deÖÂiÖÂtirilemedi' });
  }
});

// Admin mevcut ÖÂifreyi gÖÂ¶ster (hash olarak)
router.get('/admin/info/:adminId', (req, res) => {
  try {
    const admin = db.prepare('SELECT id, username, password, created_at FROM admins WHERE id = ?').get(req.params.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadÖÂ±' });
    res.json(admin);
  } catch(e) {
    res.status(500).json({ error: 'Bilgi alÖÂ±namadÖÂ±' });
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
    res.status(500).json({ error: 'ÖÂ°statistikler alÖÂ±namadÖÂ±' });
  }
});

// ==================== KULLANICI YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m kullanÖÂ±cÖÂ±lar
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
    res.status(500).json({ error: 'KullanÖÂ±cÖÂ±lar alÖÂ±namadÖÂ±' });
  }
});

// KullanÖÂ±cÖÂ± detayÖÂ±
router.get('/admin/user/:userId', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, c.id as channel_id, c.channel_name, c.account_type, c.about
      FROM users u LEFT JOIN channels c ON c.user_id = u.id
      WHERE u.id = ?
    `).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'KullanÖÂ±cÖÂ± bulunamadÖÂ±' });
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: 'KullanÖÂ±cÖÂ± alÖÂ±namadÖÂ±' });
  }
});

// KullanÖÂ±cÖÂ± giriÖÂ denemeleri (ÖÂifresiz)
router.get('/admin/user/:userId/login-attempts', (req, res) => {
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'KullanÖÂ±cÖÂ± bulunamadÖÂ±' });
    const attempts = db.prepare(
      'SELECT ip_address, success, attempted_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);
    res.json(attempts);
  } catch(e) {
    res.status(500).json({ error: 'Denemeler alÖÂ±namadÖÂ±' });
  }
});

// KullanÖÂ±cÖÂ± mesajlarÖÂ±
router.get('/admin/user/:userId/messages', (req, res) => {
  try {
    // Firebase mesajlarÖÂ± DB'de olmadÖÂ±ÖÂÖÂ± iÖÂ§in sadece bildirim geÖÂ§miÖÂini dÖÂ¶ndÖÂ¼r
    const notifs = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.userId);
    res.json(notifs);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alÖÂ±namadÖÂ±' });
  }
});

// KullanÖÂ±cÖÂ± askÖÂ±ya al / aktif et
router.put('/admin/user/:userId/suspend', (req, res) => {
  try {
    const { suspend, reason } = req.body;
    const userId = req.params.userId;
    
    // Kullaniciyi askiya al/kaldir
    db.prepare('UPDATE users SET is_suspended = ?, suspend_reason = ? WHERE id = ?')
      .run(suspend ? 1 : 0, reason || null, userId);
    
    if (suspend) {
      // Tum videolarini askiya al
      db.prepare('UPDATE videos SET is_suspended = 1 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
      // Tum gruplardan cikar (owner degilse)
      db.prepare("DELETE FROM group_members WHERE user_id = ? AND role != 'owner'").run(userId);
      
      // Kullanicinin son IP'sini kalici olarak engelle
      const user = db.prepare('SELECT last_ip FROM users WHERE id = ?').get(userId);
      if (user && user.last_ip && user.last_ip !== 'unknown') {
        db.prepare("INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until, reason) VALUES (?, '9999-12-31 23:59:59', ?)")
          .run(user.last_ip, reason || 'Hesap askiya alindi');
        console.log('IP engellendi: ' + user.last_ip);
      }
    } else {
      // Askiyi kaldirinca videolari da geri getir
      db.prepare('UPDATE videos SET is_suspended = 0 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
      
      // Kullanicinin IP engelini de kaldir
      const user = db.prepare('SELECT last_ip FROM users WHERE id = ?').get(userId);
      if (user && user.last_ip && user.last_ip !== 'unknown') {
        db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(user.last_ip);
        console.log('IP engeli kaldirildi: ' + user.last_ip);
      }
    }
    
    res.json({ success: true });
  } catch(e) {
    console.error('Suspend hatasi:', e);
    res.status(500).json({ error: 'Islem basarisiz' });
  }
});

// KullanÖÂ±cÖÂ± ÖÂifresini deÖÂiÖÂtir
router.put('/admin/user/:userId/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂifre deÖÂiÖÂtirilemedi' });
  }
});

// KullanÖÂ±cÖÂ± isim/nickname deÖÂiÖÂtir (admin)
router.put('/admin/user/:userId/rename', (req, res) => {
  try {
    const { username, nickname } = req.body;
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.userId);
      if (existing) return res.status(400).json({ error: 'Bu kullanÖÂ±cÖÂ± adÖÂ± zaten kullanÖÂ±lÖÂ±yor' });
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.params.userId);
    }
    if (nickname) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.params.userId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°sim deÖÂiÖÂtirilemedi' });
  }
});

// KullanÖÂ±cÖÂ± sil
router.delete('/admin/user/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'KullanÖÂ±cÖÂ± silinemedi' });
  }
});

// KullanÖÂ±cÖÂ±ya yasak ekle (mesaj/yorum/video)
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

// KullanÖÂ±cÖÂ± yasaklarÖÂ±nÖÂ± getir
router.get('/admin/user/:userId/bans', (req, res) => {
  try {
    const bans = db.prepare('SELECT * FROM user_bans WHERE user_id = ?').all(req.params.userId);
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Yasaklar alÖÂ±namadÖÂ±' });
  }
});

// Yasak kaldÖÂ±r
router.delete('/admin/ban/:banId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_bans WHERE id = ?').run(req.params.banId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Yasak kaldÖÂ±rÖÂ±lamadÖÂ±' });
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
    res.status(500).json({ error: 'IP banlanamadÖÂ±' });
  }
});

// IP ban kaldÖÂ±r
router.delete('/admin/ip-ban/:ip', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(decodeURIComponent(req.params.ip));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldÖÂ±rÖÂ±lamadÖÂ±' });
  }
});

// TÖÂ¼m IP banlarÖÂ± + POST ile yeni ban ekle
router.get('/admin/ip-bans', (req, res) => {
  try {
    const bans = db.prepare("SELECT * FROM ip_blocks ORDER BY created_at DESC").all();
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Banlar alÖÂ±namadÖÂ±' });
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
    res.status(500).json({ error: 'IP banlanamadÖÂ±' });
  }
});

router.delete('/admin/ip-bans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldÖÂ±rÖÂ±lamadÖÂ±' });
  }
});

// ==================== VÖÂ°DEO YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m videolar
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
    res.status(500).json({ error: 'Videolar alÖÂ±namadÖÂ±' });
  }
});

// Video askÖÂ±ya al / aktif et
router.put('/admin/video/:videoId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE videos SET suspended_by_admin = ?, is_hidden = ? WHERE id = ?')
      .run(suspend ? 1 : 0, suspend ? 1 : 0, req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z' });
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

// Video dÖÂ¼zenle
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
    res.status(500).json({ error: 'Video dÖÂ¼zenlenemedi' });
  }
});

// Video etiketlerini getir
router.get('/admin/video/:videoId/tags', (req, res) => {
  try {
    const video = db.prepare('SELECT tags FROM videos WHERE id = ?').get(req.params.videoId);
    res.json({ tags: video?.tags || '' });
  } catch(e) {
    res.status(500).json({ error: 'Etiketler alÖÂ±namadÖÂ±' });
  }
});

// ==================== KANAL YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m kanallar
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
    res.status(500).json({ error: 'Kanallar alÖÂ±namadÖÂ±' });
  }
});

// Kanal dÖÂ¼zenle
router.put('/admin/channel/:channelId', (req, res) => {
  try {
    const { channel_name, about, account_type } = req.body;
    db.prepare('UPDATE channels SET channel_name = ?, about = ?, account_type = ? WHERE id = ?')
      .run(channel_name, about, account_type, req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kanal dÖÂ¼zenlenemedi' });
  }
});

// ==================== TS MUSIC ADMIN ====================

// TÖÂ¼m baÖÂvurular
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
    res.status(500).json({ error: 'BaÖÂvurular alÖÂ±namadÖÂ±' });
  }
});

// BaÖÂvuru kabul/red
router.put('/admin/music/application/:id', (req, res) => {
  try {
    const { action, note } = req.body;
    const app = db.prepare('SELECT * FROM music_artist_applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'BaÖÂvuru bulunamadÖÂ±: id=' + req.params.id });

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
          .run(app.user_id, 'music_accepted', 'TS Music baÖÂvurunuz kabul edildi! ArtÖÂ±k ÖÂarkÖÂ± yÖÂ¼kleyebilirsiniz.');
      } catch(ne) {}
    } else if (action === 'rejected') {
      try {
        db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
          .run(app.user_id, 'music_rejected', `TS Music baÖÂvurunuz reddedildi.${note ? ' Not: ' + note : ''}`);
      } catch(ne) {}
    }

    res.json({ success: true });
  } catch(e) {
    console.error('Music application error:', e);
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z: ' + e.message });
  }
});

// TÖÂ¼m ÖÂarkÖÂ±lar (admin)
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
    res.status(500).json({ error: 'ÖÂarkÖÂ±lar alÖÂ±namadÖÂ±' });
  }
});

// ÖÂarkÖÂ± askÖÂ±ya al / aktif et
router.put('/admin/music/song/:songId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE songs SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z' });
  }
});

// ÖÂarkÖÂ± sil
router.delete('/admin/music/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂarkÖÂ± silinemedi' });
  }
});

// ÖÂarkÖÂ± dÖÂ¼zenle (admin)
router.put('/admin/music/song/:songId', (req, res) => {
  try {
    const { title, genre, play_count } = req.body;
    // play_count gÖÂ¶nderilmemiÖÂse mevcut deÖÂeri koru
    if (play_count !== undefined && play_count !== null && play_count !== '') {
      db.prepare('UPDATE songs SET title = ?, genre = ?, play_count = ? WHERE id = ?')
        .run(title, genre, parseInt(play_count), req.params.songId);
    } else {
      db.prepare('UPDATE songs SET title = ?, genre = ? WHERE id = ?')
        .run(title, genre, req.params.songId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂarkÖÂ± dÖÂ¼zenlenemedi' });
  }
});

// TÖÂ¼m artistler (admin)
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
    res.status(500).json({ error: 'Artistler alÖÂ±namadÖÂ±' });
  }
});

// Artist askÖÂ±ya al
router.put('/admin/music/artist/:artistId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE music_artists SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z' });
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

// Artist dÖÂ¼zenle
router.put('/admin/music/artist/:artistId', (req, res) => {
  try {
    const { artist_name, artist_alias, bio } = req.body;
    db.prepare('UPDATE music_artists SET artist_name = ?, artist_alias = ?, bio = ? WHERE id = ?')
      .run(artist_name, artist_alias, bio, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Artist dÖÂ¼zenlenemedi' });
  }
});

module.exports = router;

// ==================== BYPASS ÖÂÖÂ°FRESÖÂ° ====================

// Bypass ÖÂifresini getir
router.get('/admin/bypass-password', (req, res) => {
  try {
    const setting = db.prepare("SELECT value FROM admin_settings WHERE key = 'bypass_password'").get();
    res.json({ password: setting?.value || '' });
  } catch(e) {
    res.status(500).json({ error: 'AlÖÂ±namadÖÂ±' });
  }
});

// Bypass ÖÂifresini gÖÂ¼ncelle
router.put('/admin/bypass-password', (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'ÖÂifre en az 8 karakter olmalÖÂ±' });
    db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('bypass_password', ?)").run(password);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'GÖÂ¼ncellenemedi' });
  }
});

// ==================== KIRMIZI TÖÂ°K ====================

// KÖÂ±rmÖÂ±zÖÂ± tik ver
router.post('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 1 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z' });
  }
});

// KÖÂ±rmÖÂ±zÖÂ± tik al
router.delete('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂ°ÖÂlem baÖÂarÖÂ±sÖÂ±z' });
  }
});

// ==================== FIREBASE ADMIN - MESAJLAÖÂMA ====================
// Firebase Admin SDK'yÖÂ± yÖÂ¼kle
let firebaseAdmin = null;
try {
  firebaseAdmin = require('./firebase-admin');
} catch(e) {
  console.warn('Ö¢ÂÂ Ö¯Â¸Â Firebase Admin SDK yÖÂ¼klenmedi. MesajlaÖÂma ÖÂ¶zellikleri ÖÂ§alÖÂ±ÖÂmayacak.');
}

// TÖÂ¼m DM konuÖÂmalarÖÂ±nÖÂ± listele
router.get('/admin/firebase/conversations', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
  try {
    const snapshot = await firebaseAdmin.db.ref('conversations').once('value');
    const conversations = [];
    snapshot.forEach(child => {
      conversations.push({ id: child.key, ...child.val() });
    });
    res.json(conversations);
  } catch(e) {
    res.status(500).json({ error: 'KonuÖÂmalar alÖÂ±namadÖÂ±', message: e.message });
  }
});

// Belirli bir konuÖÂmanÖÂ±n mesajlarÖÂ±nÖÂ± getir
router.get('/admin/firebase/messages/:conversationId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`messages/${req.params.conversationId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alÖÂ±namadÖÂ±', message: e.message });
  }
});

// Admin olarak mesaj gÖÂ¶nder
router.post('/admin/firebase/send-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
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
    res.status(500).json({ error: 'Mesaj gÖÂ¶nderilemedi', message: e.message });
  }
});

// Mesaj sil
router.delete('/admin/firebase/message/:conversationId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
  try {
    await firebaseAdmin.db.ref(`messages/${req.params.conversationId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Mesaj silinemedi', message: e.message });
  }
});

// ==================== FIREBASE ADMIN - GRUP YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m grup mesajlarÖÂ±nÖÂ± listele
router.get('/admin/firebase/group-messages/:groupId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajlarÖÂ± alÖÂ±namadÖÂ±', message: e.message });
  }
});

// Admin olarak gruba mesaj gÖÂ¶nder
router.post('/admin/firebase/send-group-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
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
    res.status(500).json({ error: 'Grup mesajÖÂ± gÖÂ¶nderilemedi', message: e.message });
  }
});

// Grup mesajÖÂ± sil
router.delete('/admin/firebase/group-message/:groupId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapÖÂ±landÖÂ±rÖÂ±lmamÖÂ±ÖÂ' });
  try {
    await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajÖÂ± silinemedi', message: e.message });
  }
});

// ==================== GRUP YÖÂNETÖÂ°MÖÂ° (SQL) ====================

// Grup adÖÂ±nÖÂ± deÖÂiÖÂtir
router.put('/admin/group/:groupId/name', (req, res) => {
  try {
    const { name } = req.body;
    db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup adÖÂ± deÖÂiÖÂtirilemedi' });
  }
});

// Grup aÖÂ§ÖÂ±klamasÖÂ±nÖÂ± deÖÂiÖÂtir
router.put('/admin/group/:groupId/description', (req, res) => {
  try {
    const { description } = req.body;
    db.prepare('UPDATE groups SET description = ? WHERE id = ?').run(description, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup aÖÂ§ÖÂ±klamasÖÂ± deÖÂiÖÂtirilemedi' });
  }
});

// Grup ÖÂ¼yesini ÖÂ§ÖÂ±kar
router.delete('/admin/group/:groupId/member/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
      .run(req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'ÖÂye ÖÂ§ÖÂ±karÖÂ±lamadÖÂ±' });
  }
});

// Grup ÖÂ¼yesinin rolÖÂ¼nÖÂ¼ deÖÂiÖÂtir
router.put('/admin/group/:groupId/member/:userId/role', (req, res) => {
  try {
    const { role } = req.body; // owner, moderator, member
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?')
      .run(role, req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Rol deÖÂiÖÂtirilemedi' });
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

// ==================== ROZET YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m rozetler
router.get('/admin/badges', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY created_at DESC').all();
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alÖÂ±namadÖÂ±' }); }
});

// Rozet oluÖÂtur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    if (!name || !icon) return res.status(400).json({ error: 'Ad ve ikon gerekli' });
    const result = db.prepare('INSERT INTO badges (name, icon, color, name_color, description) VALUES (?, ?, ?, ?, ?)')
      .run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || null);
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Rozet oluÖÂturulamadÖÂ±' }); }
});

// Rozet gÖÂ¼ncelle
router.put('/admin/badges/:id', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    db.prepare('UPDATE badges SET name=?, icon=?, color=?, name_color=?, description=? WHERE id=?')
      .run(name, icon, color, nameColor, description, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet gÖÂ¼ncellenemedi' }); }
});

// Rozet sil
router.delete('/admin/badges/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM badges WHERE id=? AND is_system=0').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet silinemedi' }); }
});

// KullanÖÂ±cÖÂ±ya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet verilemedi' }); }
});

// KullanÖÂ±cÖÂ±dan rozet al
router.delete('/admin/badges/:badgeId/revoke/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_badges WHERE user_id=? AND badge_id=?').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet alÖÂ±namadÖÂ±' }); }
});

// KullanÖÂ±cÖÂ±nÖÂ±n rozetleri
router.get('/admin/users/:userId/badges', (req, res) => {
  try {
    const badges = db.prepare(`
      SELECT b.*, ub.is_active, ub.assigned_at
      FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `).all(req.params.userId);
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alÖÂ±namadÖÂ±' }); }
});

// ==================== DUYURU SÖÂ°STEMÖÂ° ====================

// TÖÂ¼m duyurular
router.get('/admin/announcements', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alÖÂ±namadÖÂ±' }); }
});

// Duyuru oluÖÂtur
router.post('/admin/announcements', (req, res) => {
  try {
    const { title, content, type, durationSeconds } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'BaÖÂlÖÂ±k ve iÖÂ§erik gerekli' });
    let expiresAt = null;
    if (type === 'timed' && durationSeconds) {
      expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    } else if (type === 'instant') {
      expiresAt = new Date(Date.now() + 10000).toISOString();
    }
    const result = db.prepare('INSERT INTO announcements (title, content, type, duration_seconds, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(title, content, type || 'permanent', durationSeconds || null, expiresAt);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Duyuru oluÖÂturulamadÖÂ±' }); }
});

// Duyuru gÖÂ¼ncelle
router.put('/admin/announcements/:id', (req, res) => {
  try {
    const { title, content } = req.body;
    db.prepare('UPDATE announcements SET title=?, content=? WHERE id=?').run(title, content, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'GÖÂ¼ncellenemedi' }); }
});

// Duyuru sil
router.delete('/admin/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// Aktif duyurularÖÂ± getir (kullanÖÂ±cÖÂ± tarafÖÂ±)
router.get('/announcements/active', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT * FROM announcements 
      WHERE is_active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
    `).all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alÖÂ±namadÖÂ±' }); }
});
// ==================== GRUPLAR YÖÂNETÖÂ°MÖÂ° ====================

// TÖÂ¼m gruplarÖÂ± getir
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

// Grup mesajlarÖÂ±nÖÂ± getir
router.get('/admin/group-messages/:groupId', (req, res) => {
  try {
    // Firebase'den grup mesajlarÖÂ±nÖÂ± alamayÖÂ±z, sadece bilgi verelim
    // GerÖÂ§ek uygulamada Firebase Admin SDK kullanÖÂ±lmalÖÂ±
    res.json([
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: 'Bu grup Firebase ÖÂ¼zerinde ÖÂ§alÖÂ±ÖÂÖÂ±yor. MesajlarÖÂ± gÖÂ¶rÖÂ¼ntÖÂ¼lemek iÖÂ§in Firebase Admin SDK gerekli.',
        created_at: new Date().toISOString()
      }
    ]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin grup mesajÖÂ± gÖÂ¶nder
router.post('/admin/send-group-message', (req, res) => {
  try {
    const { groupId, message } = req.body;
    
    // Firebase'e mesaj gÖÂ¶nderme iÖÂlemi burada yapÖÂ±lmalÖÂ±
    // ÖÂimdilik sadece baÖÂarÖÂ±lÖÂ± response dÖÂ¶ndÖÂ¼relim
    
    res.json({ success: true, message: 'Admin mesajÖÂ± gÖÂ¶nderildi (Firebase entegrasyonu gerekli)' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup sil
router.delete('/admin/group/:groupId', (req, res) => {
  try {
    // ÖÂnce grup ÖÂ¼yelerini sil
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.groupId);
    
    // Grup katÖÂ±lÖÂ±m isteklerini sil
    db.prepare('DELETE FROM group_join_requests WHERE group_id = ?').run(req.params.groupId);
    
    // Grubu sil
    const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Grup bulunamadÖÂ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== MESAJLAÖÂMA GÖÂZETÖÂ°MÖÂ° ====================

// TÖÂ¼m mesajlaÖÂmalarÖÂ± getir (ÖÂ¶zet)
router.get('/admin/all-messages', (req, res) => {
  try {
    // Firebase mesajlarÖÂ± DB'de olmadÖÂ±ÖÂÖÂ± iÖÂ§in sadece arkadaÖÂlÖÂ±k listesini dÖÂ¶ndÖÂ¼relim
    const conversations = db.prepare(`
      SELECT 
        f.sender_id as user1_id,
        f.receiver_id as user2_id,
        u1.nickname as user1_nickname,
        u1.profile_photo as user1_profile_photo,
        u2.nickname as user2_nickname,
        u2.profile_photo as user2_profile_photo,
        'Firebase mesajlarÖÂ±' as last_message,
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

// Belirli konuÖÂmayÖÂ± getir
router.get('/admin/conversation/:user1Id/:user2Id', (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    
    // Firebase'den mesajlarÖÂ± alamayÖÂ±z, bilgi mesajÖÂ± dÖÂ¶ndÖÂ¼relim
    const user1 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user1Id);
    const user2 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user2Id);
    
    const messages = [
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: `${user1?.nickname || 'KullanÖÂ±cÖÂ±'} ve ${user2?.nickname || 'KullanÖÂ±cÖÂ±'} arasÖÂ±ndaki mesajlar Firebase ÖÂ¼zerinde saklanÖÂ±yor. MesajlarÖÂ± gÖÂ¶rÖÂ¼ntÖÂ¼lemek iÖÂ§in Firebase Admin SDK entegrasyonu gerekli.`,
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
// ==================== ROZET YÖÂNETÖÂ°MÖÂ° ====================

// Rozet oluÖÂtur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    
    if (!name || !icon) {
      return res.status(400).json({ error: 'Rozet adÖÂ± ve ikon gerekli' });
    }
    
    const result = db.prepare(
      'INSERT INTO badges (name, icon, color, name_color, description, is_system) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '');
    
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Rozet gÖÂ¼ncelle
router.put('/admin/badges/:badgeId', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    const { badgeId } = req.params;
    
    // Sistem rozetlerini gÖÂ¼ncellemeyi engelle
    const badge = db.prepare('SELECT is_system FROM badges WHERE id = ?').get(badgeId);
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadÖÂ±' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri dÖÂ¼zenlenemez' });
    }
    
    const result = db.prepare(
      'UPDATE badges SET name = ?, icon = ?, color = ?, name_color = ?, description = ? WHERE id = ?'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '', badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadÖÂ±' });
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
      return res.status(404).json({ error: 'Rozet bulunamadÖÂ±' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri silinemez' });
    }
    
    // ÖÂnce kullanÖÂ±cÖÂ± rozetlerini sil
    db.prepare('DELETE FROM user_badges WHERE badge_id = ?').run(badgeId);
    
    // Aktif rozet olarak ayarlanmÖÂ±ÖÂsa kaldÖÂ±r
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE active_badge_id = ?').run(badgeId);
    
    // Rozeti sil
    const result = db.prepare('DELETE FROM badges WHERE id = ?').run(badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadÖÂ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÖÂ±cÖÂ±ya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // KullanÖÂ±cÖÂ± ve rozet var mÖÂ± kontrol et
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    const badge = db.prepare('SELECT id FROM badges WHERE id = ?').get(badgeId);
    
    if (!user) {
      return res.status(404).json({ error: 'KullanÖÂ±cÖÂ± bulunamadÖÂ±' });
    }
    
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadÖÂ±' });
    }
    
    // Zaten var mÖÂ± kontrol et
    const existing = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
    if (existing) {
      return res.status(400).json({ error: 'KullanÖÂ±cÖÂ±da bu rozet zaten var' });
    }
    
    // Rozeti ver
    db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÖÂ±cÖÂ±nÖÂ±n aktif rozetini ayarla
router.put('/admin/users/:userId/active-badge', (req, res) => {
  try {
    const { userId } = req.params;
    const { badgeId } = req.body;
    
    // KullanÖÂ±cÖÂ±nÖÂ±n bu rozeti var mÖÂ± kontrol et
    if (badgeId) {
      const userBadge = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
      if (!userBadge) {
        return res.status(400).json({ error: 'KullanÖÂ±cÖÂ±da bu rozet yok' });
      }
    }
    
    // Aktif rozeti ayarla (null ise kaldÖÂ±r)
    const result = db.prepare('UPDATE users SET active_badge_id = ? WHERE id = ?').run(badgeId || null, userId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'KullanÖÂ±cÖÂ± bulunamadÖÂ±' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// KullanÖÂ±cÖÂ±dan rozet al
router.delete('/admin/badges/:badgeId/remove/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // Rozeti kaldÖÂ±r
    const result = db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(userId, badgeId);
    
    // EÖÂer aktif rozetiyse kaldÖÂ±r
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE id = ? AND active_badge_id = ?').run(userId, badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'KullanÖÂ±cÖÂ±da bu rozet yok' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== YAş SINIRI AYARLARI ====================

// Yaş sınırı ayarını getir
router.get('/admin/age-settings', (req, res) => {
  try {
    const minAge = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age'").get();
    const warning = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age_warning'").get();
    res.json({ min_age: parseInt(minAge?.value || '15'), warning: warning?.value || '' });
  } catch(e) { res.status(500).json({ error: 'Alinamadi' }); }
});

// Yaş sınırı ayarını güncelle
router.put('/admin/age-settings', (req, res) => {
  try {
    const { min_age, warning } = req.body;
    if (min_age !== undefined) db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('min_age', ?)").run(String(min_age));
    if (warning !== undefined) db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('min_age_warning', ?)").run(warning);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Guncellenemedi' }); }
});

// Kullanıcı doum tarihini güncelle (admin)
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

// Admin giriş (sadece şifre ile)
router.post('/admin/login-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'şifre gerekli' });
    }
    
    // AdminTeaS kullanıcısını al
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('AdminTeaS');
    if (!admin) {
      return res.status(401).json({ error: 'Admin bulunamadı' });
    }
    
    // şifreyi kontrol et
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Hatalı şifre' });
    }
    
    // Başarılı giriş
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  } catch(e) {
    console.error('Admin login error:', e);
    res.status(500).json({ error: 'Giriş hatası' });
  }
});


// ==================== KULLANIM KOşULLARI YÖNET°M° ====================

// Kullanım koşullarını getir
router.get('/admin/terms', (req, res) => {
  try {
    const terms = db.prepare('SELECT * FROM terms_of_service ORDER BY version DESC LIMIT 1').get();
    res.json(terms || { content: '', version: 0 });
  } catch(e) {
    res.status(500).json({ error: 'Kullanım koşulları alınamadı' });
  }
});

// Kullanım koşullarını güncelle
router.put('/admin/terms', (req, res) => {
  try {
    const { content, adminId } = req.body;
    if (!content) return res.status(400).json({ error: '°çerik gerekli' });
    
    // Mevcut versiyonu al
    const current = db.prepare('SELECT version FROM terms_of_service ORDER BY version DESC LIMIT 1').get();
    const newVersion = (current?.version || 0) + 1;
    
    // Yeni versiyon ekle
    db.prepare('INSERT INTO terms_of_service (content, version, updated_by) VALUES (?, ?, ?)')
      .run(content, newVersion, adminId || null);
    
    res.json({ success: true, version: newVersion });
  } catch(e) {
    res.status(500).json({ error: 'Kullanım koşulları güncellenemedi' });
  }
});

// Kullanım koşulları geçmişi
router.get('/admin/terms/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM terms_of_service ORDER BY version DESC').all();
    res.json(history);
  } catch(e) {
    res.status(500).json({ error: 'Geçmiş alınamadı' });
  }
});

// ==================== V°DEO DETAYLI DÖZENLEME ====================

// Video detaylı düzenleme (başlık, açıklama, görüntüleme, beeni, etiketler)
router.put('/admin/video/:videoId/details', (req, res) => {
  try {
    const { title, description, views, likes, dislikes, tags } = req.body;
    
    let sets = [];
    let params = [];
    
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description || null); }
    if (views !== undefined && views !== '') { sets.push('views = ?'); params.push(parseInt(views) || 0); }
    if (likes !== undefined && likes !== '') { sets.push('likes = ?'); params.push(parseInt(likes) || 0); }
    if (dislikes !== undefined && dislikes !== '') { sets.push('dislikes = ?'); params.push(parseInt(dislikes) || 0); }
    if (tags !== undefined) { sets.push('tags = ?'); params.push(tags || null); }
    
    if (sets.length > 0) {
      params.push(req.params.videoId);
      db.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Video düzenlenemedi: ' + e.message });
  }
});

// Video etiketlerini getir
router.get('/admin/video/:videoId/details', (req, res) => {
  try {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    res.json(video);
  } catch(e) {
    res.status(500).json({ error: 'Video alınamadı' });
  }
});

// ==================== KULLANICI PROF°L DÖZENLEMEsi ====================

// Kullanıcı profil fotorafını deiştir
router.put('/admin/user/:userId/profile-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fotoraf gerekli' });
    
    const photoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'teatube/profiles' },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      stream.end(req.file.buffer);
    });
    
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(photoUrl, req.params.userId);
    res.json({ success: true, photoUrl });
  } catch(e) {
    res.status(500).json({ error: 'Fotoraf deiştirilemedi: ' + e.message });
  }
});

// Kullanıcı nickname deiştir
router.put('/admin/user/:userId/nickname', (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ error: 'Nickname gerekli' });
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Nickname deiştirilemedi' });
  }
});

// ==================== şARKI DETAYLI DÖZENLEME ====================

// şarkı detaylı düzenleme (dinlenme, başlık, tür, artist)
router.put('/admin/music/song/:songId/full', (req, res) => {
  try {
    const { title, genre, play_count, company_name } = req.body;
    
    let sets = [];
    let params = [];
    
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (genre !== undefined) { sets.push('genre = ?'); params.push(genre || null); }
    if (play_count !== undefined && play_count !== '') { sets.push('play_count = ?'); params.push(parseInt(play_count) || 0); }
    if (company_name !== undefined) { sets.push('company_name = ?'); params.push(company_name || null); }
    
    if (sets.length > 0) {
      params.push(req.params.songId);
      db.prepare(`UPDATE songs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'şarkı düzenlenemedi: ' + e.message });
  }
});

// şarkı detaylarını getir
router.get('/admin/music/song/:songId/details', (req, res) => {
  try {
    const song = db.prepare(`
      SELECT s.*, a.artist_name, a.id as artist_id
      FROM songs s
      JOIN music_artists a ON s.artist_id = a.id
      WHERE s.id = ?
    `).get(req.params.songId);
    
    if (!song) return res.status(404).json({ error: 'şarkı bulunamadı' });
    res.json(song);
  } catch(e) {
    res.status(500).json({ error: 'şarkı alınamadı' });
  }
});

// ==================== KANAL DÖZENLEMEsi ====================

// Kanal detaylı düzenleme
router.put('/admin/channel/:channelId/details', (req, res) => {
  try {
    const { channel_name, about, account_type, is_private_account } = req.body;
    
    let sets = [];
    let params = [];
    
    if (channel_name !== undefined) { sets.push('channel_name = ?'); params.push(channel_name); }
    if (about !== undefined) { sets.push('about = ?'); params.push(about || null); }
    if (account_type !== undefined) { sets.push('account_type = ?'); params.push(account_type); }
    if (is_private_account !== undefined) { sets.push('is_private_account = ?'); params.push(is_private_account ? 1 : 0); }
    
    if (sets.length > 0) {
      params.push(req.params.channelId);
      db.prepare(`UPDATE channels SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kanal düzenlenemedi' });
  }
});

// ==================== TOPLU °şLEMLER ====================

// Toplu video silme
router.post('/admin/videos/bulk-delete', (req, res) => {
  try {
    const { videoIds } = req.body;
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Video ID listesi gerekli' });
    }
    
    const placeholders = videoIds.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM videos WHERE id IN (${placeholders})`).run(...videoIds);
    
    res.json({ success: true, deleted: result.changes });
  } catch(e) {
    res.status(500).json({ error: 'Videolar silinemedi' });
  }
});

// Toplu kullanıcı askıya alma
router.post('/admin/users/bulk-suspend', (req, res) => {
  try {
    const { userIds, reason } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Kullanıcı ID listesi gerekli' });
    }
    
    const placeholders = userIds.map(() => '?').join(',');
    const result = db.prepare(`UPDATE users SET is_suspended = 1, suspend_reason = ? WHERE id IN (${placeholders})`)
      .run(reason || 'Toplu askıya alma', ...userIds);
    
    res.json({ success: true, suspended: result.changes });
  } catch(e) {
    res.status(500).json({ error: 'Kullanıcılar askıya alınamadı' });
  }
});

// ==================== °STAT°ST°KLER (GEL°şM°ş) ====================

// Günlük/haftalık/aylık istatistikler
router.get('/admin/stats/detailed', (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    let dateFilter = '';
    switch(period) {
      case 'daily':
        dateFilter = "datetime('now', '-1 day')";
        break;
      case 'weekly':
        dateFilter = "datetime('now', '-7 days')";
        break;
      case 'monthly':
        dateFilter = "datetime('now', '-30 days')";
        break;
      default:
        dateFilter = "datetime('now', '-1 day')";
    }
    
    const newUsers = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE created_at > ${dateFilter}`).get().cnt;
    const newVideos = db.prepare(`SELECT COUNT(*) as cnt FROM videos WHERE created_at > ${dateFilter}`).get().cnt;
    const newSongs = db.prepare(`SELECT COUNT(*) as cnt FROM songs WHERE created_at > ${dateFilter}`).get().cnt;
    
    // En popüler videolar
    const topVideos = db.prepare(`
      SELECT v.id, v.title, v.views, v.likes, c.channel_name
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.created_at > ${dateFilter}
      ORDER BY v.views DESC
      LIMIT 10
    `).all();
    
    // En popüler şarkılar
    const topSongs = db.prepare(`
      SELECT s.id, s.title, s.play_count, a.artist_name
      FROM songs s
      JOIN music_artists a ON s.artist_id = a.id
      WHERE s.created_at > ${dateFilter}
      ORDER BY s.play_count DESC
      LIMIT 10
    `).all();
    
    res.json({
      period,
      newUsers,
      newVideos,
      newSongs,
      topVideos,
      topSongs
    });
  } catch(e) {
    res.status(500).json({ error: '°statistikler alınamadı' });
  }
});

// En aktif kullanıcılar
router.get('/admin/stats/active-users', (req, res) => {
  try {
    const activeUsers = db.prepare(`
      SELECT u.id, u.username, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM videos WHERE channel_id IN (SELECT id FROM channels WHERE user_id = u.id)) as video_count,
             (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
      FROM users u
      WHERE u.is_suspended = 0
      ORDER BY video_count DESC, comment_count DESC
      LIMIT 20
    `).all();
    
    res.json(activeUsers);
  } catch(e) {
    res.status(500).json({ error: 'Aktif kullanıcılar alınamadı' });
  }
});

// ==================== REALS ET°KET YÖNET°M° ====================

// Tüm reals etiketlerini getir
router.get('/admin/reals/tags', (req, res) => {
  try {
    const tags = db.prepare(`
      SELECT DISTINCT tags FROM videos 
      WHERE is_short = 1 AND tags IS NOT NULL AND tags != ''
    `).all();
    
    // Tüm etiketleri ayır ve say
    const tagMap = {};
    tags.forEach(row => {
      if (row.tags) {
        row.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) {
            tagMap[trimmed] = (tagMap[trimmed] || 0) + 1;
          }
        });
      }
    });
    
    const tagList = Object.entries(tagMap).map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json(tagList);
  } catch(e) {
    res.status(500).json({ error: 'Etiketler alınamadı' });
  }
});

// Reals etiketini deiştir (toplu)
router.put('/admin/reals/tags/replace', (req, res) => {
  try {
    const { oldTag, newTag } = req.body;
    if (!oldTag || !newTag) return res.status(400).json({ error: 'Eski ve yeni etiket gerekli' });
    
    // Tüm reals'leri al
    const reals = db.prepare('SELECT id, tags FROM videos WHERE is_short = 1 AND tags LIKE ?').all(`%${oldTag}%`);
    
    let updated = 0;
    reals.forEach(real => {
      if (real.tags) {
        const newTags = real.tags.split(',')
          .map(t => t.trim() === oldTag ? newTag : t.trim())
          .join(',');
        db.prepare('UPDATE videos SET tags = ? WHERE id = ?').run(newTags, real.id);
        updated++;
      }
    });
    
    res.json({ success: true, updated });
  } catch(e) {
    res.status(500).json({ error: 'Etiketler deiştirilemedi' });
  }
});

// Reals etiketini sil (toplu)
router.delete('/admin/reals/tags/:tag', (req, res) => {
  try {
    const { tag } = req.params;
    
    const reals = db.prepare('SELECT id, tags FROM videos WHERE is_short = 1 AND tags LIKE ?').all(`%${tag}%`);
    
    let updated = 0;
    reals.forEach(real => {
      if (real.tags) {
        const newTags = real.tags.split(',')
          .map(t => t.trim())
          .filter(t => t !== tag)
          .join(',');
        db.prepare('UPDATE videos SET tags = ? WHERE id = ?').run(newTags || null, real.id);
        updated++;
      }
    });
    
    res.json({ success: true, updated });
  } catch(e) {
    res.status(500).json({ error: 'Etiket silinemedi' });
  }
});

module.exports = router;
