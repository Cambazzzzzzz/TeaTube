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
    const { title, description, tags, video_type, views, likes, dislikes, admin_notes } = req.body;
    const videoId = req.params.id;
    
    const oldVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
    if (!oldVideo) return res.status(404).json({ error: 'Video bulunamadı' });
    
    db.prepare(`
      UPDATE videos 
      SET title = ?, description = ?, tags = ?, video_type = ?, views = ?, likes = ?, dislikes = ?, admin_notes = ?
      WHERE id = ?
    `).run(title, description, tags, video_type, views, likes, dislikes, admin_notes, videoId);
    
    logAdminAction(req.userId, 'video_edit', 'video', videoId, oldVideo.channel_id, 
      { title: oldVideo.title, tags: oldVideo.tags, video_type: oldVideo.video_type, views: oldVideo.views, likes: oldVideo.likes }, 
      { title, tags, video_type, views, likes }, 'Video düzenlendi', getClientIP(req));
    
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
// ==================== MÜZİK YÖNETİMİ ====================

// Tüm şarkıları listele
router.get('/music', requireRole('yetkili'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (s.title LIKE ? OR ma.artist_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status !== 'all') {
      if (status === 'suspended') {
        whereClause += ' AND s.is_suspended = 1';
      } else if (status === 'active') {
        whereClause += ' AND s.is_suspended = 0';
      }
    }
    
    const songs = db.prepare(`
      SELECT s.*, ma.artist_name, ma.user_id as artist_user_id
      FROM songs s
      JOIN music_artists ma ON s.artist_id = ma.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM songs s
      JOIN music_artists ma ON s.artist_id = ma.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ songs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Şarkı detayları
router.get('/music/:id', requireRole('yetkili'), (req, res) => {
  try {
    const song = db.prepare(`
      SELECT s.*, ma.artist_name, ma.user_id as artist_user_id
      FROM songs s
      JOIN music_artists ma ON s.artist_id = ma.id
      WHERE s.id = ?
    `).get(req.params.id);
    
    if (!song) return res.status(404).json({ error: 'Şarkı bulunamadı' });
    
    res.json(song);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Şarkı düzenle
router.put('/music/:id', requireRole('moderator'), (req, res) => {
  try {
    const { title, genre, play_count, company_name, admin_notes } = req.body;
    const songId = req.params.id;
    
    const oldSong = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!oldSong) return res.status(404).json({ error: 'Şarkı bulunamadı' });
    
    db.prepare(`
      UPDATE songs 
      SET title = ?, genre = ?, play_count = ?, company_name = ?, admin_notes = ?
      WHERE id = ?
    `).run(title, genre, play_count, company_name, admin_notes, songId);
    
    logAdminAction(req.userId, 'music_edit', 'song', songId, oldSong.artist_id, 
      { title: oldSong.title, play_count: oldSong.play_count }, 
      { title, play_count }, 'Şarkı düzenlendi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Şarkı askıya al/kaldır
router.put('/music/:id/suspend', requireRole('moderator'), (req, res) => {
  try {
    const { suspended, reason } = req.body;
    const songId = req.params.id;
    
    const oldSong = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!oldSong) return res.status(404).json({ error: 'Şarkı bulunamadı' });
    
    db.prepare(`
      UPDATE songs 
      SET is_suspended = ?, suspended_reason = ?
      WHERE id = ?
    `).run(suspended ? 1 : 0, suspended ? reason : null, songId);
    
    logAdminAction(req.userId, suspended ? 'music_suspend' : 'music_unsuspend', 'song', songId, oldSong.artist_id, 
      { is_suspended: oldSong.is_suspended }, { is_suspended: suspended }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Şarkı sil
router.delete('/music/:id', requireRole('admin'), (req, res) => {
  try {
    const songId = req.params.id;
    const { reason } = req.body;
    
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    if (!song) return res.status(404).json({ error: 'Şarkı bulunamadı' });
    
    db.prepare('DELETE FROM songs WHERE id = ?').run(songId);
    
    logAdminAction(req.userId, 'music_delete', 'song', songId, song.artist_id, 
      { title: song.title }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== YORUM YÖNETİMİ ====================

// Tüm yorumları listele
router.get('/comments', requireRole('yetkili'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (c.comment_text LIKE ? OR u.username LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status !== 'all') {
      if (status === 'suspended') {
        whereClause += ' AND c.is_suspended = 1';
      } else if (status === 'active') {
        whereClause += ' AND c.is_suspended = 0';
      }
    }
    
    const comments = db.prepare(`
      SELECT c.*, u.username, u.nickname, v.title as video_title
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN videos v ON c.video_id = v.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN videos v ON c.video_id = v.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ comments, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Yorum askıya al/kaldır
router.put('/comments/:id/suspend', requireRole('yetkili'), (req, res) => {
  try {
    const { suspended, reason } = req.body;
    const commentId = req.params.id;
    
    const oldComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!oldComment) return res.status(404).json({ error: 'Yorum bulunamadı' });
    
    db.prepare(`
      UPDATE comments 
      SET is_suspended = ?, suspended_by = ?, suspended_reason = ?
      WHERE id = ?
    `).run(suspended ? 1 : 0, suspended ? req.userId : null, suspended ? reason : null, commentId);
    
    logAdminAction(req.userId, suspended ? 'comment_suspend' : 'comment_unsuspend', 'comment', commentId, oldComment.user_id, 
      { is_suspended: oldComment.is_suspended }, { is_suspended: suspended }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Yorum sil
router.delete('/comments/:id', requireRole('moderator'), (req, res) => {
  try {
    const commentId = req.params.id;
    const { reason } = req.body;
    
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!comment) return res.status(404).json({ error: 'Yorum bulunamadı' });
    
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    
    logAdminAction(req.userId, 'comment_delete', 'comment', commentId, comment.user_id, 
      { comment_text: comment.comment_text }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== GRUP YÖNETİMİ ====================

// Tüm grupları listele
router.get('/groups', requireRole('moderator'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', privacy = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (g.name LIKE ? OR g.description LIKE ? OR u.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (privacy !== 'all') {
      if (privacy === 'private') {
        whereClause += ' AND g.is_private = 1';
      } else if (privacy === 'public') {
        whereClause += ' AND g.is_private = 0';
      }
    }
    
    const groups = db.prepare(`
      SELECT g.*, u.username as owner_username, u.nickname as owner_nickname,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ groups, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup detayları
router.get('/groups/:id', requireRole('moderator'), (req, res) => {
  try {
    const group = db.prepare(`
      SELECT g.*, u.username as owner_username, u.nickname as owner_nickname,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      WHERE g.id = ?
    `).get(req.params.id);
    
    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
    
    res.json(group);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup düzenle
router.put('/groups/:id', requireRole('moderator'), (req, res) => {
  try {
    const { name, description, is_private, admin_notes } = req.body;
    const groupId = req.params.id;
    
    const oldGroup = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!oldGroup) return res.status(404).json({ error: 'Grup bulunamadı' });
    
    db.prepare(`
      UPDATE groups 
      SET name = ?, description = ?, is_private = ?, admin_notes = ?
      WHERE id = ?
    `).run(name, description, is_private, admin_notes, groupId);
    
    logAdminAction(req.userId, 'group_edit', 'group', groupId, oldGroup.owner_id, 
      { name: oldGroup.name, is_private: oldGroup.is_private }, 
      { name, is_private }, 'Grup düzenlendi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup üyelerini listele
router.get('/groups/:id/members', requireRole('moderator'), (req, res) => {
  try {
    const members = db.prepare(`
      SELECT gm.*, u.username, u.nickname, u.profile_photo
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at DESC
    `).all(req.params.id);
    
    res.json(members);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup üyesini çıkar
router.delete('/groups/:groupId/members/:userId', requireRole('moderator'), (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
    
    logAdminAction(req.userId, 'group_member_remove', 'group', groupId, userId, 
      null, null, 'Üye gruptan çıkarıldı', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Grup sil
router.delete('/groups/:id', requireRole('admin'), (req, res) => {
  try {
    const groupId = req.params.id;
    const { reason } = req.body;
    
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
    
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
    
    logAdminAction(req.userId, 'group_delete', 'group', groupId, group.owner_id, 
      { name: group.name }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== MESAJ YÖNETİMİ ====================

// Mesajları listele
router.get('/messages', requireRole('moderator'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (u1.username LIKE ? OR u2.username LIKE ? OR u1.nickname LIKE ? OR u2.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const messages = db.prepare(`
      SELECT m.*, 
             u1.username as sender_username, u1.nickname as sender_nickname,
             u2.username as receiver_username, u2.nickname as receiver_nickname
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ messages, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// İki kullanıcı arasındaki konuşmayı getir
router.get('/messages/:userId1/:userId2', requireRole('moderator'), (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    const messages = db.prepare(`
      SELECT m.*, 
             u1.username as sender_username, u1.nickname as sender_nickname,
             u2.username as receiver_username, u2.nickname as receiver_nickname
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `).all(userId1, userId2, userId2, userId1);
    
    res.json({ messages });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Mesaj sil
router.delete('/messages/:id', requireRole('moderator'), (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    
    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    
    logAdminAction(req.userId, 'message_delete', 'message', messageId, message.sender_id, 
      { message_text: message.message_text }, null, 'Mesaj silindi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== ROL YÖNETİMİ ====================

// Yetkili kullanıcıları listele
router.get('/roles', requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.*, ur.role, ur.granted_by, ur.granted_at,
             (SELECT username FROM users WHERE id = ur.granted_by) as granted_by_username
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role != 'user'
      ORDER BY ur.granted_at DESC
    `).all();
    
    res.json({ users });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== TS MUSIC BAŞVURULARI ====================

// TS Music başvurularını listele
router.get('/ts-music-apps', requireRole('moderator'), (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status !== 'all') {
      whereClause += ' AND maa.status = ?';
      params.push(status);
    }
    
    const applications = db.prepare(`
      SELECT maa.*, u.username as user_username, u.nickname as user_nickname,
             (SELECT username FROM users WHERE id = maa.reviewed_by) as reviewed_by_username
      FROM music_artist_applications maa
      JOIN users u ON maa.user_id = u.id
      ${whereClause}
      ORDER BY maa.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM music_artist_applications maa
      JOIN users u ON maa.user_id = u.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ applications, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// TS Music başvuru detayları
router.get('/ts-music-apps/:id', requireRole('moderator'), (req, res) => {
  try {
    const application = db.prepare(`
      SELECT maa.*, u.username as user_username, u.nickname as user_nickname,
             (SELECT username FROM users WHERE id = maa.reviewed_by) as reviewed_by_username
      FROM music_artist_applications maa
      JOIN users u ON maa.user_id = u.id
      WHERE maa.id = ?
    `).get(req.params.id);
    
    if (!application) return res.status(404).json({ error: 'Başvuru bulunamadı' });
    
    res.json(application);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// TS Music başvuru durumu güncelle
router.put('/ts-music-apps/:id', requireRole('moderator'), (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const appId = req.params.id;
    
    const oldApp = db.prepare('SELECT * FROM music_artist_applications WHERE id = ?').get(appId);
    if (!oldApp) return res.status(404).json({ error: 'Başvuru bulunamadı' });
    
    db.prepare(`
      UPDATE music_artist_applications 
      SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, admin_note, req.userId, appId);
    
    // Eğer onaylandıysa artist kaydı oluştur
    if (status === 'approved') {
      try {
        db.prepare(`
          INSERT INTO music_artists (user_id, artist_name, artist_alias, bio, is_verified)
          VALUES (?, ?, ?, ?, 1)
        `).run(oldApp.user_id, oldApp.artist_name, oldApp.artist_alias, 'Onaylı artist');
      } catch(e) {
        // Artist zaten varsa ignore
      }
    }
    
    logAdminAction(req.userId, 'ts_music_app_review', 'application', appId, oldApp.user_id, 
      { status: oldApp.status }, { status }, admin_note, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== BİLDİRİ YÖNETİMİ ====================

// Bildiriler listele
router.get('/reports', requireRole('yetkili'), (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', type = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status !== 'all') {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }
    
    if (type !== 'all') {
      whereClause += ' AND r.reported_content_type = ?';
      params.push(type);
    }
    
    const reports = db.prepare(`
      SELECT r.*, 
             u1.username as reporter_username, u1.nickname as reporter_nickname,
             u2.username as reported_username, u2.nickname as reported_nickname,
             (SELECT username FROM users WHERE id = r.reviewed_by) as reviewed_by_username
      FROM reports r
      JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM reports r
      JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({ reports, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Bildiri detayları
router.get('/reports/:id', requireRole('yetkili'), (req, res) => {
  try {
    const report = db.prepare(`
      SELECT r.*, 
             u1.username as reporter_username, u1.nickname as reporter_nickname,
             u2.username as reported_username, u2.nickname as reported_nickname,
             (SELECT username FROM users WHERE id = r.reviewed_by) as reviewed_by_username
      FROM reports r
      JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      WHERE r.id = ?
    `).get(req.params.id);
    
    if (!report) return res.status(404).json({ error: 'Bildiri bulunamadı' });
    
    res.json(report);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Bildiri durumu güncelle
router.put('/reports/:id', requireRole('yetkili'), (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const reportId = req.params.id;
    
    const oldReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!oldReport) return res.status(404).json({ error: 'Bildiri bulunamadı' });
    
    db.prepare(`
      UPDATE reports 
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, admin_notes, req.userId, reportId);
    
    logAdminAction(req.userId, 'report_review', 'report', reportId, oldReport.reported_user_id, 
      { status: oldReport.status }, { status }, admin_notes, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== FOTOĞRAF YÖNETİMİ ====================

// Tüm fotoğrafları listele (videos tablosundan text_content olan kayıtlar)
router.get('/photos', requireRole('yetkili'), (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE v.text_content IS NOT NULL AND v.text_content != ""';
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
    
    const photos = db.prepare(`
      SELECT v.*, u.username, u.nickname, u.profile_photo, c.channel_name,
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
    
    res.json({ photos, total, page: parseInt(page), limit: parseInt(limit) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fotoğraf detayları
router.get('/photos/:id', requireRole('yetkili'), (req, res) => {
  try {
    const photo = db.prepare(`
      SELECT v.*, u.username, u.nickname, c.channel_name, u.profile_photo,
             (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count,
             (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id AND like_type = 1) as like_count,
             (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id AND like_type = -1) as dislike_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.id = ? AND v.text_content IS NOT NULL AND v.text_content != ""
    `).get(req.params.id);
    
    if (!photo) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
    
    res.json(photo);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fotoğraf düzenle
router.put('/photos/:id', requireRole('moderator'), (req, res) => {
  try {
    const { title, description, tags, views, likes, dislikes, admin_notes } = req.body;
    const photoId = req.params.id;
    
    const oldPhoto = db.prepare('SELECT * FROM videos WHERE id = ? AND text_content IS NOT NULL AND text_content != ""').get(photoId);
    if (!oldPhoto) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
    
    db.prepare(`
      UPDATE videos 
      SET title = ?, description = ?, tags = ?, views = ?, likes = ?, dislikes = ?, admin_notes = ?
      WHERE id = ?
    `).run(title, description, tags, views, likes, dislikes, admin_notes, photoId);
    
    logAdminAction(req.userId, 'photo_edit', 'photo', photoId, oldPhoto.channel_id, 
      { title: oldPhoto.title, tags: oldPhoto.tags, views: oldPhoto.views, likes: oldPhoto.likes }, 
      { title, tags, views, likes }, 'Fotoğraf düzenlendi', getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fotoğraf askıya al/kaldır
router.put('/photos/:id/suspend', requireRole('moderator'), (req, res) => {
  try {
    const { suspended, reason } = req.body;
    const photoId = req.params.id;
    
    const oldPhoto = db.prepare('SELECT * FROM videos WHERE id = ? AND text_content IS NOT NULL AND text_content != ""').get(photoId);
    if (!oldPhoto) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
    
    db.prepare(`
      UPDATE videos 
      SET is_suspended = ?, suspended_by_admin = ?, suspended_reason = ?
      WHERE id = ?
    `).run(suspended ? 1 : 0, suspended ? req.userId : null, suspended ? reason : null, photoId);
    
    logAdminAction(req.userId, suspended ? 'photo_suspend' : 'photo_unsuspend', 'photo', photoId, oldPhoto.channel_id, 
      { is_suspended: oldPhoto.is_suspended }, { is_suspended: suspended }, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fotoğraf sil
router.delete('/photos/:id', requireRole('admin'), (req, res) => {
  try {
    const photoId = req.params.id;
    const { reason } = req.body;
    
    const photo = db.prepare('SELECT * FROM videos WHERE id = ? AND text_content IS NOT NULL AND text_content != ""').get(photoId);
    if (!photo) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
    
    db.prepare('DELETE FROM videos WHERE id = ?').run(photoId);
    
    logAdminAction(req.userId, 'photo_delete', 'photo', photoId, photo.channel_id, 
      { title: photo.title }, null, reason, getClientIP(req));
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;