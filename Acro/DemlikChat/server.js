const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

// Database
const db = new Database('data/chat.db');
db.pragma('journal_mode = WAL');

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    avatar TEXT,
    background TEXT,
    about TEXT DEFAULT '',
    links TEXT DEFAULT '[]',
    favorite_food TEXT DEFAULT '',
    two_factor_enabled INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'midnight',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    blocked_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(blocked_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    user_id INTEGER,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user INTEGER,
    to_user INTEGER,
    group_id INTEGER,
    content TEXT,
    type TEXT DEFAULT 'text',
    file_path TEXT,
    deleted_for TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(from_user) REFERENCES users(id),
    FOREIGN KEY(to_user) REFERENCES users(id),
    FOREIGN KEY(group_id) REFERENCES groups(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(from_user, to_user);
  CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
  CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
`);

// Upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'data/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('data/uploads'));

// Root route - Countdown page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'countdown.html'));
});

// Discord page
app.get('/discord.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discord.html'));
});

// Original chat (index.html)
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)');
    const result = stmt.run(username, hashedPassword, displayName || username);
    
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password, favoriteFood } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, error: 'Hatalı şifre' });
    
    if (user.two_factor_enabled && user.favorite_food !== favoriteFood) {
      return res.status(401).json({ success: false, error: 'İki aşamalı doğrulama başarısız' });
    }
    
    res.json({ success: true, user: { id: user.id, username: user.username, displayName: user.display_name, avatar: user.avatar, theme: user.theme } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User profile
app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar, background, about, links FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false });
  res.json({ success: true, user });
});

app.post('/api/user/update', async (req, res) => {
  try {
    const { userId, displayName, about, links, background, avatar } = req.body;
    db.prepare('UPDATE users SET display_name = ?, about = ?, links = ?, background = ?, avatar = ? WHERE id = ?')
      .run(displayName, about, JSON.stringify(links), background, avatar, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
    
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) return res.status(401).json({ success: false, error: 'Eski şifre hatalı' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user/two-factor', (req, res) => {
  try {
    const { userId, enabled, favoriteFood } = req.body;
    db.prepare('UPDATE users SET two_factor_enabled = ?, favorite_food = ? WHERE id = ?')
      .run(enabled ? 1 : 0, favoriteFood || '', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user/theme', (req, res) => {
  try {
    const { userId, theme } = req.body;
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Friends
app.get('/api/friends/:userId', (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, f.status 
    FROM friends f 
    JOIN users u ON (f.friend_id = u.id) 
    WHERE f.user_id = ? AND f.status = 'accepted'
  `).all(req.params.userId);
  res.json({ success: true, friends });
});

app.post('/api/friends/add', (req, res) => {
  try {
    const { userId, friendUsername } = req.body;
    const friend = db.prepare('SELECT id FROM users WHERE username = ?').get(friendUsername);
    
    if (!friend) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    
    db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
      .run(userId, friend.id, 'pending');
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/friends/accept', (req, res) => {
  try {
    const { userId, friendId } = req.body;
    db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?')
      .run('accepted', friendId, userId);
    db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
      .run(userId, friendId, 'accepted');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/friends/requests/:userId', (req, res) => {
  const requests = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar 
    FROM friends f 
    JOIN users u ON (f.user_id = u.id) 
    WHERE f.friend_id = ? AND f.status = 'pending'
  `).all(req.params.userId);
  res.json({ success: true, requests });
});

// Blocks
app.post('/api/block', (req, res) => {
  try {
    const { userId, blockedId } = req.body;
    db.prepare('INSERT INTO blocks (user_id, blocked_id) VALUES (?, ?)').run(userId, blockedId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/unblock', (req, res) => {
  try {
    const { userId, blockedId } = req.body;
    db.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').run(userId, blockedId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/blocks/:userId', (req, res) => {
  const blocks = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar 
    FROM blocks b 
    JOIN users u ON (b.blocked_id = u.id) 
    WHERE b.user_id = ?
  `).all(req.params.userId);
  res.json({ success: true, blocks });
});

// Groups
app.post('/api/groups/create', (req, res) => {
  try {
    const { userId, name, avatar } = req.body;
    const result = db.prepare('INSERT INTO groups (name, avatar, created_by) VALUES (?, ?, ?)')
      .run(name, avatar, userId);
    db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, userId, 'admin');
    res.json({ success: true, groupId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/groups/:userId', (req, res) => {
  const groups = db.prepare(`
    SELECT g.id, g.name, g.avatar 
    FROM group_members gm 
    JOIN groups g ON (gm.group_id = g.id) 
    WHERE gm.user_id = ?
  `).all(req.params.userId);
  res.json({ success: true, groups });
});

// Messages
app.get('/api/messages/:userId/:friendId', (req, res) => {
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))
    ORDER BY created_at ASC
  `).all(req.params.userId, req.params.friendId, req.params.friendId, req.params.userId);
  
  res.json({ success: true, messages });
});

app.get('/api/messages/group/:groupId', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC')
    .all(req.params.groupId);
  res.json({ success: true, messages });
});

app.post('/api/messages/delete', (req, res) => {
  try {
    const { messageId, userId, deleteFor } = req.body;
    const message = db.prepare('SELECT deleted_for FROM messages WHERE id = ?').get(messageId);
    const deletedFor = JSON.parse(message.deleted_for || '[]');
    
    if (deleteFor === 'everyone') {
      db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    } else {
      deletedFor.push(userId);
      db.prepare('UPDATE messages SET deleted_for = ? WHERE id = ?')
        .run(JSON.stringify(deletedFor), messageId);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  res.json({ success: true, path: '/uploads/' + req.file.filename });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
  });
  
  socket.on('send_message', (data) => {
    const { fromUser, toUser, groupId, content, type, filePath } = data;
    
    const stmt = db.prepare('INSERT INTO messages (from_user, to_user, group_id, content, type, file_path) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(fromUser, toUser || null, groupId || null, content, type, filePath || null);
    
    const message = { id: result.lastInsertRowid, ...data, created_at: new Date().toISOString() };
    
    if (groupId) {
      io.to(`group_${groupId}`).emit('new_message', message);
    } else {
      io.to(`user_${toUser}`).emit('new_message', message);
      io.to(`user_${fromUser}`).emit('new_message', message);
    }
  });
  
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
