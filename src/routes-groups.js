const express = require('express');
const router = express.Router();
const db = require('./database');
const multer = require('multer');
const cloudinaryModule = require('./cloudinary');
const cloudinary = cloudinaryModule.cloudinary;

const upload = multer({ storage: multer.memoryStorage() });

// ==================== GRUP OLUÅTUR ====================
router.post('/groups', upload.single('photo'), async (req, res) => {
  try {
    const { userId, name, description, isPrivate } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'Eksik bilgi' });

    let photoUrl = null;
    if (req.file) {
      try {
        photoUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'teatube/groups', public_id: `group_${Date.now()}` },
            (err, result) => err ? reject(err) : resolve(result.secure_url)
          );
          stream.end(req.file.buffer);
        });
      } catch(e) {
        console.error('Grup fotoÄrafÄ± yÃ¼klenemedi:', e.message);
        // FotoÄraf yÃ¼klenemese de grup oluÅtur
      }
    }

    const result = db.prepare('INSERT INTO groups (name, description, photo_url, owner_id, is_private) VALUES (?, ?, ?, ?, ?)')
      .run(name, description || null, photoUrl, userId, isPrivate ? 1 : 0);

    // Kurucuyu owner olarak ekle
    db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, userId, 'owner');

    res.json({ success: true, groupId: result.lastInsertRowid });
  } catch(e) {
    console.error('Grup oluÅturma hatasÄ±:', e);
    res.status(500).json({ error: 'Grup oluÅturulamadÄ±: ' + e.message });
  }
});

// KullanÄ±cÄ±nÄ±n gÃ¶nderdiÄi bekleyen istekler
router.get('/groups/my-requests/:userId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT gjr.*, g.name as group_name, g.photo_url as group_photo
      FROM group_join_requests gjr
      JOIN groups g ON gjr.group_id = g.id
      WHERE gjr.user_id = ? AND gjr.status = 'pending'
    `).all(req.params.userId);
    res.json(requests);
  } catch(e) {
    res.status(500).json({ error: 'Ä°stekler alÄ±namadÄ±' });
  }
});

// YÃ¶neticinin gruplarÄ±ndaki tÃ¼m bekleyen istekler
router.get('/groups/pending-requests/:userId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT gjr.*, u.username, u.nickname, u.profile_photo,
             g.id as group_id, g.name as group_name, g.photo_url as group_photo
      FROM group_join_requests gjr
      JOIN users u ON gjr.user_id = u.id
      JOIN groups g ON gjr.group_id = g.id
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      WHERE gjr.status = 'pending' AND gm.role IN ('owner', 'moderator')
      ORDER BY gjr.created_at DESC
    `).all(req.params.userId);
    res.json(requests);
  } catch(e) {
    res.status(500).json({ error: 'Ä°stekler alÄ±namadÄ±' });
  }
});

// TÃ¼m aÃ§Ä±k gruplar (keÅfet)
router.get('/groups/all', (req, res) => {
  try {
    const { userId } = req.query;
    const groups = db.prepare(`
      SELECT g.*,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
             (SELECT role FROM group_members WHERE group_id = g.id AND user_id = ?) as my_role
      FROM groups g
      ORDER BY member_count DESC, g.created_at DESC
      LIMIT 50
    `).all(userId || 0);
    res.json(groups);
  } catch(e) {
    res.status(500).json({ error: 'Gruplar alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ±nÄ±n gruplarÄ±
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
    res.status(500).json({ error: 'Gruplar alÄ±namadÄ±' });
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
    res.status(500).json({ error: 'Arama baÅarÄ±sÄ±z' });
  }
});

// Grup detayÄ±
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
    if (!group) return res.status(404).json({ error: 'Grup bulunamadÄ±' });
    res.json(group);
  } catch(e) {
    res.status(500).json({ error: 'Grup alÄ±namadÄ±' });
  }
});

// Grup Ã¼yeleri
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
    res.status(500).json({ error: 'Ãyeler alÄ±namadÄ±' });
  }
});

// Gruba katÄ±l / istek gÃ¶nder
router.post('/groups/:groupId/join', (req, res) => {
  try {
    const { userId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Grup bulunamadÄ±' });

    // Zaten Ã¼ye mi?
    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (existing) return res.status(400).json({ error: 'Zaten Ã¼yesiniz' });

    if (group.is_private) {
      // Ãzel grup - istek gÃ¶nder
      db.prepare('INSERT OR IGNORE INTO group_join_requests (group_id, user_id) VALUES (?, ?)').run(req.params.groupId, userId);
      // Sahibine bildirim
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(group.owner_id, 'group_join_request', `Grubunuza katÄ±lma isteÄi var: ${group.name}`, group.id);
      res.json({ success: true, pending: true });
    } else {
      // AÃ§Ä±k grup - direkt katÄ±l
      db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(req.params.groupId, userId, 'member');
      res.json({ success: true, pending: false });
    }
  } catch(e) {
    res.status(500).json({ error: 'KatÄ±lma baÅarÄ±sÄ±z' });
  }
});

// Gruptan ayrÄ±l
router.delete('/groups/:groupId/leave', (req, res) => {
  try {
    const { userId } = req.body;
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.groupId, userId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'AyrÄ±lma baÅarÄ±sÄ±z' });
  }
});

// KatÄ±lma isteklerini getir (owner/mod)
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
    res.status(500).json({ error: 'Ä°stekler alÄ±namadÄ±' });
  }
});

// KatÄ±lma isteÄini kabul/red et
router.put('/groups/:groupId/requests/:requestId', (req, res) => {
  try {
    const { action, adminId } = req.body;
    // requestId hem id hem user_id olabilir
    let request = db.prepare('SELECT * FROM group_join_requests WHERE id = ? AND group_id = ?').get(req.params.requestId, req.params.groupId);
    if (!request) {
      // user_id ile dene
      request = db.prepare('SELECT * FROM group_join_requests WHERE user_id = ? AND group_id = ? AND status = "pending"').get(req.params.requestId, req.params.groupId);
    }
    if (!request) return res.status(404).json({ error: 'Ä°stek bulunamadÄ±: ' + req.params.requestId });

    // Yetki kontrolÃ¼ - adminId yoksa group owner'Ä± bul
    let hasPermission = false;
    if (adminId) {
      const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, adminId);
      hasPermission = member && ['owner', 'moderator'].includes(member.role);
    }
    if (!hasPermission) return res.status(403).json({ error: 'Yetkisiz' });

    db.prepare('UPDATE group_join_requests SET status = ? WHERE id = ?').run(action, request.id);

    if (action === 'accepted') {
      db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(req.params.groupId, request.user_id, 'member');
      try {
        const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(req.params.groupId);
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(request.user_id, 'group_accepted', `"${group?.name}" grubuna katÄ±lma isteÄiniz kabul edildi!`, req.params.groupId);
      } catch(ne) {}
    }

    res.json({ success: true });
  } catch(e) {
    console.error('Group request error:', e);
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z: ' + e.message });
  }
});

// Grup ayarlarÄ±nÄ± gÃ¼ncelle
router.put('/groups/:groupId/settings', (req, res) => {
  try {
    const { userId, name, description, isPrivate, allowMemberMessages, allowMemberPhotos } = req.body;
    const member = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!member || member.role !== 'owner') return res.status(403).json({ error: 'Sadece yÃ¶netici ayar deÄiÅtirebilir' });

    db.prepare('UPDATE groups SET name = ?, description = ?, is_private = ?, allow_member_messages = ?, allow_member_photos = ? WHERE id = ?')
      .run(name, description, isPrivate ? 1 : 0, allowMemberMessages ? 1 : 0, allowMemberPhotos ? 1 : 0, req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ayarlar gÃ¼ncellenemedi' });
  }
});

// ModeratÃ¶r ata / yetkilerini gÃ¼ncelle
router.put('/groups/:groupId/members/:memberId/role', (req, res) => {
  try {
    const { userId, role, permissions } = req.body;
    const requester = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role !== 'owner') return res.status(403).json({ error: 'Sadece yÃ¶netici rol deÄiÅtirebilir' });

    db.prepare('UPDATE group_members SET role = ?, permissions = ? WHERE group_id = ? AND user_id = ?')
      .run(role, JSON.stringify(permissions || {}), req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Rol gÃ¼ncellenemedi' });
  }
});

// YÃ¶neticilik devret
router.put('/groups/:groupId/transfer', (req, res) => {
  try {
    const { userId, newOwnerId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group || group.owner_id !== userId) return res.status(403).json({ error: 'Sadece yÃ¶netici devredebilir' });

    db.prepare('UPDATE groups SET owner_id = ? WHERE id = ?').run(newOwnerId, req.params.groupId);
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run('member', req.params.groupId, userId);
    db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run('owner', req.params.groupId, newOwnerId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Devir baÅarÄ±sÄ±z' });
  }
});

// Ãyeyi sus (sÃ¼reli/sÄ±nÄ±rsÄ±z)
router.put('/groups/:groupId/members/:memberId/mute', (req, res) => {
  try {
    const { userId, mutedUntil } = req.body; // mutedUntil = null â sÄ±nÄ±rsÄ±z
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_mute) return res.status(403).json({ error: 'Bu yetkiye sahip deÄilsiniz' });
    }
    db.prepare('UPDATE group_members SET is_muted = 1, muted_until = ? WHERE group_id = ? AND user_id = ?')
      .run(mutedUntil || null, req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// Ãyeyi ban (sÃ¼reli/sÄ±nÄ±rsÄ±z)
router.put('/groups/:groupId/members/:memberId/ban', (req, res) => {
  try {
    const { userId, bannedUntil } = req.body;
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_ban) return res.status(403).json({ error: 'Bu yetkiye sahip deÄilsiniz' });
    }
    db.prepare('UPDATE group_members SET is_banned = 1, banned_until = ? WHERE group_id = ? AND user_id = ?')
      .run(bannedUntil || null, req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// Ãyeyi gruptan at
router.delete('/groups/:groupId/members/:memberId', (req, res) => {
  try {
    const { userId } = req.body;
    const requester = db.prepare('SELECT role, permissions FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.groupId, userId);
    if (!requester || requester.role === 'member') return res.status(403).json({ error: 'Yetkisiz' });
    if (requester.role === 'moderator') {
      const perms = JSON.parse(requester.permissions || '{}');
      if (!perms.can_kick) return res.status(403).json({ error: 'Bu yetkiye sahip deÄilsiniz' });
    }
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.groupId, req.params.memberId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°Ålem baÅarÄ±sÄ±z' });
  }
});

// Grup sil
router.delete('/groups/:groupId', (req, res) => {
  try {
    const { userId } = req.body;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
    if (!group || group.owner_id !== userId) return res.status(403).json({ error: 'Sadece yÃ¶netici silebilir' });
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.groupId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Grup silinemedi' });
  }
});

// Grup katÄ±lma isteÄini iptal et
router.delete('/groups/request/:requestId', (req, res) => {
  try {
    db.prepare('DELETE FROM group_join_requests WHERE id = ?').run(req.params.requestId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°stek iptal edilemedi' });
  }
});

module.exports = router;
