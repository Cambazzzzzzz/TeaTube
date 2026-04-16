const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');

// ==================== ADMIN AUTH ====================

// Admin şifre ile giriş
router.post('/admin/login-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Şifre gerekli' });
    }
    
    // AdminTeaS kullanıcısını al
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('AdminTeaS');
    if (!admin) {
      return res.status(401).json({ error: 'Admin bulunamadı' });
    }
    
    // Şifreyi kontrol et
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Hatalı şifre' });
    }
    
    // Başarılı giriş
    const { password: _, ...adminData } = admin;
    res.json({ success: true, admin: adminData });
  } catch(e) {
    console.error('Admin login error:', e);
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

// ==================== ADMIN DASHBOARD ====================

// Genel istatistikler
router.get('/admin/stats', (req, res) => {
  try {
    console.log('Admin stats endpoint çağrıldı');
    
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const suspendedUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 1').get().cnt;
    const totalVideos = db.prepare('SELECT COUNT(*) as cnt FROM videos').get().cnt;
    const totalChannels = db.prepare("SELECT COUNT(*) as cnt FROM channels WHERE account_type = 'channel'").get().cnt;
    const totalPersonal = db.prepare("SELECT COUNT(*) as cnt FROM channels WHERE account_type = 'personal'").get().cnt;
    
    // Güvenli şekilde diğer tabloları kontrol et
    let totalSongs = 0;
    let totalArtists = 0;
    let pendingApplications = 0;
    let bannedIPs = 0;
    
    try {
      totalSongs = db.prepare('SELECT COUNT(*) as cnt FROM songs').get().cnt;
    } catch(e) { console.log('Songs tablosu bulunamadı'); }
    
    try {
      totalArtists = db.prepare('SELECT COUNT(*) as cnt FROM music_artists').get().cnt;
    } catch(e) { console.log('Music artists tablosu bulunamadı'); }
    
    try {
      pendingApplications = db.prepare("SELECT COUNT(*) as cnt FROM music_artist_applications WHERE status = 'pending'").get().cnt;
    } catch(e) { console.log('Music applications tablosu bulunamadı'); }
    
    try {
      bannedIPs = db.prepare("SELECT COUNT(*) as cnt FROM ip_blocks WHERE blocked_until > datetime('now')").get().cnt;
    } catch(e) { console.log('IP blocks tablosu bulunamadı'); }

    const stats = {
      totalUsers, suspendedUsers, totalVideos, totalChannels,
      totalPersonal, totalSongs, totalArtists, pendingApplications, bannedIPs
    };
    
    console.log('Admin stats başarılı:', stats);
    res.json(stats);
  } catch(e) {
    console.error('Admin stats hatası:', e);
    res.status(500).json({ error: 'İstatistikler alınamadı: ' + e.message });
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
    console.error('Users error:', e);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
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
    } else {
      // Askıyı kaldırınca videoları da geri getir
      db.prepare('UPDATE videos SET is_suspended = 0 WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?)').run(userId);
    }
    
    res.json({ success: true });
  } catch(e) {
    console.error('Suspend error:', e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Kullanıcı sil
router.delete('/admin/user/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Kırmızı tik ver
router.post('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 1 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    console.error('Red verify error:', e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Kırmızı tik al
router.delete('/admin/user/:userId/red-verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_red_verified = 0 WHERE id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch(e) {
    console.error('Remove red verify error:', e);
    res.status(500).json({ error: 'İşlem başarısız' });
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
    console.error('Videos error:', e);
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
    console.error('Video suspend error:', e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Video sil
router.delete('/admin/video/:videoId', (req, res) => {
  try {
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete video error:', e);
    res.status(500).json({ error: 'Video silinemedi' });
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
    console.error('Channels error:', e);
    res.status(500).json({ error: 'Kanallar alınamadı' });
  }
});

// ==================== IP BAN YÖNETİMİ ====================

// Tüm IP banları
router.get('/admin/ip-bans', (req, res) => {
  try {
    const bans = db.prepare("SELECT * FROM ip_blocks ORDER BY created_at DESC").all();
    res.json(bans);
  } catch(e) {
    console.error('IP bans error:', e);
    res.status(500).json({ error: 'Banlar alınamadı' });
  }
});

// IP ban ekle
router.post('/admin/ip-bans', (req, res) => {
  try {
    const { ip, reason, hours } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP gerekli' });
    const until = new Date(Date.now() + (hours || 24 * 365) * 3600000).toISOString();
    db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until) VALUES (?, ?)').run(ip, until);
    res.json({ success: true });
  } catch(e) {
    console.error('IP ban error:', e);
    res.status(500).json({ error: 'IP banlanamadı' });
  }
});

// IP ban kaldır
router.delete('/admin/ip-bans/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ip_blocks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Remove IP ban error:', e);
    res.status(500).json({ error: 'Ban kaldırılamadı' });
  }
});

module.exports = router;

// ==================== KULLANICI DETAY VE İŞLEMLER ====================

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
    console.error('User detail error:', e);
    res.status(500).json({ error: 'Kullanıcı alınamadı' });
  }
});

// Kullanıcı giriş denemeleri
router.get('/admin/user/:userId/login-attempts', (req, res) => {
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const attempts = db.prepare(
      'SELECT ip_address as ip, success, attempted_at as created_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);
    res.json(attempts);
  } catch(e) {
    console.error('Login attempts error:', e);
    res.status(500).json({ error: 'Denemeler alınamadı' });
  }
});

// Kullanıcı banları
router.get('/admin/user/:userId/bans', (req, res) => {
  try {
    const bans = db.prepare('SELECT * FROM user_bans WHERE user_id = ?').all(req.params.userId);
    res.json(bans);
  } catch(e) {
    console.error('User bans error:', e);
    res.status(500).json({ error: 'Yasaklar alınamadı' });
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
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

// Kullanıcı isim/nickname değiştir
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
    console.error('Rename user error:', e);
    res.status(500).json({ error: 'İsim değiştirilemedi' });
  }
});

// Kullanıcı doğum tarihi değiştir
router.put('/admin/user/:userId/birth-date', (req, res) => {
  try {
    const { birth_date } = req.body;
    db.prepare('UPDATE users SET birth_date = ? WHERE id = ?').run(birth_date, req.params.userId);
    res.json({ success: true });
  } catch(e) {
    console.error('Birth date error:', e);
    res.status(500).json({ error: 'Doğum tarihi güncellenemedi' });
  }
});

// Kullanıcıya ban ekle
router.post('/admin/user/:userId/ban', (req, res) => {
  try {
    const { banType, reason, isPermanent, bannedUntil } = req.body;
    db.prepare('INSERT OR REPLACE INTO user_bans (user_id, ban_type, reason, is_permanent, banned_until) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.userId, banType, reason, isPermanent ? 1 : 0, bannedUntil || null);
    res.json({ success: true });
  } catch(e) {
    console.error('Add ban error:', e);
    res.status(500).json({ error: 'Yasak eklenemedi' });
  }
});

// Ban kaldır
router.delete('/admin/ban/:banId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_bans WHERE id = ?').run(req.params.banId);
    res.json({ success: true });
  } catch(e) {
    console.error('Remove ban error:', e);
    res.status(500).json({ error: 'Yasak kaldırılamadı' });
  }
});

// ==================== VİDEO DETAY VE İŞLEMLER ====================

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
    console.error('Edit video error:', e);
    res.status(500).json({ error: 'Video düzenlenemedi' });
  }
});

// Video etiketlerini getir
router.get('/admin/video/:videoId/tags', (req, res) => {
  try {
    const video = db.prepare('SELECT tags FROM videos WHERE id = ?').get(req.params.videoId);
    res.json({ tags: video?.tags || '' });
  } catch(e) {
    console.error('Video tags error:', e);
    res.status(500).json({ error: 'Etiketler alınamadı' });
  }
});

// ==================== ROZETLER ====================

// Tüm rozetler
router.get('/admin/badges', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY created_at DESC').all();
    res.json(badges);
  } catch(e) {
    console.error('Badges error:', e);
    res.status(500).json({ error: 'Rozetler alınamadı' });
  }
});

// Rozet oluştur
router.post('/admin/badges', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    const result = db.prepare('INSERT INTO badges (name, icon, color, name_color, description, is_system) VALUES (?, ?, ?, ?, ?, 0)')
      .run(name, icon, color, nameColor, description);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) {
    console.error('Create badge error:', e);
    res.status(500).json({ error: 'Rozet oluşturulamadı' });
  }
});

// Rozet güncelle
router.put('/admin/badges/:id', (req, res) => {
  try {
    const { name, icon, color, nameColor, description } = req.body;
    db.prepare('UPDATE badges SET name = ?, icon = ?, color = ?, name_color = ?, description = ? WHERE id = ?')
      .run(name, icon, color, nameColor, description, req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Update badge error:', e);
    res.status(500).json({ error: 'Rozet güncellenemedi' });
  }
});

// Rozet sil
router.delete('/admin/badges/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM badges WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete badge error:', e);
    res.status(500).json({ error: 'Rozet silinemedi' });
  }
});

// Kullanıcıya rozet ver
router.post('/admin/badges/:badgeId/assign/:userId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) {
    console.error('Assign badge error:', e);
    res.status(500).json({ error: 'Rozet verilemedi' });
  }
});

// Kullanıcıdan rozet al
router.delete('/admin/badges/:badgeId/revoke/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(req.params.userId, req.params.badgeId);
    res.json({ success: true });
  } catch(e) {
    console.error('Revoke badge error:', e);
    res.status(500).json({ error: 'Rozet alınamadı' });
  }
});

// ==================== DUYURULAR ====================

// Tüm duyurular
router.get('/admin/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(announcements);
  } catch(e) {
    console.error('Announcements error:', e);
    res.status(500).json({ error: 'Duyurular alınamadı' });
  }
});

// Duyuru oluştur
router.post('/admin/announcements', (req, res) => {
  try {
    const { title, content, type, durationSeconds } = req.body;
    let expires_at = null;
    if (type === 'timed' && durationSeconds) {
      expires_at = new Date(Date.now() + durationSeconds * 1000).toISOString();
    } else if (type === 'instant') {
      expires_at = new Date(Date.now() + 10 * 1000).toISOString(); // 10 saniye
    }
    
    const result = db.prepare('INSERT INTO announcements (title, content, type, expires_at) VALUES (?, ?, ?, ?)')
      .run(title, content, type, expires_at);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) {
    console.error('Create announcement error:', e);
    res.status(500).json({ error: 'Duyuru oluşturulamadı' });
  }
});

// Duyuru güncelle
router.put('/admin/announcements/:id', (req, res) => {
  try {
    const { title, content } = req.body;
    db.prepare('UPDATE announcements SET title = ?, content = ? WHERE id = ?')
      .run(title, content, req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Update announcement error:', e);
    res.status(500).json({ error: 'Duyuru güncellenemedi' });
  }
});

// Duyuru sil
router.delete('/admin/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete announcement error:', e);
    res.status(500).json({ error: 'Duyuru silinemedi' });
  }
});

// ==================== GRUPLAR ====================

// Tüm gruplar
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
    console.error('Groups error:', e);
    res.status(500).json({ error: 'Gruplar alınamadı' });
  }
});

// Grup sil
router.delete('/admin/group/:groupId', (req, res) => {
  try {
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    console.error('Delete group error:', e);
    res.status(500).json({ error: 'Grup silinemedi' });
  }
});

// ==================== MESAJLAŞMA ====================

// Tüm mesajlaşmalar
router.get('/admin/all-messages', (req, res) => {
  try {
    // Bu endpoint Firebase mesajları için placeholder
    // Gerçek implementasyon Firebase Admin SDK gerektirir
    res.json([]);
  } catch(e) {
    console.error('Messages error:', e);
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

// ==================== ADMİN AYARLARI ====================

// Admin ayarları
router.get('/admin/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM admin_settings').all();
    res.json({ settings });
  } catch(e) {
    console.error('Admin settings error:', e);
    res.status(500).json({ error: 'Ayarlar alınamadı' });
  }
});

// Admin şifre değiştir
router.post('/admin/settings/password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('AdminTeaS');
    if (!admin) return res.status(404).json({ error: 'Admin bulunamadı' });
    
    const valid = await bcrypt.compare(current_password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Mevcut şifre hatalı' });
    
    const hashed = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE admins SET password = ? WHERE username = ?').run(hashed, 'AdminTeaS');
    
    res.json({ success: true });
  } catch(e) {
    console.error('Change admin password error:', e);
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});