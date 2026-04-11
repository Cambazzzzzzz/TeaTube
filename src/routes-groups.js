const express = require('express');
const router = express.Router();
const db = require('./database');
const multer = require('multer');
const cloudinary = require('./cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

// ==================== GRUP OLUŞTUR ====================
router.post('/groups', upload.single('photo'), async (req, res) => {
  try {
    const { userId, name, description, isPrivate } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'Eksik bilgi' });

    let photoUrl = null;
    if (req.file) {
      photoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'teatube/groups', public_id: `group_${Date.now()}` },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(req.file.buffer);
      });
    }

    const result = db.prepare('INSERT INTO groups (name, description, photo_url, owner_id, is_private) VALUES (?, ?, ?, ?, ?)')
      .run(name, description || null, photoUrl, userId, isPrivate ? 1 : 0);

    // Kurucuyu owner olarak ekle
    db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, userId, 'owner');

    res.json({ success: true, groupId: result.lastInsertRowid });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Grup oluşturulamadı' });
  }
});

// Kullanıcının grupları
router.get('/groups/user/:userId', (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, gm.role,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      WHERE gm.is_banned = 0
      ORDER BY g.created_at DESC
    `).all(req.params.userId);
    res.json(groups);
  } catch(e) {
    res.status(500).json({ error: 'Gruplar alınamadı' });
  }
});

// Grup ara
router.get('/groups/search', (req, res) => {
  try {
    const { q, userId } = req.query;
    const groups = db.prepare(`
      SELECT g.*,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
             (SELECT role FROM group_members WHERE group_id = g.id AND user_id = ?) as my_role
      FROM groups g
      WHERE g.name LIKE ? AND g.is_private = 0
      ORDER BY member_count DESC LIMIT 20
    `).all(userId || 0, `%${q}%`);
    res.json(groups);
  } catch(e) {
    res.status(500).json({ error: 'Arama başarısız' });
  }
});

// Grup detayı
router.get('/groups/:groupId', (req, res) => {
  try {
    const { userId } = req.query;
    const group = db.prepare(`
      SELECT g.*,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
             (SELECT role FROM group_members WHERE group_id = g.id AND user_id = ?) as my_role,
             (SELECT is_banned FROM group_members WHERE group_id = g.id AND user_id = ?) as is_banned
      FROM groups g WHERE g.id = ?
    `).get(userId || 0, userId || 0, req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
    res.json(group);
  } catch(e) {
    res.status(500).json({ error: 'Grup alınamadı' });
  }
});

// Grup üyeleri
router.get('/groups/:groupId/members', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT gm.*, u.username, u.nickname, u.profile_photo
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? AND gm.is_banned = 0
      ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, gm.joined_at ASC
    `).all(req.params.groupId);
    res.json(members);
  } catch(e) {
    res.status(500).json({ error: 'Üyeler alınamadı' });
  }
});

// Gruba katıl / istek gönder
router.post('/groups/:groupId/join', (req, res) => {
  try {
    const { userId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });

    // Zaten üye mi?
    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (existing) return res.status(400).json({ error: 'Zaten üyesiniz' });

    if (group.is_private) {
      // Özel grup - istek gönder
      db.prepare('INSERT OR IGNORE INTO group_join_requests (group_id, user_id) VALUES (?, ?)').run(req.params.groupId, userId);
      // Sahibine bildirim
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(group.owner_id, 'group_join_request', `Grubunuza katılma isteği var: ${group.name}`, group.id);
      res.json({ success: true, pending: true });
    } else {
      // Açık grup - direkt katıl
      db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(req.params.groupId, userId, 'member');
      res.json({ success: true, pending: false });
    }
  } catch(e) {
    res.status(500).json({ error: 'Katılma başarısız' });
  }
});

// Gruptan ayrıl
router.delete('/groups/:groupId/leave', (req, res) => {
  try {
    const { userId } = req.body;
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.groupId, userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ayrılma başarısız' });
  }
});

// Katılma isteklerini getir (owner/mod)
router.get('/groups/:groupId/requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT gjr.*, u.username, u.nickname, u.profile_photo
      FROM group_join_requests gjr
      JOIN users u ON gjr.user_id = u.id
      WHERE gjr.group_id = ? AND gjr.status = 'pending'
      ORDER BY gjr.created_at DESC
    `).all(req.params.groupId);
    res.json(requests);
  } catch(e) {
    res.status(500).json({ error: 'İstekler alınamadı' });
  }
});

// Katılma isteğini kabul/red et
router.put('/groups/:groupId/requests/:requestId', (req, res) => {
  try {
    const { action, adminId } = req.body;
    const request = db.prepare('SELECT * FROM group_join_requests WHERE id = ?').get(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'İstek bulunamadı' });

    // Yetki kontrolü
    const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, adminId);
    if (!member || !['owner', 'moderator'].includes(member.role)) return res.status(403).json({ error: 'Yetkisiz' });

    db.prepare('UPDATE group_join_requests SET status = ? WHERE id = ?').run(action, req.params.requestId);

    if (action === 'accepted') {
      db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(req.params.groupId, request.user_id, 'member');
      const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(req.params.groupId);
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(request.user_id, 'group_accepted', `"${group.name}" grubuna katılma isteğiniz kabul edildi!`, req.params.groupId);
    }

    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Grup ayarlarını güncelle
router.put('/groups/:groupId/settings', (req, res) => {
  try {
    const { userId, name, description, isPrivate, allowMemberMessages, allowMemberPhotos } = req.body;
    const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!member || member.role !== 'owner') return res.status(403).json({ error: 'Sadece yönetici ayar değiştirebilir' });

    db.prepare('UPDATE groups SET name = ?, description = ?, is_private = ?, allow_member_messages = ?, allow_member_photos = ? WHERE id = ?')
      .run(name, description, isPrivate ? 1 : 0, allowMemberMessages ? 1 : 0, allowMemberPhotos ? 1 : 0, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

// Moderatör ata / yetkilerini güncelle
router.put('/groups/:groupId/members/:memberId/role', (req, res) => {
  try {
    const { userId, role, permissions } = req.body;
    const requester = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role !== 'owner') return res.status(403).json({ error: 'Sadece yönetici rol değiştirebilir' });

    db.prepare('UPDATE group_members SET role = ?, permissions = ? WHERE group_id = ? AND user_id = ?')
      .run(role, JSON.stringify(permissions || {}), req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Rol güncellenemedi' });
  }
});

// Yöneticilik devret
router.put('/groups/:groupId/transfer', (req, res) => {
  try {
    const { userId, newOwnerId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group || group.owner_id !== userId) return res.status(403).json({ error: 'Sadece yönetici devredebilir' });

    db.prepare('UPDATE groups SET owner_id = ? WHERE id = ?').run(newOwnerId, req.params.groupId);
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run('member', req.params.groupId, userId);
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run('owner', req.params.groupId, newOwnerId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Devir başarısız' });
  }
});

// Üyeyi sus (süreli/sınırsız)
router.put('/groups/:groupId/members/:memberId/mute', (req, res) => {
  try {
    const { userId, mutedUntil } = req.body; // mutedUntil = null → sınırsız
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_mute) return res.status(403).json({ error: 'Bu yetkiye sahip değilsiniz' });
    }
    db.prepare('UPDATE group_members SET is_muted = 1, muted_until = ? WHERE group_id = ? AND user_id = ?')
      .run(mutedUntil || null, req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Üyeyi ban (süreli/sınırsız)
router.put('/groups/:groupId/members/:memberId/ban', (req, res) => {
  try {
    const { userId, bannedUntil } = req.body;
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_ban) return res.status(403).json({ error: 'Bu yetkiye sahip değilsiniz' });
    }
    db.prepare('UPDATE group_members SET is_banned = 1, banned_until = ? WHERE group_id = ? AND user_id = ?')
      .run(bannedUntil || null, req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Üyeyi gruptan at
router.delete('/groups/:groupId/members/:memberId', (req, res) => {
  try {
    const { userId } = req.body;
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_kick) return res.status(403).json({ error: 'Bu yetkiye sahip değilsiniz' });
    }
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Grup sil
router.delete('/groups/:groupId', (req, res) => {
  try {
    const { userId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group || group.owner_id !== userId) return res.status(403).json({ error: 'Sadece yönetici silebilir' });
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup silinemedi' });
  }
});

module.exports = router;
