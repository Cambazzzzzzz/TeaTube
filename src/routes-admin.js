const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

// ==================== ADMIN AUTH ====================

// Admin giriş
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  } catch(e) {
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

// Admin şifre değiştir
router.put('/admin/password', async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadı' });
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'Eski şifre hatalı' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, adminId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

// Admin mevcut şifreyi göster (hash olarak)
router.get('/admin/info/:adminId', (req, res) => {
  try {
    const admin = db.prepare('SELECT id, username, password, created_at FROM admins WHERE id = ?').get(req.params.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadı' });
    res.json(admin);
  } catch(e) {
    res.status(500).json({ error: 'Bilgi alınamadı' });
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
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ==================== KULLANICI YÖNETİMİ ====================

// Tüm kullanıcılar
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
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

// Kullanıcı detayı
router.get('/admin/user/:userId', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, c.id as channel_id, c.channel_name, c.account_type, c.about
      FROM users u LEFT JOIN channels c ON c.user_id = u.id
      WHERE u.id = ?
    `).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: 'Kullanıcı alınamadı' });
  }
});

// Kullanıcı giriş denemeleri (şifresiz)
router.get('/admin/user/:userId/login-attempts', (req, res) => {
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const attempts = db.prepare(
      'SELECT ip_address, success, attempted_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);
    res.json(attempts);
  } catch(e) {
    res.status(500).json({ error: 'Denemeler alınamadı' });
  }
});

// Kullanıcı mesajları
router.get('/admin/user/:userId/messages', (req, res) => {
  try {
    // Firebase mesajları DB'de olmadığı için sadece bildirim geçmişini döndür
    const notifs = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.userId);
    res.json(notifs);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

// Kullanıcı askıya al / aktif et
router.put('/admin/user/:userId/suspend', (req, res) => {
  try {
    const { suspend, reason } = req.body;
    const userId = req.params.userId;
    
    // Kullanıcıyı askıya al/kaldır
    db.prepare('UPDATE users SET is_suspended = ?, suspend_reason = ? WHERE id = ?')
      .run(suspend ? 1 : 0, reason || null, userId);
    
    if (suspend) {
      // Tüm videolarını askıya al
      db.prepare('UPDATE videos SET is_suspended = 1 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
      // Tüm gruplardan çıkar (owner değilse)
      db.prepare('DELETE FROM group_members WHERE user_id = ? AND role != "owner"').run(userId);
    } else {
      // Askıyı kaldırınca videoları da geri getir
      db.prepare('UPDATE videos SET is_suspended = 0 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Kullanıcı şifresini değiştir
router.put('/admin/user/:userId/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

// Kullanıcı isim/nickname değiştir (admin)
router.put('/admin/user/:userId/rename', (req, res) => {
  try {
    const { username, nickname } = req.body;
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.userId);
      if (existing) return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.params.userId);
    }
    if (nickname) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.params.userId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İsim değiştirilemedi' });
  }
});

// Kullanıcı sil
router.delete('/admin/user/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Kullanıcıya yasak ekle (mesaj/yorum/video)
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

// Kullanıcı yasaklarını getir
router.get('/admin/user/:userId/bans', (req, res) => {
  try {
    const bans = db.prepare('SELECT * FROM user_bans WHERE user_id = ?').all(req.params.userId);
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Yasaklar alınamadı' });
  }
});

// Yasak kaldır
router.delete('/admin/ban/:banId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_bans WHERE id = ?').run(req.params.banId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Yasak kaldırılamadı' });
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
    res.status(500).json({ error: 'IP banlanamadı' });
  }
});

// IP ban kaldır
router.delete('/admin/ip-ban/:ip', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(decodeURIComponent(req.params.ip));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldırılamadı' });
  }
});

// Tüm IP banları + POST ile yeni ban ekle
router.get('/admin/ip-bans', (req, res) => {
  try {
    const bans = db.prepare("SELECT * FROM ip_blocks ORDER BY created_at DESC").all();
    res.json(bans);
  } catch(e) {
    res.status(500).json({ error: 'Banlar alınamadı' });
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
    res.status(500).json({ error: 'IP banlanamadı' });
  }
});

router.delete('/admin/ip-bans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ban kaldırılamadı' });
  }
});

// ==================== VİDEO YÖNETİMİ ====================

// Tüm videolar
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
    res.status(500).json({ error: 'Videolar alınamadı' });
  }
});

// Video askıya al / aktif et
router.put('/admin/video/:videoId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE videos SET suspended_by_admin = ?, is_hidden = ? WHERE id = ?')
      .run(suspend ? 1 : 0, suspend ? 1 : 0, req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
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

// Video düzenle
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
    res.status(500).json({ error: 'Video düzenlenemedi' });
  }
});

// Video etiketlerini getir
router.get('/admin/video/:videoId/tags', (req, res) => {
  try {
    const video = db.prepare('SELECT tags FROM videos WHERE id = ?').get(req.params.videoId);
    res.json({ tags: video?.tags || '' });
  } catch(e) {
    res.status(500).json({ error: 'Etiketler alınamadı' });
  }
});

// ==================== KANAL YÖNETİMİ ====================

// Tüm kanallar
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
    res.status(500).json({ error: 'Kanallar alınamadı' });
  }
});

// Kanal düzenle
router.put('/admin/channel/:channelId', (req, res) => {
  try {
    const { channel_name, about, account_type } = req.body;
    db.prepare('UPDATE channels SET channel_name = ?, about = ?, account_type = ? WHERE id = ?')
      .run(channel_name, about, account_type, req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kanal düzenlenemedi' });
  }
});

// ==================== TS MUSIC ADMIN ====================

// Tüm başvurular
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
    res.status(500).json({ error: 'Başvurular alınamadı' });
  }
});

// Başvuru kabul/red
router.put('/admin/music/application/:id', (req, res) => {
  try {
    const { action, note } = req.body;
    const app = db.prepare('SELECT * FROM music_artist_applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Başvuru bulunamadı: id=' + req.params.id });

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
          .run(app.user_id, 'music_accepted', 'TS Music başvurunuz kabul edildi! Artık şarkı yükleyebilirsiniz.');
      } catch(ne) {}
    } else if (action === 'rejected') {
      try {
        db.prepare('INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)')
          .run(app.user_id, 'music_rejected', `TS Music başvurunuz reddedildi.${note ? ' Not: ' + note : ''}`);
      } catch(ne) {}
    }

    res.json({ success: true });
  } catch(e) {
    console.error('Music application error:', e);
    res.status(500).json({ error: 'İşlem başarısız: ' + e.message });
  }
});

// Tüm şarkılar (admin)
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
    res.status(500).json({ error: 'Şarkılar alınamadı' });
  }
});

// Şarkı askıya al / aktif et
router.put('/admin/music/song/:songId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE songs SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Şarkı sil
router.delete('/admin/music/song/:songId', (req, res) => {
  try {
    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.songId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şarkı silinemedi' });
  }
});

// Şarkı düzenle (admin)
router.put('/admin/music/song/:songId', (req, res) => {
  try {
    const { title, genre, play_count } = req.body;
    // play_count gönderilmemişse mevcut değeri koru
    if (play_count !== undefined && play_count !== null && play_count !== '') {
      db.prepare('UPDATE songs SET title = ?, genre = ?, play_count = ? WHERE id = ?')
        .run(title, genre, parseInt(play_count), req.params.songId);
    } else {
      db.prepare('UPDATE songs SET title = ?, genre = ? WHERE id = ?')
        .run(title, genre, req.params.songId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Şarkı düzenlenemedi' });
  }
});

// Tüm artistler (admin)
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
    res.status(500).json({ error: 'Artistler alınamadı' });
  }
});

// Artist askıya al
router.put('/admin/music/artist/:artistId/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE music_artists SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
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

// Artist düzenle
router.put('/admin/music/artist/:artistId', (req, res) => {
  try {
    const { artist_name, artist_alias, bio } = req.body;
    db.prepare('UPDATE music_artists SET artist_name = ?, artist_alias = ?, bio = ? WHERE id = ?')
      .run(artist_name, artist_alias, bio, req.params.artistId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Artist düzenlenemedi' });
  }
});

module.exports = router;

// ==================== BYPASS ŞİFRESİ ====================

// Bypass şifresini getir
router.get('/admin/bypass-password', (req, res) => {
  try {
    const setting = db.prepare("SELECT value FROM admin_settings WHERE key = 'bypass_password'").get();
    res.json({ password: setting?.value || '' });
  } catch(e) {
    res.status(500).json({ error: 'Alınamadı' });
  }
});

// Bypass şifresini güncelle
router.put('/admin/bypass-password', (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' });
    db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('bypass_password', ?)").run(password);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

// ==================== KIRMIZI TİK ====================

// Kırmızı tik ver
router.post('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 1 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Kırmızı tik al
router.delete('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// ==================== FIREBASE ADMIN - MESAJLAŞMA ====================
// Firebase Admin SDK'yı yükle
let firebaseAdmin = null;
try {
  firebaseAdmin = require('./firebase-admin');
} catch(e) {
  console.warn('⚠️ Firebase Admin SDK yüklenmedi. Mesajlaşma özellikleri çalışmayacak.');
}

// Tüm DM konuşmalarını listele
router.get('/admin/firebase/conversations', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
  try {
    const snapshot = await firebaseAdmin.db.ref('conversations').once('value');
    const conversations = [];
    snapshot.forEach(child => {
      conversations.push({ id: child.key, ...child.val() });
    });
    res.json(conversations);
  } catch(e) {
    res.status(500).json({ error: 'Konuşmalar alınamadı', message: e.message });
  }
});

// Belirli bir konuşmanın mesajlarını getir
router.get('/admin/firebase/messages/:conversationId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`messages/${req.params.conversationId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Mesajlar alınamadı', message: e.message });
  }
});

// Admin olarak mesaj gönder
router.post('/admin/firebase/send-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
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
    res.status(500).json({ error: 'Mesaj gönderilemedi', message: e.message });
  }
});

// Mesaj sil
router.delete('/admin/firebase/message/:conversationId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
  try {
    await firebaseAdmin.db.ref(`messages/${req.params.conversationId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Mesaj silinemedi', message: e.message });
  }
});

// ==================== FIREBASE ADMIN - GRUP YÖNETİMİ ====================

// Tüm grup mesajlarını listele
router.get('/admin/firebase/group-messages/:groupId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
  try {
    const snapshot = await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}`).once('value');
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajları alınamadı', message: e.message });
  }
});

// Admin olarak gruba mesaj gönder
router.post('/admin/firebase/send-group-message', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
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
    res.status(500).json({ error: 'Grup mesajı gönderilemedi', message: e.message });
  }
});

// Grup mesajı sil
router.delete('/admin/firebase/group-message/:groupId/:messageId', async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ error: 'Firebase Admin SDK yapılandırılmamış' });
  try {
    await firebaseAdmin.db.ref(`groupMessages/${req.params.groupId}/${req.params.messageId}`).remove();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup mesajı silinemedi', message: e.message });
  }
});

// ==================== GRUP YÖNETİMİ (SQL) ====================

// Grup adını değiştir
router.put('/admin/group/:groupId/name', (req, res) => {
  try {
    const { name } = req.body;
    db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup adı değiştirilemedi' });
  }
});

// Grup açıklamasını değiştir
router.put('/admin/group/:groupId/description', (req, res) => {
  try {
    const { description } = req.body;
    db.prepare('UPDATE groups SET description = ? WHERE id = ?').run(description, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup açıklaması değiştirilemedi' });
  }
});

// Grup üyesini çıkar
router.delete('/admin/group/:groupId/member/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
      .run(req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Üye çıkarılamadı' });
  }
});

// Grup üyesinin rolünü değiştir
router.put('/admin/group/:groupId/member/:userId/role', (req, res) => {
  try {
    const { role } = req.body; // owner, moderator, member
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?')
      .run(role, req.params.groupId, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Rol değiştirilemedi' });
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

// ==================== ROZET YÖNETİMİ ====================

// Tüm rozetler
router.get('/admin/badges', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY created_at DESC').all();
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alınamadı' }); }
});

// Rozet oluştur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    if (!name || !icon) return res.status(400).json({ error: 'Ad ve ikon gerekli' });
    const result = db.prepare('INSERT INTO badges (name, icon, color, name_color, description) VALUES (?, ?, ?, ?, ?)')
      .run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || null);
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Rozet oluşturulamadı' }); }
});

// Rozet güncelle
router.put('/admin/badges/:id', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    db.prepare('UPDATE badges SET name=?, icon=?, color=?, name_color=?, description=? WHERE id=?')
      .run(name, icon, color, nameColor, description, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet güncellenemedi' }); }
});

// Rozet sil
router.delete('/admin/badges/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM badges WHERE id=? AND is_system=0').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet silinemedi' }); }
});

// Kullanıcıya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet verilemedi' }); }
});

// Kullanıcıdan rozet al
router.delete('/admin/badges/:badgeId/revoke/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_badges WHERE user_id=? AND badge_id=?').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet alınamadı' }); }
});

// Kullanıcının rozetleri
router.get('/admin/users/:userId/badges', (req, res) => {
  try {
    const badges = db.prepare(`
      SELECT b.*, ub.is_active, ub.assigned_at
      FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `).all(req.params.userId);
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alınamadı' }); }
});

// ==================== DUYURU SİSTEMİ ====================

// Tüm duyurular
router.get('/admin/announcements', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alınamadı' }); }
});

// Duyuru oluştur
router.post('/admin/announcements', (req, res) => {
  try {
    const { title, content, type, durationSeconds } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Başlık ve içerik gerekli' });
    let expiresAt = null;
    if (type === 'timed' && durationSeconds) {
      expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    } else if (type === 'instant') {
      expiresAt = new Date(Date.now() + 10000).toISOString();
    }
    const result = db.prepare('INSERT INTO announcements (title, content, type, duration_seconds, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(title, content, type || 'permanent', durationSeconds || null, expiresAt);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: 'Duyuru oluşturulamadı' }); }
});

// Duyuru güncelle
router.put('/admin/announcements/:id', (req, res) => {
  try {
    const { title, content } = req.body;
    db.prepare('UPDATE announcements SET title=?, content=? WHERE id=?').run(title, content, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Güncellenemedi' }); }
});

// Duyuru sil
router.delete('/admin/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// Aktif duyuruları getir (kullanıcı tarafı)
router.get('/announcements/active', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT * FROM announcements 
      WHERE is_active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
    `).all();
    res.json(list);
  } catch(e) { res.status(500).json({ error: 'Duyurular alınamadı' }); }
});
// ==================== GRUPLAR YÖNETİMİ ====================

// Tüm grupları getir
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

// Grup mesajlarını getir
router.get('/admin/group-messages/:groupId', (req, res) => {
  try {
    // Firebase'den grup mesajlarını alamayız, sadece bilgi verelim
    // Gerçek uygulamada Firebase Admin SDK kullanılmalı
    res.json([
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: 'Bu grup Firebase üzerinde çalışıyor. Mesajları görüntülemek için Firebase Admin SDK gerekli.',
        created_at: new Date().toISOString()
      }
    ]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin grup mesajı gönder
router.post('/admin/send-group-message', (req, res) => {
  try {
    const { groupId, message } = req.body;
    
    // Firebase'e mesaj gönderme işlemi burada yapılmalı
    // Şimdilik sadece başarılı response döndürelim
    
    res.json({ success: true, message: 'Admin mesajı gönderildi (Firebase entegrasyonu gerekli)' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup sil
router.delete('/admin/group/:groupId', (req, res) => {
  try {
    // Önce grup üyelerini sil
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.groupId);
    
    // Grup katılım isteklerini sil
    db.prepare('DELETE FROM group_join_requests WHERE group_id = ?').run(req.params.groupId);
    
    // Grubu sil
    const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Grup bulunamadı' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== MESAJLAŞMA GÖZETİMİ ====================

// Tüm mesajlaşmaları getir (özet)
router.get('/admin/all-messages', (req, res) => {
  try {
    // Firebase mesajları DB'de olmadığı için sadece arkadaşlık listesini döndürelim
    const conversations = db.prepare(`
      SELECT 
        f.sender_id as user1_id,
        f.receiver_id as user2_id,
        u1.nickname as user1_nickname,
        u1.profile_photo as user1_profile_photo,
        u2.nickname as user2_nickname,
        u2.profile_photo as user2_profile_photo,
        'Firebase mesajları' as last_message,
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

// Belirli konuşmayı getir
router.get('/admin/conversation/:user1Id/:user2Id', (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    
    // Firebase'den mesajları alamayız, bilgi mesajı döndürelim
    const user1 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user1Id);
    const user2 = db.prepare('SELECT nickname, profile_photo FROM users WHERE id = ?').get(user2Id);
    
    const messages = [
      {
        id: 1,
        nickname: 'Sistem',
        profile_photo: 'logoteatube.png',
        message: `${user1?.nickname || 'Kullanıcı'} ve ${user2?.nickname || 'Kullanıcı'} arasındaki mesajlar Firebase üzerinde saklanıyor. Mesajları görüntülemek için Firebase Admin SDK entegrasyonu gerekli.`,
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
// ==================== ROZET YÖNETİMİ ====================

// Rozet oluştur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    
    if (!name || !icon) {
      return res.status(400).json({ error: 'Rozet adı ve ikon gerekli' });
    }
    
    const result = db.prepare(
      'INSERT INTO badges (name, icon, color, name_color, description, is_system) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '');
    
    res.json({ success: true, badgeId: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Rozet güncelle
router.put('/admin/badges/:badgeId', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    const { badgeId } = req.params;
    
    // Sistem rozetlerini güncellemeyi engelle
    const badge = db.prepare('SELECT is_system FROM badges WHERE id = ?').get(badgeId);
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadı' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri düzenlenemez' });
    }
    
    const result = db.prepare(
      'UPDATE badges SET name = ?, icon = ?, color = ?, name_color = ?, description = ? WHERE id = ?'
    ).run(name, icon, color || '#ffffff', nameColor || '#ffffff', description || '', badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadı' });
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
      return res.status(404).json({ error: 'Rozet bulunamadı' });
    }
    
    if (badge.is_system) {
      return res.status(400).json({ error: 'Sistem rozetleri silinemez' });
    }
    
    // Önce kullanıcı rozetlerini sil
    db.prepare('DELETE FROM user_badges WHERE badge_id = ?').run(badgeId);
    
    // Aktif rozet olarak ayarlanmışsa kaldır
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE active_badge_id = ?').run(badgeId);
    
    // Rozeti sil
    const result = db.prepare('DELETE FROM badges WHERE id = ?').run(badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rozet bulunamadı' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcıya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // Kullanıcı ve rozet var mı kontrol et
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    const badge = db.prepare('SELECT id FROM badges WHERE id = ?').get(badgeId);
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    if (!badge) {
      return res.status(404).json({ error: 'Rozet bulunamadı' });
    }
    
    // Zaten var mı kontrol et
    const existing = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
    if (existing) {
      return res.status(400).json({ error: 'Kullanıcıda bu rozet zaten var' });
    }
    
    // Rozeti ver
    db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcının aktif rozetini ayarla
router.put('/admin/users/:userId/active-badge', (req, res) => {
  try {
    const { userId } = req.params;
    const { badgeId } = req.body;
    
    // Kullanıcının bu rozeti var mı kontrol et
    if (badgeId) {
      const userBadge = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badgeId);
      if (!userBadge) {
        return res.status(400).json({ error: 'Kullanıcıda bu rozet yok' });
      }
    }
    
    // Aktif rozeti ayarla (null ise kaldır)
    const result = db.prepare('UPDATE users SET active_badge_id = ? WHERE id = ?').run(badgeId || null, userId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcıdan rozet al
router.delete('/admin/badges/:badgeId/remove/:userId', (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    
    // Rozeti kaldır
    const result = db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(userId, badgeId);
    
    // Eğer aktif rozetiyse kaldır
    db.prepare('UPDATE users SET active_badge_id = NULL WHERE id = ? AND active_badge_id = ?').run(userId, badgeId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Kullanıcıda bu rozet yok' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});