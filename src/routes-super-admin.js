const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');

// ==================== HELPER FUNCTIONS ====================

function getUserRole(userId) {
  const role = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(userId);
  return role ? role.role : 'user';
}

function hasPermission(userRole, requiredRole) {
  const hierarchy = { 'user': 0, 'yetkili': 1, 'moderator': 2, 'admin': 3 };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

function logAdminAction(adminId, actionType, targetType, targetId, targetUserId, oldValues, newValues, reason, ipAddress) {
  try {
    db.prepare(`
      INSERT INTO admin_action_logs (admin_id, action_type, target_type, target_id, target_user_id, old_values, new_values, reason, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, actionType, targetType, targetId, targetUserId, JSON.stringify(oldValues), JSON.stringify(newValues), reason, ipAddress);
  } catch(e) {
    console.error('Admin log hatası:', e);
  }
}

function getClientIP(req) {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
}

// Auth middleware
function requireRole(minRole) {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Yetkisiz erişim' });
    
    const userRole = getUserRole(userId);
    if (!hasPermission(userRole, minRole)) {
      return res.status(403).json({ error: 'Yeterli yetki yok' });
    }
    
    req.userRole = userRole;
    req.userId = userId;
    next();
  };
}

// ==================== DASHBOARD İSTATİSTİKLERİ ====================

// Dashboard istatistikleri
router.get('/stats', requireRole('yetkili'), (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalVideos = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
    const totalSongs = db.prepare('SELECT COUNT(*) as count FROM songs').get().count;
    const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
    const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get().count;
    
    // Son 24 saatte aktif kullanıcılar (basit hesaplama)
    const onlineUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_login_at > datetime('now', '-1 day')
    `).get().count;
    
    res.json({
      totalUsers,
      totalVideos,
      totalSongs,
      totalGroups,
      pendingReports,
      onlineUsers
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== VİDEO YÖNETİMİ ====================

// Tüm videoları listele
router.get('/videos', requireRole('yetkili'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (v.title LIKE ? OR v.description LIKE ? OR u.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status !== 'all') {
      if (status === 'suspended') {
        whereClause += ' AND v.is_suspended = 1';
      } else if (status === 'active') {
        whereClause += ' AND v.is_suspended = 0';
      }
    }
    
    const videos = db.prepare(`
      SELECT v.*, u.username, u.nickname, c.channel_name,
             (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ videos, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Video detayları
router.get('/videos/:id', requireRole('yetkili'), (req, res) => {
  try {
    const video = db.prepare(`
      SELECT v.*, u.username, u.nickname, c.channel_name, u.profile_photo,
             (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count,
             (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id AND like_type = 1) as like_count,
             (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id AND like_type = -1) as dislike_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.id = ?
    `).get(req.params.id);
    
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    
    res.json(video);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Video düzenle
router.put('/videos/:id', requireRole('moderator'), (req, res) => {
  try {
    const { title, description, views, likes, dislikes, admin_notes } = req.body;
    const videoId = req.params.id;
    
    const oldVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
    if (!oldVideo) return res.status(404).json({ error: 'Video bulunamadı' });
    
    db.prepare(`
      UPDATE videos 
      SET title = ?, description = ?, views = ?, likes = ?, dislikes = ?, admin_notes = ?
      WHERE id = ?
    `).run(title, description, views, likes, dislikes, admin_notes, videoId);
    
    logAdminAction(req.userId, 'video_edit', 'video', videoId, oldVideo.channel_id, 
      { title: oldVideo.title, views: oldVideo.views, likes: oldVideo.likes }, 
      { title, views, likes }, 'Video düzenlendi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Video askıya al/kaldır
router.put('/videos/:id/suspend', requireRole('moderator'), (req, res) => {
  try {
    const { suspended, reason } = req.body;
    const videoId = req.params.id;
    
    const oldVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
    if (!oldVideo) return res.status(404).json({ error: 'Video bulunamadı' });
    
    db.prepare(`
      UPDATE videos 
      SET is_suspended = ?, suspended_by_admin = ?, suspended_reason = ?
      WHERE id = ?
    `).run(suspended ? 1 : 0, suspended ? req.userId : null, suspended ? reason : null, videoId);
    
    logAdminAction(req.userId, suspended ? 'video_suspend' : 'video_unsuspend', 'video', videoId, oldVideo.channel_id, 
      { is_suspended: oldVideo.is_suspended }, { is_suspended: suspended }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Video sil
router.delete('/videos/:id', requireRole('admin'), (req, res) => {
  try {
    const videoId = req.params.id;
    const { reason } = req.body;
    
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    
    db.prepare('DELETE FROM videos WHERE id = ?').run(videoId);
    
    logAdminAction(req.userId, 'video_delete', 'video', videoId, video.channel_id, 
      { title: video.title }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== KULLANICI YÖNETİMİ ====================

// Tüm kullanıcıları listele
router.get('/users', requireRole('moderator'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role !== 'all') {
      whereClause += ' AND COALESCE(ur.role, "user") = ?';
      params.push(role);
    }
    
    const users = db.prepare(`
      SELECT u.*, ur.role, ur.granted_at,
             (SELECT COUNT(*) FROM videos v JOIN channels c ON v.channel_id = c.id WHERE c.user_id = u.id) as video_count,
             (SELECT COUNT(*) FROM friendships WHERE sender_id = u.id OR receiver_id = u.id) as friend_count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı detayları
router.get('/users/:id', requireRole('moderator'), (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, ur.role, ur.granted_at, ur.granted_by,
             (SELECT username FROM users WHERE id = ur.granted_by) as granted_by_username,
             (SELECT COUNT(*) FROM videos v JOIN channels c ON v.channel_id = c.id WHERE c.user_id = u.id) as video_count,
             (SELECT COUNT(*) FROM friendships WHERE (sender_id = u.id OR receiver_id = u.id) AND status = 'accepted') as friend_count,
             (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = ?
    `).get(req.params.id);
    
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    // Mute/ban durumları
    const mute = db.prepare('SELECT * FROM user_mutes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
    const ban = db.prepare('SELECT * FROM user_bans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
    
    user.mute_status = mute;
    user.ban_status = ban;
    
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı düzenle
router.put('/users/:id', requireRole('admin'), (req, res) => {
  try {
    const { username, nickname, birth_date, password } = req.body;
    const userId = req.params.id;
    
    const oldUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!oldUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    let updateQuery = 'UPDATE users SET username = ?, nickname = ?, birth_date = ?';
    let params = [username, nickname, birth_date];
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(userId);
    
    db.prepare(updateQuery).run(...params);
    
    logAdminAction(req.userId, 'user_edit', 'user', userId, userId, 
      { username: oldUser.username, nickname: oldUser.nickname }, 
      { username, nickname }, 'Kullanıcı düzenlendi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı rolü değiştir
router.put('/users/:id/role', requireRole('admin'), (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['user', 'yetkili', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol' });
    }
    
    // Admin rolü sadece süper admin verebilir
    if (role === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin rolü veremezsiniz' });
    }
    
    const oldRole = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(userId);
    
    if (role === 'user') {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO user_roles (user_id, role, granted_by)
        VALUES (?, ?, ?)
      `).run(userId, role, req.userId);
    }
    
    logAdminAction(req.userId, 'role_change', 'user', userId, userId, 
      { role: oldRole?.role || 'user' }, { role }, `Rol değiştirildi: ${role}`, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı mute
router.post('/users/:id/mute', requireRole('yetkili'), (req, res) => {
  try {
    const { reason, duration_hours, is_permanent } = req.body;
    const userId = req.params.id;
    
    let mutedUntil = null;
    if (!is_permanent && duration_hours) {
      mutedUntil = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
    }
    
    db.prepare(`
      INSERT INTO user_mutes (user_id, muted_by, reason, muted_until, is_permanent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, req.userId, reason, mutedUntil, is_permanent ? 1 : 0);
    
    db.prepare('UPDATE users SET is_muted = 1 WHERE id = ?').run(userId);
    
    logAdminAction(req.userId, 'user_mute', 'user', userId, userId, 
      { is_muted: false }, { is_muted: true }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı mute kaldır
router.delete('/users/:id/mute', requireRole('yetkili'), (req, res) => {
  try {
    const userId = req.params.id;
    
    db.prepare('UPDATE users SET is_muted = 0 WHERE id = ?').run(userId);
    
    logAdminAction(req.userId, 'user_unmute', 'user', userId, userId, 
      { is_muted: true }, { is_muted: false }, 'Mute kaldırıldı', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı ban
router.post('/users/:id/ban', requireRole('moderator'), (req, res) => {
  try {
    const { reason, duration_hours, is_permanent } = req.body;
    const userId = req.params.id;
    
    let bannedUntil = null;
    if (!is_permanent && duration_hours) {
      bannedUntil = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
    }
    
    db.prepare(`
      INSERT INTO user_bans (user_id, banned_by, reason, banned_until, is_permanent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, req.userId, reason, bannedUntil, is_permanent ? 1 : 0);
    
    db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(userId);
    
    logAdminAction(req.userId, 'user_ban', 'user', userId, userId, 
      { is_banned: false }, { is_banned: true }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Kullanıcı sil
router.delete('/users/:id', requireRole('admin'), (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    logAdminAction(req.userId, 'user_delete', 'user', userId, userId, 
      { username: user.username }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;