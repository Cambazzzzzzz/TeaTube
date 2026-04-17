const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./src/database');
const routes = require('./src/routes');
const adminRoutes = require('./src/routes-admin');
const musicRoutes = require('./src/routes-music');
const groupRoutes = require('./src/routes-groups');
const textPostRoutes = require('./src/routes-textposts');
const dcRoutes = require('./src/routes-dc');
const migrateAdminPassword = require('./migrate-admin-password');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 3456;

// Admin şifresini güncelle (sadece ilk başlatmada)
migrateAdminPassword().catch(err => console.error('Migration error:', err));

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));

// API route'larÄ±na UTF-8 charset ekle
app.use('/api', (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return origJson(data);
  };
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);
app.use('/api', adminRoutes);
app.use('/api', musicRoutes);
app.use('/api', groupRoutes);
app.use('/api', textPostRoutes);
app.use('/api', dcRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// DC (DemlikChat) - Countdown page
app.get('/dc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'countdown.html'));
});

// DC Discord page
app.get('/dc/discord', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discord.html'));
});

// Admin giriş sayfası
app.get('/administans', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'administans.html'));
});

// Admin paneli
app.get('/bcics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bcics.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadÄ±' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Sunucu hatasÄ±', message: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`
âââââââââââââââââââââââââââââââââââââââââ
â         TeaTube Server v1.0          â
â ââââââââââââââââââââââââââââââââââââââââ£
â  Port: ${PORT}                         â
â  URL: http://localhost:${PORT}        â
â  Status: â ÃalÄ±ÅÄ±yor                 â
âââââââââââââââââââââââââââââââââââââââââ
  `);
});

// Optimized timeouts for Railway
server.timeout = 120000; // 2 dakika
server.keepAliveTimeout = 65000; // 65 saniye
server.headersTimeout = 66000; // 66 saniye

// ==================== SOCKET.IO FOR DEMLIKCHAT ====================

const dcUsers = new Map(); // userId -> socketId
const voiceChannels = new Map(); // channelId -> Set of userIds

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  
  // User joins
  socket.on('join', (userId) => {
    socket.userId = userId;
    dcUsers.set(userId, socket.id);
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined`);
  });
  
  // Send message
  socket.on('send_message', (data) => {
    const { userId, username, avatar, server, channel, content } = data;
    
    // Save to database
    try {
      const stmt = db.db.prepare('INSERT INTO dc_messages (server_id, channel_id, user_id, content) VALUES (?, ?, ?, ?)');
      const result = stmt.run(server === 'home' ? 0 : server, channel, userId, content);
      
      const message = {
        id: result.lastInsertRowid,
        userId,
        username,
        avatar,
        server,
        channel,
        content,
        created_at: new Date().toISOString()
      };
      
      // Broadcast to all users in the server
      io.emit('new_message', message);
    } catch (err) {
      console.error('Send message error:', err);
    }
  });
  
  // Join voice channel
  socket.on('join_voice', (data) => {
    const { userId, channel } = data;
    
    if (!voiceChannels.has(channel)) {
      voiceChannels.set(channel, new Set());
    }
    
    voiceChannels.get(channel).add(userId);
    socket.join(`voice_${channel}`);
    
    // Notify others in the channel
    io.to(`voice_${channel}`).emit('user_joined_voice', {
      channel,
      userId,
      users: Array.from(voiceChannels.get(channel))
    });
    
    console.log(`User ${userId} joined voice channel ${channel}`);
  });
  
  // Leave voice channel
  socket.on('leave_voice', (data) => {
    const { userId, channel } = data;
    
    if (voiceChannels.has(channel)) {
      voiceChannels.get(channel).delete(userId);
      
      if (voiceChannels.get(channel).size === 0) {
        voiceChannels.delete(channel);
      }
    }
    
    socket.leave(`voice_${channel}`);
    
    // Notify others in the channel
    io.to(`voice_${channel}`).emit('user_left_voice', {
      channel,
      userId,
      users: voiceChannels.has(channel) ? Array.from(voiceChannels.get(channel)) : []
    });
    
    console.log(`User ${userId} left voice channel ${channel}`);
  });
  
  // Voice signaling (for WebRTC)
  socket.on('voice_signal', (data) => {
    const { to, signal } = data;
    const toSocketId = dcUsers.get(to);
    
    if (toSocketId) {
      io.to(toSocketId).emit('voice_signal', {
        from: socket.userId,
        signal
      });
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      dcUsers.delete(socket.userId);
      
      // Remove from all voice channels
      voiceChannels.forEach((users, channel) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(`voice_${channel}`).emit('user_left_voice', {
            channel,
            userId: socket.userId,
            users: Array.from(users)
          });
        }
      });
    }
    
    console.log('Socket disconnected:', socket.id);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alÄ±ndÄ±, sunucu kapatÄ±lÄ±yor...');
  io.close();
  server.close(() => {
    console.log('Sunucu kapatÄ±ldÄ±');
    process.exit(0);
  });
});

module.exports = app;

