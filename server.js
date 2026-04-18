const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const db = require('./src/database');
const routes = require('./src/routes');
const adminRoutes = require('./src/routes-admin');
const musicRoutes = require('./src/routes-music');
const groupRoutes = require('./src/routes-groups');
const textPostRoutes = require('./src/routes-textposts');
const migrateAdminPassword = require('./migrate-admin-password');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3456;

// ==================== SOCKET.IO - SESLI ARAMA ====================
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// userId -> socketId haritası
const onlineUsers = new Map();
// groupId -> Set<{ userId, socketId, nickname, photo, isMuted }>
const voiceRooms = new Map();

io.on('connection', (socket) => {
  console.log('Socket bağlandı:', socket.id);

  // Kullanıcı kaydı
  socket.on('register', (userId) => {
    if (!userId) return;
    onlineUsers.set(String(userId), socket.id);
    socket.userId = String(userId);
    console.log(`Kullanıcı ${userId} kayıtlı, socket: ${socket.id}`);
  });

  // ==================== 1-1 SESLI ARAMA ====================

  socket.on('call:start', (data) => {
    const receiverSocketId = onlineUsers.get(String(data.receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:incoming', {
        callerId: data.callerId,
        callerName: data.callerName,
        callerPhoto: data.callerPhoto,
        offer: data.offer
      });
    } else {
      socket.emit('call:unavailable', { receiverId: data.receiverId });
    }
  });

  socket.on('call:accept', (data) => {
    const callerSocketId = onlineUsers.get(String(data.callerId));
    if (callerSocketId) io.to(callerSocketId).emit('call:accepted', { answer: data.answer });
  });

  socket.on('call:reject', (data) => {
    const callerSocketId = onlineUsers.get(String(data.callerId));
    if (callerSocketId) io.to(callerSocketId).emit('call:rejected', { reason: data.reason });
  });

  socket.on('call:end', (data) => {
    const targetSocketId = onlineUsers.get(String(data.targetId));
    if (targetSocketId) io.to(targetSocketId).emit('call:ended');
  });

  socket.on('call:ice', (data) => {
    const targetSocketId = onlineUsers.get(String(data.targetId));
    if (targetSocketId) {
      console.log('ICE candidate iletiliyor:', data.targetId);
      io.to(targetSocketId).emit('call:ice', { candidate: data.candidate });
    }
  });

  // ==================== GRUP SESLI ODA ====================

  // Odaya katıl
  socket.on('voice:join', (data) => {
    // data: { groupId, userId, nickname, photo }
    const roomKey = String(data.groupId);
    if (!voiceRooms.has(roomKey)) voiceRooms.set(roomKey, new Map());
    const room = voiceRooms.get(roomKey);

    // Odadaki mevcut üyeleri yeni katılana gönder
    const existingMembers = Array.from(room.values());
    socket.emit('voice:room-members', existingMembers);

    // Yeni üyeyi odaya ekle
    room.set(String(data.userId), {
      userId: String(data.userId),
      socketId: socket.id,
      nickname: data.nickname,
      photo: data.photo,
      isMuted: false
    });

    socket.voiceRoom = roomKey;
    socket.voiceUserId = String(data.userId);
    socket.join('voice_' + roomKey);

    // Odadaki herkese yeni üyeyi bildir
    socket.to('voice_' + roomKey).emit('voice:user-joined', {
      userId: String(data.userId),
      socketId: socket.id,
      nickname: data.nickname,
      photo: data.photo,
      isMuted: false
    });

    console.log(`Kullanıcı ${data.userId} ses odasına katıldı: ${roomKey}`);
  });

  // WebRTC offer (yeni katılan -> mevcut üye)
  socket.on('voice:offer', (data) => {
    // data: { targetUserId, offer, fromUserId }
    const targetSocketId = onlineUsers.get(String(data.targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit('voice:offer', {
        fromUserId: data.fromUserId,
        fromSocketId: socket.id,
        offer: data.offer
      });
    }
  });

  // WebRTC answer
  socket.on('voice:answer', (data) => {
    // data: { targetUserId, answer, fromUserId }
    const targetSocketId = onlineUsers.get(String(data.targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit('voice:answer', {
        fromUserId: data.fromUserId,
        answer: data.answer
      });
    }
  });

  // ICE candidate (grup)
  socket.on('voice:ice', (data) => {
    // data: { targetUserId, candidate, fromUserId }
    const targetSocketId = onlineUsers.get(String(data.targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit('voice:ice', {
        fromUserId: data.fromUserId,
        candidate: data.candidate
      });
    }
  });

  // Mikrofon durumu değişti
  socket.on('voice:mute-toggle', (data) => {
    // data: { groupId, userId, isMuted }
    const roomKey = String(data.groupId);
    const room = voiceRooms.get(roomKey);
    if (room && room.has(String(data.userId))) {
      const member = room.get(String(data.userId));
      member.isMuted = data.isMuted;
    }
    socket.to('voice_' + roomKey).emit('voice:mute-changed', {
      userId: String(data.userId),
      isMuted: data.isMuted
    });
  });

  // Konuşma durumu değişti
  socket.on('voice:speaking-changed', (data) => {
    // data: { groupId, userId, isSpeaking }
    const roomKey = String(data.groupId);
    const room = voiceRooms.get(roomKey);
    if (room && room.has(String(data.userId))) {
      const member = room.get(String(data.userId));
      member.isSpeaking = data.isSpeaking;
    }
    socket.to('voice_' + roomKey).emit('voice:speaking-changed', {
      userId: String(data.userId),
      isSpeaking: data.isSpeaking
    });
  });

  // Odadan ayrıl
  socket.on('voice:leave', (data) => {
    const roomKey = String(data.groupId);
    const room = voiceRooms.get(roomKey);
    if (room) {
      room.delete(String(data.userId));
      if (room.size === 0) voiceRooms.delete(roomKey);
    }
    socket.leave('voice_' + roomKey);
    socket.to('voice_' + roomKey).emit('voice:user-left', { userId: String(data.userId) });
    socket.voiceRoom = null;
    socket.voiceUserId = null;
  });

  // Aktif ses odası üyelerini getir
  socket.on('voice:get-members', (data) => {
    const room = voiceRooms.get(String(data.groupId));
    socket.emit('voice:room-members', room ? Array.from(room.values()) : []);
  });

  // Bağlantı kesildi
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log(`Kullanıcı ${socket.userId} çevrimdışı`);
    }
    // Ses odasından otomatik çıkar
    if (socket.voiceRoom && socket.voiceUserId) {
      const room = voiceRooms.get(socket.voiceRoom);
      if (room) {
        room.delete(socket.voiceUserId);
        if (room.size === 0) voiceRooms.delete(socket.voiceRoom);
      }
      socket.to('voice_' + socket.voiceRoom).emit('voice:user-left', { userId: socket.voiceUserId });
    }
  });
});

// Admin �ifresini g�ncelle (sadece ilk ba�latmada)
migrateAdminPassword().catch(err => console.error('Migration error:', err));

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static('public'));


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

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

module.exports = app;

