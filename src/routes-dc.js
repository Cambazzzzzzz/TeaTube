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
