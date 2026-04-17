// DemlikChat API Routes for TeaTube
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('./database').db;

// ==================== AUTH ====================

// Register
router.post('/dc/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    // Check if username exists
    const existing = db.prepare('SELECT id FROM dc_users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO dc_users (username, password, display_name) VALUES (?, ?, ?)');
    const result = stmt.run(username, hashedPassword, displayName || username);
    
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (err) {
    console.error('DC Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
router.post('/dc/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM dc_users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Hatalı şifre' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('DC Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SERVERS ====================

// Get user's servers
router.get('/dc/servers/:userId', (req, res) => {
  try {
    const servers = db.prepare(`
      SELECT s.* FROM dc_servers s
      JOIN dc_server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ?
      ORDER BY s.created_at ASC
    `).all(req.params.userId);
    
    res.json({ success: true, servers });
  } catch (err) {
    console.error('Get servers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create server
router.post('/dc/servers/create', (req, res) => {
  try {
    const { userId, name, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Sunucu adı gerekli' });
    }
    
    const result = db.prepare('INSERT INTO dc_servers (name, icon, created_by) VALUES (?, ?, ?)')
      .run(name, icon || null, userId);
    
    // Add creator as admin member
    db.prepare('INSERT INTO dc_server_members (server_id, user_id, role) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, userId, 'admin');
    
    // Create default channels
    const serverId = result.lastInsertRowid;
    db.prepare('INSERT INTO dc_channels (server_id, name, type) VALUES (?, ?, ?)').run(serverId, 'genel', 'text');
    db.prepare('INSERT INTO dc_channels (server_id, name, type) VALUES (?, ?, ?)').run(serverId, 'rastgele', 'text');
    db.prepare('INSERT INTO dc_channels (server_id, name, type) VALUES (?, ?, ?)').run(serverId, 'Genel Ses', 'voice');
    
    res.json({ success: true, serverId: result.lastInsertRowid });
  } catch (err) {
    console.error('Create server error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CHANNELS ====================

// Get server channels
router.get('/dc/channels/:serverId', (req, res) => {
  try {
    const channels = db.prepare('SELECT * FROM dc_channels WHERE server_id = ? ORDER BY position ASC')
      .all(req.params.serverId);
    
    res.json({ success: true, channels });
  } catch (err) {
    console.error('Get channels error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MESSAGES ====================

// Get channel messages
router.get('/dc/messages/:serverId/:channelId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM dc_messages m
      JOIN dc_users u ON m.user_id = u.id
      WHERE m.server_id = ? AND m.channel_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all(req.params.serverId, req.params.channelId);
    
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MEMBERS ====================

// Get server members
router.get('/dc/members/:serverId', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, sm.role, 0 as online
      FROM dc_server_members sm
      JOIN dc_users u ON sm.user_id = u.id
      WHERE sm.server_id = ?
      ORDER BY sm.role DESC, u.username ASC
    `).all(req.params.serverId);
    
    res.json({ success: true, members });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;


// ==================== ÖZEL MESAJLAR (DM) ====================

// Get user's DMs
router.get('/dc/dms/:userId', (req, res) => {
  try {
    const dms = db.prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN m.from_user = ? THEN m.to_user
          ELSE m.from_user
        END as user_id,
        u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM dc_dm_messages WHERE from_user = user_id AND to_user = ? AND read = 0) as unread_count
      FROM dc_dm_messages m
      JOIN dc_users u ON (CASE WHEN m.from_user = ? THEN m.to_user ELSE m.from_user END) = u.id
      WHERE m.from_user = ? OR m.to_user = ?
      ORDER BY m.created_at DESC
    `).all(req.params.userId, req.params.userId, req.params.userId, req.params.userId, req.params.userId);
    
    res.json({ success: true, dms });
  } catch (err) {
    console.error('Get DMs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get DM messages between two users
router.get('/dc/dm-messages/:userId/:targetId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM dc_dm_messages m
      JOIN dc_users u ON m.from_user = u.id
      WHERE (m.from_user = ? AND m.to_user = ?) OR (m.from_user = ? AND m.to_user = ?)
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all(req.params.userId, req.params.targetId, req.params.targetId, req.params.userId);
    
    // Mark as read
    db.prepare('UPDATE dc_dm_messages SET read = 1 WHERE from_user = ? AND to_user = ?')
      .run(req.params.targetId, req.params.userId);
    
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get DM messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ARKADAŞ SİSTEMİ ====================

// Get user's friends and requests
router.get('/dc/friends/:userId', (req, res) => {
  try {
    const friends = db.prepare(`
      SELECT u.id as user_id, u.username, u.display_name, u.avatar, 0 as online
      FROM dc_friends f
      JOIN dc_users u ON (CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END) = u.id
      WHERE (f.user1_id = ? OR f.user2_id = ?) AND f.status = 'accepted'
      ORDER BY u.username ASC
    `).all(req.params.userId, req.params.userId, req.params.userId);
    
    const requests = db.prepare(`
      SELECT fr.id, u.id as user_id, u.username, u.display_name, u.avatar
      FROM dc_friend_requests fr
      JOIN dc_users u ON fr.from_user = u.id
      WHERE fr.to_user = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(req.params.userId);
    
    res.json({ success: true, friends, requests });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send friend request
router.post('/dc/friends/request', (req, res) => {
  try {
    const { userId, targetUsername } = req.body;
    
    const targetUser = db.prepare('SELECT id FROM dc_users WHERE username = ?').get(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    
    if (targetUser.id === userId) {
      return res.status(400).json({ success: false, error: 'Kendine istek gönderemezsin' });
    }
    
    // Check if already friends
    const existing = db.prepare(`
      SELECT id FROM dc_friends 
      WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = 'accepted'
    `).get(userId, targetUser.id, targetUser.id, userId);
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Zaten arkadaşsınız' });
    }
    
    // Check if request already exists
    const existingRequest = db.prepare(`
      SELECT id FROM dc_friend_requests 
      WHERE ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)) AND status = 'pending'
    `).get(userId, targetUser.id, targetUser.id, userId);
    
    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Zaten bekleyen bir istek var' });
    }
    
    db.prepare('INSERT INTO dc_friend_requests (from_user, to_user, status) VALUES (?, ?, ?)')
      .run(userId, targetUser.id, 'pending');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Accept friend request
router.post('/dc/friends/accept', (req, res) => {
  try {
    const { requestId } = req.body;
    
    const request = db.prepare('SELECT * FROM dc_friend_requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'İstek bulunamadı' });
    }
    
    // Update request status
    db.prepare('UPDATE dc_friend_requests SET status = ? WHERE id = ?').run('accepted', requestId);
    
    // Add to friends
    db.prepare('INSERT INTO dc_friends (user1_id, user2_id, status) VALUES (?, ?, ?)')
      .run(request.from_user, request.to_user, 'accepted');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Accept friend request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject friend request
router.post('/dc/friends/reject', (req, res) => {
  try {
    const { requestId } = req.body;
    
    db.prepare('UPDATE dc_friend_requests SET status = ? WHERE id = ?').run('rejected', requestId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Reject friend request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove friend
router.post('/dc/friends/remove', (req, res) => {
  try {
    const { userId, friendId } = req.body;
    
    db.prepare('DELETE FROM dc_friends WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)')
      .run(userId, friendId, friendId, userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MESAJ YÖNETİMİ ====================

// Delete message
router.post('/dc/messages/delete', (req, res) => {
  try {
    const { messageId, userId } = req.body;
    
    const message = db.prepare('SELECT * FROM dc_messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });
    }
    
    if (message.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Yetkisiz' });
    }
    
    db.prepare('DELETE FROM dc_messages WHERE id = ?').run(messageId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DOSYA YÜKLEME ====================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'data', 'dc-uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/dc/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Dosya yok' });
    }
    
    const fileUrl = `/dc-uploads/${req.file.filename}`;
    
    res.json({ success: true, fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ROL SİSTEMİ ====================

// Get server roles
router.get('/dc/roles/:serverId', (req, res) => {
  try {
    const roles = db.prepare(`
      SELECT r.*, COUNT(mr.id) as member_count
      FROM dc_roles r
      LEFT JOIN dc_member_roles mr ON r.id = mr.role_id
      WHERE r.server_id = ?
      GROUP BY r.id
      ORDER BY r.position DESC
    `).all(req.params.serverId);
    
    res.json({ success: true, roles });
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create role
router.post('/dc/roles/create', (req, res) => {
  try {
    const { serverId, name, color, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Rol adı gerekli' });
    }
    
    const permissionsJson = JSON.stringify(permissions || {});
    
    const result = db.prepare(`
      INSERT INTO dc_roles (server_id, name, color, permissions, position)
      VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM dc_roles WHERE server_id = ?))
    `).run(serverId, name, color || '#99aab5', permissionsJson, serverId);
    
    res.json({ success: true, roleId: result.lastInsertRowid });
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete role
router.post('/dc/roles/delete', (req, res) => {
  try {
    const { serverId, roleId } = req.body;
    
    // Check if it's default role
    const role = db.prepare('SELECT is_default FROM dc_roles WHERE id = ? AND server_id = ?').get(roleId, serverId);
    if (role && role.is_default) {
      return res.status(400).json({ success: false, error: 'Varsayılan rol silinemez' });
    }
    
    // Delete role and member assignments
    db.prepare('DELETE FROM dc_member_roles WHERE role_id = ?').run(roleId);
    db.prepare('DELETE FROM dc_roles WHERE id = ? AND server_id = ?').run(roleId, serverId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get member roles
router.get('/dc/member-roles/:serverId/:userId', (req, res) => {
  try {
    const roles = db.prepare(`
      SELECT r.id as role_id, r.name, r.color, mr.assigned_at
      FROM dc_member_roles mr
      JOIN dc_roles r ON mr.role_id = r.id
      WHERE mr.server_id = ? AND mr.user_id = ?
      ORDER BY r.position DESC
    `).all(req.params.serverId, req.params.userId);
    
    res.json({ success: true, roles });
  } catch (err) {
    console.error('Get member roles error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add role to member
router.post('/dc/member-roles/add', (req, res) => {
  try {
    const { serverId, userId, roleId } = req.body;
    
    db.prepare('INSERT OR IGNORE INTO dc_member_roles (server_id, user_id, role_id) VALUES (?, ?, ?)')
      .run(serverId, userId, roleId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Add member role error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove role from member
router.post('/dc/member-roles/remove', (req, res) => {
  try {
    const { serverId, userId, roleId } = req.body;
    
    db.prepare('DELETE FROM dc_member_roles WHERE server_id = ? AND user_id = ? AND role_id = ?')
      .run(serverId, userId, roleId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member role error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;


// ==================== MESAJ TEPKİLERİ ====================

// Add reaction
router.post('/dc/reactions/add', (req, res) => {
  try {
    const { messageId, userId, emoji } = req.body;
    
    db.prepare('INSERT OR IGNORE INTO dc_message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')
      .run(messageId, userId, emoji);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Add reaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove reaction
router.post('/dc/reactions/remove', (req, res) => {
  try {
    const { messageId, userId, emoji } = req.body;
    
    db.prepare('DELETE FROM dc_message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
      .run(messageId, userId, emoji);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove reaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get message reactions
router.get('/dc/reactions/:messageId', (req, res) => {
  try {
    const reactions = db.prepare(`
      SELECT r.*, u.username, u.display_name, u.avatar
      FROM dc_message_reactions r
      JOIN dc_users u ON r.user_id = u.id
      WHERE r.message_id = ?
      ORDER BY r.created_at ASC
    `).all(req.params.messageId);
    
    res.json({ success: true, reactions });
  } catch (err) {
    console.error('Get reactions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SABİTLENMİŞ MESAJLAR ====================

// Pin message
router.post('/dc/messages/pin', (req, res) => {
  try {
    const { messageId, serverId, channelId } = req.body;
    
    // Add is_pinned column if not exists
    try {
      db.prepare('ALTER TABLE dc_messages ADD COLUMN is_pinned INTEGER DEFAULT 0').run();
    } catch(e) {}
    
    db.prepare('UPDATE dc_messages SET is_pinned = 1 WHERE id = ?').run(messageId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Pin message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unpin message
router.post('/dc/messages/unpin', (req, res) => {
  try {
    const { messageId } = req.body;
    
    db.prepare('UPDATE dc_messages SET is_pinned = 0 WHERE id = ?').run(messageId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Unpin message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get pinned messages
router.get('/dc/pinned/:serverId/:channelId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM dc_messages m
      JOIN dc_users u ON m.user_id = u.id
      WHERE m.server_id = ? AND m.channel_id = ? AND m.is_pinned = 1
      ORDER BY m.created_at DESC
    `).all(req.params.serverId, req.params.channelId);
    
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get pinned messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MESAJ ARAMA ====================

// Search messages
router.get('/dc/search', (req, res) => {
  try {
    const { serverId, query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ success: true, results: [] });
    }
    
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM dc_messages m
      JOIN dc_users u ON m.user_id = u.id
      WHERE m.server_id = ? AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(serverId, `%${query}%`);
    
    res.json({ success: true, results: messages });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== KULLANICI DURUMU ====================

// Set user status
router.post('/dc/status/set', (req, res) => {
  try {
    const { userId, status } = req.body;
    
    db.prepare(`
      INSERT INTO dc_user_status (user_id, status, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP
    `).run(userId, status, status);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Set status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set custom status
router.post('/dc/status/custom', (req, res) => {
  try {
    const { userId, customStatus } = req.body;
    
    db.prepare(`
      INSERT INTO dc_user_status (user_id, custom_status, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET custom_status = ?, updated_at = CURRENT_TIMESTAMP
    `).run(userId, customStatus, customStatus);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Set custom status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user status
router.get('/dc/status/:userId', (req, res) => {
  try {
    const status = db.prepare('SELECT * FROM dc_user_status WHERE user_id = ?').get(req.params.userId);
    
    res.json({ success: true, status: status || { status: 'online', custom_status: null } });
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
