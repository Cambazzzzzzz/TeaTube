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

// Admin �ifresini g�ncelle (sadece ilk ba�latmada)
migrateAdminPassword().catch(err => console.error('Migration error:', err));

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));
app.use('/dc-uploads', express.static('data/dc-uploads'));

// API route'larına UTF-8 charset ekle
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

// Admin giri� sayfas�
app.get('/administans', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'administans.html'));
});

// Admin paneli
app.get('/bcics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bcics.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

server.listen(PORT, () => {
  console.log(`
�??�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��??
�??         TeaTube Server v1.0          �??
�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?�
�??  Port: ${PORT}                         �??
�??  URL: http://localhost:${PORT}        �??
�??  Status: �?? �?alı�?ıyor                 �??
�??�?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?��?�
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
    const { userId, username, avatar, server, channel, content, fileUrl, fileType, fileName } = data;
    
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
        fileUrl,
        fileType,
        fileName,
        created_at: new Date().toISOString()
      };
      
      // Broadcast to all users in the server
      io.emit('new_message', message);
    } catch (err) {
      console.error('Send message error:', err);
    }
  });
  
  // Send DM
  socket.on('send_dm', (data) => {
    const { fromUser, toUser, content, fileUrl, fileType, fileName } = data;
    
    try {
      const stmt = db.db.prepare('INSERT INTO dc_dm_messages (from_user, to_user, content, file_url, file_type, file_name) VALUES (?, ?, ?, ?, ?, ?)');
      const result = stmt.run(fromUser, toUser, content, fileUrl || null, fileType || null, fileName || null);
      
      const message = {
        id: result.lastInsertRowid,
        from_user: fromUser,
        to_user: toUser,
        content,
        fileUrl,
        fileType,
        fileName,
        created_at: new Date().toISOString()
      };
      
      // Send to both users
      const toSocketId = dcUsers.get(toUser);
      if (toSocketId) {
        io.to(toSocketId).emit('new_dm', message);
      }
      io.to(socket.id).emit('new_dm', message);
    } catch (err) {
      console.error('Send DM error:', err);
    }
  });
  
  // Message deleted
  socket.on('message_deleted', (data) => {
    io.emit('message_deleted', data);
  });
  
  // Typing indicator
  socket.on('typing_start', (data) => {
    const { channel, username } = data;
    socket.to(`channel_${channel}`).emit('user_typing', { channel, username });
  });
  
  socket.on('typing_stop', (data) => {
    const { channel, username } = data;
    socket.to(`channel_${channel}`).emit('user_stopped_typing', { channel, username });
  });
  
  // Join voice channel
  socket.on('join_voice', (data) => {
    const { userId, username, serverId, channelId } = data;
    const voiceRoomId = `voice_${serverId}_${channelId}`;
    
    if (!voiceChannels.has(voiceRoomId)) {
      voiceChannels.set(voiceRoomId, new Map());
    }
    
    voiceChannels.get(voiceRoomId).set(userId, { username, socketId: socket.id });
    socket.join(voiceRoomId);
    socket.voiceChannel = voiceRoomId;
    
    console.log(`🎤 User ${username} joined voice channel ${channelId}`);
    
    // Get existing users in channel
    const existingUsers = Array.from(voiceChannels.get(voiceRoomId).entries())
      .filter(([id]) => id !== userId)
      .map(([id, data]) => ({ userId: id, username: data.username }));
    
    // Send existing users to new user
    socket.emit('voice_users', { users: existingUsers });
    
    // Notify others about new user
    socket.to(voiceRoomId).emit('user_joined_voice', {
      userId,
      username,
      channelId
    });
  });
  
  // Leave voice channel
  socket.on('leave_voice', (data) => {
    const { userId, channelId } = data;
    
    if (socket.voiceChannel) {
      const voiceRoomId = socket.voiceChannel;
      
      if (voiceChannels.has(voiceRoomId)) {
        const userData = voiceChannels.get(voiceRoomId).get(userId);
        voiceChannels.get(voiceRoomId).delete(userId);
        
        if (voiceChannels.get(voiceRoomId).size === 0) {
          voiceChannels.delete(voiceRoomId);
        }
        
        // Notify others
        socket.to(voiceRoomId).emit('user_left_voice', {
          userId,
          username: userData?.username,
          channelId
        });
        
        console.log(`🔌 User ${userData?.username} left voice channel ${channelId}`);
      }
      
      socket.leave(voiceRoomId);
      socket.voiceChannel = null;
    }
  });
  
  // Voice signaling (for WebRTC)
  socket.on('voice_signal', (data) => {
    const { to, from, signal, channelId } = data;
    const toSocketId = dcUsers.get(to);
    
    if (toSocketId) {
      // Get sender username
      let username = 'Unknown';
      if (socket.voiceChannel && voiceChannels.has(socket.voiceChannel)) {
        const userData = voiceChannels.get(socket.voiceChannel).get(from);
        if (userData) username = userData.username;
      }
      
      io.to(toSocketId).emit('voice_signal', {
        from,
        signal,
        username,
        channelId
      });
      
      console.log(`📡 Voice signal: ${username} -> User ${to}`);
    }
  });
  
  // Voice mute status
  socket.on('voice_mute_status', (data) => {
    const { userId, channelId, muted } = data;
    
    if (socket.voiceChannel) {
      socket.to(socket.voiceChannel).emit('user_mute_status', {
        userId,
        muted
      });
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      dcUsers.delete(socket.userId);
      
      // Remove from voice channel if connected
      if (socket.voiceChannel && voiceChannels.has(socket.voiceChannel)) {
        const voiceRoom = voiceChannels.get(socket.voiceChannel);
        const userData = voiceRoom.get(socket.userId);
        voiceRoom.delete(socket.userId);
        
        if (voiceRoom.size === 0) {
          voiceChannels.delete(socket.voiceChannel);
        }
        
        // Notify others
        socket.to(socket.voiceChannel).emit('user_left_voice', {
          userId: socket.userId,
          username: userData?.username
        });
      }
    }
    
    console.log('Socket disconnected:', socket.id);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  io.close();
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

module.exports = app;

