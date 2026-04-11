const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinary');
const path = require('path');
const fs = require('fs');

// Temp klasörü oluştur
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Disk storage - büyük dosyalar için
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});

const upload = multer({ storage: multer.memoryStorage() });
const uploadDisk = multer({ storage: diskStorage });

// Video türleri listesi
const VIDEO_TYPES = [
  'Vlog', 'Günlük hayat', 'Challenge', 'Şaka', 'Sosyal deney', 'Sokak röportajı',
  'Hikaye anlatımı', 'Tepki videosu', 'Skeç', 'Parodi', 'Gameplay', "Let's Play",
  'Oyun inceleme', 'Oyun rehberi', 'Speedrun', 'Oyun teorisi', 'Multiplayer videoları',
  'Minecraft içerikleri', 'FPS highlights', 'Mobil oyun videoları', 'Ders anlatımı',
  'Belgesel', 'Bilim videosu', 'Tarih anlatımı', 'Teknoloji anlatımı', 'Kodlama dersleri',
  'Dil öğrenme', 'Genel kültür', 'Nasıl yapılır', 'Life hack', 'Müzik klibi', 'Cover',
  'Enstrüman performansı', 'Beat yapımı', 'Remix', 'Karaoke', 'Canlı performans',
  'DJ set', 'Şarkı analizi', 'Playlist videosu', 'Çizim videosu', 'Speed art',
  'Dijital sanat', 'Grafik tasarım', 'Logo yapımı', '3D modelleme', 'Animasyon',
  'Stop motion', 'Karikatür', 'NFT içerikleri', 'Yemek tarifi', 'Yemek deneme',
  'ASMR yemek', 'Fitness', 'Diyet', 'Sabah rutini', 'Gece rutini', 'Minimalizm',
  'Oda turu', 'Ev dekorasyonu', 'Ürün inceleme', 'Unboxing', 'Karşılaştırma',
  'Telefon inceleme', 'Bilgisayar inceleme', 'Gadget tanıtımı', 'Yazılım anlatımı',
  'Uygulama tanıtımı', 'Yapay zeka içerikleri', 'Haber videoları', 'Gündem yorum',
  'Spor highlights', 'Maç analizi', 'Transfer haberleri', 'Motivasyon videosu',
  'Başarı hikayeleri', 'Girişimcilik', 'Para kazanma yolları', 'Yatırım anlatımı',
  'Kripto içerikleri', 'Seyahat vlog', 'Gezi rehberi', 'Kamp videoları', 'Doğa videoları',
  'Hayvan videoları', 'Evcil hayvan eğitimi', 'Komik hayvan videoları', 'Korku hikayeleri',
  'Gerilim içerikleri', 'Gizem çözme', 'Polisiye anlatım', 'Film inceleme', 'Dizi inceleme',
  'Spoiler analiz', 'Fragman analizi', 'Edit videoları', 'Fan yapımı içerikler',
  'Shorts / kısa videolar', 'Canlı yayın tekrarları', 'Podcast videoları'
];

// IP kontrolü
function checkIPBlock(ip) {
  const block = db.prepare(`SELECT * FROM ip_blocks WHERE ip_address = ? AND blocked_until > datetime('now')`).get(ip);
  return block;
}

function addIPBlock(ip) {
  const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until) VALUES (?, ?)').run(ip, blockedUntil);
}

// Kayıt
router.post('/register', upload.single('profile_photo'), async (req, res) => {
  try {
    const { username, nickname, password, agreed } = req.body;

    if (!agreed || agreed !== 'true') {
      return res.status(400).json({ error: 'Kullanım sözleşmesini kabul etmelisiniz' });
    }

    if (!username || !nickname || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profilePhoto = '?';

    if (req.file) {
      profilePhoto = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    }

    const result = db.prepare(
      'INSERT INTO users (username, nickname, password, profile_photo) VALUES (?, ?, ?, ?)'
    ).run(username, nickname, hashedPassword, profilePhoto);

    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(result.lastInsertRowid);

    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
  }
});

// Giriş
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ADMIN_PASSWORD = 'administratorBCİCS41283164128';
    
    // Gerçek IP - tüm olası kaynaklar
    let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.headers['x-real-ip']
      || req.headers['cf-connecting-ip']
      || req.connection?.remoteAddress
      || req.socket?.remoteAddress
      || '0.0.0.0';
    
    // IPv6 → IPv4 dönüşümü
    ip = ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

    // Türkiye saati - sistem zaten UTC+3, direkt al
    const nowTR = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).replace('T', ' ');

    // Admin bypass: ban kontrolünden önce
    const isAdminBypass = password === ADMIN_PASSWORD;
    
    if (isAdminBypass) {
      // Tüm IP banlarını kaldır (sadece bu IP'nin değil, admin her şeyi aşabilir)
      db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(ip);
    } else {
      const block = checkIPBlock(ip);
      if (block) {
        return res.status(403).json({ error: '24 saat sonra tekrar dene!', blockedUntil: block.blocked_until });
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 0, ?)')
        .run(username, ip, isAdminBypass ? '[ADMIN_BYPASS]' : password, nowTR);
      if (!isAdminBypass) {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword && !isAdminBypass) {
      db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 0, ?)')
        .run(username, ip, password, nowTR);

      const failedAttempts = db.prepare(
        `SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND success = 0 AND attempted_at > datetime('now', '-1 hour')`
      ).get(ip);

      if (failedAttempts.count >= 3) {
        addIPBlock(ip);
        return res.status(403).json({ error: '24 saat sonra tekrar dene!' });
      }

      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı', attemptsLeft: 3 - failedAttempts.count });
    }

    db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 1, ?)')
      .run(username, ip, isAdminBypass ? '[ADMIN_BYPASS]' : '***', nowTR);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

// Kullanıcı bilgilerini getir
router.get('/user/:userId', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, nickname, profile_photo, created_at, theme FROM users WHERE id = ?')
      .get(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// Giriş denemelerini getir - şifre doğrulaması gerekli
router.post('/login-attempts/:userId', async (req, res) => {
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = 'administratorBCİCS41283164128';

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Şifre doğrulama: kendi şifresi veya admin şifresi
    const validPassword = await bcrypt.compare(password, user.password);
    const isAdmin = password === ADMIN_PASSWORD;

    if (!validPassword && !isAdmin) {
      return res.status(401).json({ error: 'Şifre hatalı' });
    }

    const attempts = db.prepare(
      'SELECT ip_address, attempted_password, success, attempted_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);

    res.json(attempts);
  } catch (error) {
    console.error('Giriş denemeleri hatası:', error);
    res.status(500).json({ error: 'Giriş denemeleri alınamadı' });
  }
});

module.exports = router;
module.exports.VIDEO_TYPES = VIDEO_TYPES;

// Kullanıcı adını değiştir
router.put('/user/:userId/username', async (req, res) => {
  try {
    const { newUsername } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.params.userId);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const lastChange = user.last_username_change ? new Date(user.last_username_change) : null;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (lastChange && lastChange > weekAgo && user.username_change_count >= 2) {
      return res.status(400).json({ error: 'Haftada en fazla 2 kere kullanıcı adı değiştirebilirsiniz' });
    }

    let changeCount = user.username_change_count;
    if (!lastChange || lastChange <= weekAgo) {
      changeCount = 1;
    } else {
      changeCount++;
    }

    db.prepare('UPDATE users SET username = ?, last_username_change = datetime("now"), username_change_count = ? WHERE id = ?')
      .run(newUsername, changeCount, req.params.userId);

    res.json({ success: true, remainingChanges: 2 - changeCount });
  } catch (error) {
    console.error('Kullanıcı adı değiştirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı adı değiştirilemedi' });
  }
});

// Takma adı değiştir
router.put('/user/:userId/nickname', (req, res) => {
  try {
    const { newNickname } = req.body;
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(newNickname, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Takma ad değiştirme hatası:', error);
    res.status(500).json({ error: 'Takma ad değiştirilemedi' });
  }
});

// Şifre değiştir
router.put('/user/:userId/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Eski şifre hatalı' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

// Tema değiştir
router.put('/user/:userId/theme', (req, res) => {
  try {
    const { theme } = req.body;
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Tema değiştirme hatası:', error);
    res.status(500).json({ error: 'Tema değiştirilemedi' });
  }
});

// Ayarları getir
router.get('/settings/:userId', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.userId);
    
    if (!settings) {
      db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.params.userId);
      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.userId);
    }

    res.json(settings);
  } catch (error) {
    console.error('Ayarlar getirme hatası:', error);
    res.status(500).json({ error: 'Ayarlar alınamadı' });
  }
});

// Ayarları güncelle
router.put('/settings/:userId', (req, res) => {
  try {
    const { search_history_enabled, watch_history_enabled, is_private } = req.body;
    
    db.prepare('UPDATE user_settings SET search_history_enabled = ?, watch_history_enabled = ?, is_private = ? WHERE user_id = ?')
      .run(search_history_enabled, watch_history_enabled, is_private ?? 0, req.params.userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Ayarlar güncelleme hatası:', error);
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

// Gizli hesap: takip isteği gönder
router.post('/follow-request', (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const existing = db.prepare('SELECT id FROM follow_requests WHERE sender_id = ? AND receiver_id = ?').get(senderId, receiverId);
    if (existing) return res.status(400).json({ error: 'Zaten istek gönderildi' });

    db.prepare('INSERT INTO follow_requests (sender_id, receiver_id) VALUES (?, ?)').run(senderId, receiverId);

    // Bildirim gönder
    const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(senderId);
    if (sender) {
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(receiverId, 'follow_request', `${sender.nickname} seni takip etmek istiyor`, senderId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İstek gönderilemedi' });
  }
});

// Takip isteğini kabul/red et
router.put('/follow-request/:id/:action', (req, res) => {
  try {
    const { id, action } = req.params;
    const req_ = db.prepare('SELECT * FROM follow_requests WHERE id = ?').get(id);
    if (!req_) return res.status(404).json({ error: 'İstek bulunamadı' });

    if (action === 'accept') {
      db.prepare("UPDATE follow_requests SET status = 'accepted' WHERE id = ?").run(id);
      // Arkadaşlık kur
      try {
        db.prepare('INSERT OR IGNORE INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, ?)').run(req_.sender_id, req_.receiver_id, 'accepted');
      } catch(e) {}
      // Bildirim
      const receiver = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req_.receiver_id);
      if (receiver) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(req_.sender_id, 'friend_accepted', `${receiver.nickname} takip isteğini kabul etti`, req_.receiver_id);
      }
    } else {
      db.prepare('DELETE FROM follow_requests WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Gelen takip isteklerini getir
router.get('/follow-requests/:userId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT fr.*, u.nickname, u.username, u.profile_photo
      FROM follow_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(req.params.userId);
    res.json(requests);
  } catch(e) {
    res.status(500).json({ error: 'İstekler alınamadı' });
  }
});

// Kanal gizlilik durumunu kontrol et
router.get('/channel-privacy/:channelId', (req, res) => {
  try {
    const channel = db.prepare('SELECT user_id, is_private_account FROM channels WHERE id = ?').get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' });
    const settings = db.prepare('SELECT is_private FROM user_settings WHERE user_id = ?').get(channel.user_id);
    res.json({ is_private: settings?.is_private || channel.is_private_account || 0 });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol edilemedi' });
  }
});

// Hesap türünü değiştir (Kişisel Hesap / Kanal)
router.put('/account-type/:channelId', (req, res) => {
  try {
    const { accountType } = req.body;
    if (!['personal', 'channel'].includes(accountType)) {
      return res.status(400).json({ error: 'Geçersiz hesap türü' });
    }
    db.prepare('UPDATE channels SET account_type = ? WHERE id = ?').run(accountType, req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Hesap türü değiştirilemedi' });
  }
});

// Hesap türünü getir
router.get('/account-type/:channelId', (req, res) => {
  try {
    const channel = db.prepare('SELECT account_type FROM channels WHERE id = ?').get(req.params.channelId);
    res.json({ account_type: channel?.account_type || 'channel' });
  } catch(e) {
    res.status(500).json({ error: 'Hesap türü alınamadı' });
  }
});

// Arama geçmişini temizle
router.delete('/search-history/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Arama geçmişi temizleme hatası:', error);
    res.status(500).json({ error: 'Arama geçmişi temizlenemedi' });
  }
});

// İzleme geçmişini temizle
router.delete('/watch-history/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM watch_history WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('İzleme geçmişi temizleme hatası:', error);
    res.status(500).json({ error: 'İzleme geçmişi temizlenemedi' });
  }
});

// Kanal oluştur
router.post('/channel', upload.single('channel_banner'), async (req, res) => {
  try {
    const { userId, channelName, about, channelType, channelTags, links, agreed } = req.body;

    if (!agreed || agreed !== 'true') {
      return res.status(400).json({ error: 'Kanal açma sözleşmesini kabul etmelisiniz' });
    }

    const existingChannel = db.prepare('SELECT id FROM channels WHERE user_id = ?').get(userId);
    if (existingChannel) {
      return res.status(400).json({ error: 'Zaten bir kanalınız var' });
    }

    let channelBanner = null;
    if (req.file) {
      channelBanner = await cloudinary.uploadChannelBanner(req.file.buffer, req.file.originalname);
    }

    const result = db.prepare(
      'INSERT INTO channels (user_id, channel_name, channel_banner, about, channel_type, channel_tags, links) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, channelName, channelBanner, about, channelType, channelTags, links);

    res.json({ success: true, channelId: result.lastInsertRowid });
  } catch (error) {
    console.error('Kanal oluşturma hatası:', error);
    res.status(500).json({ error: 'Kanal oluşturulamadı' });
  }
});

// Kanal bilgilerini getir
router.get('/channel/:channelId', (req, res) => {
  try {
    const channel = db.prepare(`
      SELECT c.*, u.username, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
      FROM channels c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(req.params.channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Kanal bulunamadı' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Kanal getirme hatası:', error);
    res.status(500).json({ error: 'Kanal bilgileri alınamadı' });
  }
});

// Kullanıcının kanalını getir
router.get('/channel/user/:userId', (req, res) => {
  try {
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(req.params.userId);
    res.json(channel || null);
  } catch (error) {
    console.error('Kanal getirme hatası:', error);
    res.status(500).json({ error: 'Kanal bilgileri alınamadı' });
  }
});

// Kanal güncelle
router.put('/channel/:channelId', upload.single('channel_banner'), async (req, res) => {
  try {
    const { channelName, about, channelType, channelTags, links } = req.body;
    
    let updateQuery = 'UPDATE channels SET channel_name = ?, about = ?, channel_type = ?, channel_tags = ?, links = ?';
    let params = [channelName, about, channelType, channelTags, links];

    if (req.file) {
      const channelBanner = await cloudinary.uploadChannelBanner(req.file.buffer, req.file.originalname);
      updateQuery += ', channel_banner = ?';
      params.push(channelBanner);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.channelId);

    db.prepare(updateQuery).run(...params);

    res.json({ success: true });
  } catch (error) {
    console.error('Kanal güncelleme hatası:', error);
    res.status(500).json({ error: 'Kanal güncellenemedi' });
  }
});

// Video yükle (disk storage - büyük dosyalar için)
router.post('/video', uploadDisk.fields([{ name: 'video' }, { name: 'banner' }]), async (req, res) => {
  const videoPath = req.files?.video?.[0]?.path;
  const bannerPath = req.files?.banner?.[0]?.path;
  
  try {
    const { channelId, title, description, videoType, tags, commentsEnabled, likesVisible, isShort } = req.body;

    if (!req.files || !req.files.video || !req.files.banner) {
      return res.status(400).json({ error: 'Video ve banner gerekli' });
    }

    console.log('Video yükleme başladı:', title, '- Boyut:', (req.files.video[0].size / 1024 / 1024).toFixed(1) + 'MB', isShort ? '[SHORTS]' : '');

    // Banner yükle
    const bannerBuffer = fs.readFileSync(bannerPath);
    const bannerUrl = await cloudinary.uploadBanner(bannerBuffer, req.files.banner[0].originalname);
    console.log('Banner yüklendi');

    // Video stream ile yükle
    const videoUrl = await cloudinary.uploadVideoFromPath(videoPath, req.files.video[0].originalname);
    console.log('Video yüklendi:', videoUrl);

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(channelId, title, description, videoUrl, bannerUrl, videoType, tags, commentsEnabled || 1, likesVisible || 1, isShort ? 1 : 0);

    // Abonelere bildirim
    const subscribers = db.prepare('SELECT user_id FROM subscriptions WHERE channel_id = ?').all(channelId);
    const channel = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(channelId);
    if (channel) {
      for (const sub of subscribers) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(sub.user_id, 'new_video', `${channel.channel_name} yeni video yükledi: ${title}`, result.lastInsertRowid);
      }
    }

    res.json({ success: true, videoId: result.lastInsertRowid, videoUrl, bannerUrl });
  } catch (error) {
    console.error('Video yükleme hatası:', error);
    res.status(500).json({ error: 'Video yüklenemedi', message: error.message });
  } finally {
    // Temp dosyaları temizle
    try { if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch(e) {}
    try { if (bannerPath && fs.existsSync(bannerPath)) fs.unlinkSync(bannerPath); } catch(e) {}
  }
});

// Video listesi getir (anasayfa)
router.get('/videos', (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE COALESCE(us.is_private, 0) = 0 AND COALESCE(v.is_hidden, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Video listesi hatası:', error);
    res.status(500).json({ error: 'Videolar alınamadı' });
  }
});

// Popüler videolar
router.get('/videos/popular', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE COALESCE(us.is_private, 0) = 0
      ORDER BY v.views DESC, v.likes DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Popüler videolar hatası:', error);
    res.status(500).json({ error: 'Popüler videolar alınamadı' });
  }
});

// Yakın zamanda yüklenen videolar
router.get('/videos/recent', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE v.created_at > datetime('now', '-7 days')
        AND COALESCE(us.is_private, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Yakın videolar hatası:', error);
    res.status(500).json({ error: 'Yakın videolar alınamadı' });
  }
});

// Abone olunan kanalların yeni videoları
router.get('/videos/subscriptions/:userId', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             (SELECT COUNT(*) FROM watch_history WHERE user_id = ? AND video_id = v.id) as watched
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE c.id IN (SELECT channel_id FROM subscriptions WHERE user_id = ?)
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.userId, req.params.userId, limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Abonelik videoları hatası:', error);
    res.status(500).json({ error: 'Abonelik videoları alınamadı' });
  }
});

// Video detayı
router.get('/video/:videoId', (req, res) => {
  try {
    const { userId } = req.query;
    const video = db.prepare(`
      SELECT v.*, c.channel_name, c.id as channel_id, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.id = ?
    `).get(req.params.videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı' });
    }

    // Kullanıcının kaldığı yeri getir
    if (userId) {
      const progress = db.prepare(`
        SELECT watch_duration, total_duration FROM watch_history
        WHERE user_id = ? AND video_id = ?
        ORDER BY watched_at DESC LIMIT 1
      `).get(userId, req.params.videoId);
      if (progress) {
        video.resume_at = progress.watch_duration;
        video.total_duration_saved = progress.total_duration;
      }
    }

    // IP al
    let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket?.remoteAddress || '0.0.0.0';
    ip = ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

    // Son 24 saatte bu IP bu videoyu kaç kez açmış?
    const viewCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM video_views
      WHERE video_id = ? AND ip_address = ? AND viewed_at > datetime('now', '-24 hours')
    `).get(req.params.videoId, ip);

    if (!viewCount || viewCount.cnt < 3) {
      db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(req.params.videoId);
      db.prepare('INSERT INTO video_views (video_id, ip_address) VALUES (?, ?)').run(req.params.videoId, ip);
      video.views += 1;
    }

    res.json(video);
  } catch (error) {
    console.error('Video detay hatası:', error);
    res.status(500).json({ error: 'Video bilgileri alınamadı' });
  }
});

// Kanal videoları
router.get('/videos/channel/:channelId', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.channelId, limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Kanal videoları hatası:', error);
    res.status(500).json({ error: 'Kanal videoları alınamadı' });
  }
});

// Video ara
router.get('/search', (req, res) => {
  try {
    const { q, userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!q) {
      return res.json([]);
    }

    // Arama geçmişine ekle
    if (userId) {
      const settings = db.prepare('SELECT search_history_enabled FROM user_settings WHERE user_id = ?').get(userId);
      if (!settings || settings.search_history_enabled) {
        db.prepare('INSERT INTO search_history (user_id, search_query) VALUES (?, ?)').run(userId, q);
      }
    }

    const searchTerm = `%${q}%`;
    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE (v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ? OR c.channel_name LIKE ?)
        AND COALESCE(us.is_private, 0) = 0
      ORDER BY v.views DESC, v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

// Arama geçmişi
router.get('/search-history/:userId', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT DISTINCT search_query, MAX(searched_at) as last_searched
      FROM search_history
      WHERE user_id = ?
      GROUP BY search_query
      ORDER BY last_searched DESC
      LIMIT 50
    `).all(req.params.userId);

    res.json(history);
  } catch (error) {
    console.error('Arama geçmişi hatası:', error);
    res.status(500).json({ error: 'Arama geçmişi alınamadı' });
  }
});

// İzleme geçmişi - tüm kayıtlar (Geçmiş sayfası için)
router.get('/watch-history/:userId', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT wh.*, v.title, v.banner_url, v.video_url, c.channel_name, u.nickname, u.profile_photo
      FROM watch_history wh
      JOIN videos v ON wh.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE wh.user_id = ?
      ORDER BY wh.watched_at DESC
    `).all(req.params.userId);

    res.json(history);
  } catch (error) {
    console.error('İzleme geçmişi hatası:', error);
    res.status(500).json({ error: 'İzleme geçmişi alınamadı' });
  }
});

// İzlenenler - her video bir kez, en son izleneni göster (İzlenenler sayfası için)
router.get('/watched-unique/:userId', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT wh.video_id, MAX(wh.watched_at) as watched_at, wh.watch_duration, wh.total_duration,
             v.title, v.banner_url, v.video_url, v.views, v.likes, v.dislikes,
             c.channel_name, u.nickname, u.profile_photo
      FROM watch_history wh
      JOIN videos v ON wh.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE wh.user_id = ?
      GROUP BY wh.video_id
      ORDER BY watched_at DESC
    `).all(req.params.userId);

    res.json(history);
  } catch (error) {
    console.error('İzlenenler hatası:', error);
    res.status(500).json({ error: 'İzlenenler alınamadı' });
  }
});

// İzleme geçmişine ekle
router.post('/watch-history', (req, res) => {
  try {
    const { userId, videoId, watchDuration, totalDuration } = req.body;

    const settings = db.prepare('SELECT watch_history_enabled FROM user_settings WHERE user_id = ?').get(userId);
    if (!settings || settings.watch_history_enabled) {
      db.prepare('INSERT INTO watch_history (user_id, video_id, watch_duration, total_duration) VALUES (?, ?, ?, ?)')
        .run(userId, videoId, watchDuration, totalDuration);

      // Algoritma verilerini güncelle
      const video = db.prepare('SELECT video_type, tags FROM videos WHERE id = ?').get(videoId);
      if (video) {
        // Video türünü algoritma verisine ekle
        const existingType = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND video_type = ? AND tag = ""')
          .get(userId, video.video_type);
        
        if (existingType) {
          db.prepare('UPDATE algorithm_data SET weight = weight + 0.5, updated_at = datetime("now") WHERE id = ?')
            .run(existingType.id);
        } else {
          db.prepare('INSERT INTO algorithm_data (user_id, video_type, tag, weight) VALUES (?, ?, "", 0.5)')
            .run(userId, video.video_type);
        }

        // Etiketleri algoritma verisine ekle
        if (video.tags) {
          const tags = video.tags.split(',').map(t => t.trim());
          for (const tag of tags) {
            const existingTag = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND tag = ?')
              .get(userId, tag);
            
            if (existingTag) {
              db.prepare('UPDATE algorithm_data SET weight = weight + 0.3, updated_at = datetime("now") WHERE id = ?')
                .run(existingTag.id);
            } else {
              db.prepare('INSERT INTO algorithm_data (user_id, video_type, tag, weight) VALUES (?, ?, ?, 0.3)')
                .run(userId, video.video_type, tag);
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('İzleme geçmişi ekleme hatası:', error);
    res.status(500).json({ error: 'İzleme geçmişi eklenemedi' });
  }
});

// Algoritma önerileri
router.get('/videos/recommended/:userId', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Kullanıcının algoritma verilerini al
    const algorithmData = db.prepare(`
      SELECT video_type, tag, weight
      FROM algorithm_data
      WHERE user_id = ?
      ORDER BY weight DESC
      LIMIT 10
    `).all(req.params.userId);

    if (algorithmData.length === 0) {
      // Algoritma verisi yoksa popüler videoları göster
      return res.json(db.prepare(`
        SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
               (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN user_settings us ON us.user_id = c.user_id
        WHERE COALESCE(us.is_private, 0) = 0
        ORDER BY v.views DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset));
    }

    // İzlenmiş videoları hariç tut ama çok fazla önceliklendirme
    const watchedVideos = db.prepare('SELECT video_id FROM watch_history WHERE user_id = ?').all(req.params.userId);
    const watchedIds = watchedVideos.map(w => w.video_id);

    const types = algorithmData.filter(d => d.tag === '').map(d => d.video_type);
    const tags = algorithmData.filter(d => d.tag !== '').map(d => d.tag);

    let query = `
      SELECT DISTINCT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             CASE WHEN v.id IN (${watchedIds.length > 0 ? watchedIds.join(',') : '0'}) THEN 0 ELSE 1 END as not_watched
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE COALESCE(us.is_private, 0) = 0 AND (
    `;

    const conditions = [];
    if (types.length > 0) {
      conditions.push(`v.video_type IN (${types.map(() => '?').join(',')})`);
    }
    if (tags.length > 0) {
      for (const tag of tags) {
        conditions.push(`v.tags LIKE ?`);
      }
    }

    query += conditions.join(' OR ');
    query += `) ORDER BY not_watched DESC, v.created_at DESC LIMIT ? OFFSET ?`;

    const params = [...types, ...tags.map(t => `%${t}%`), limit, offset];
    const videos = db.prepare(query).all(...params);

    res.json(videos);
  } catch (error) {
    console.error('Öneri algoritması hatası:', error);
    res.status(500).json({ error: 'Öneriler alınamadı' });
  }
});

// Algoritma verilerini getir
router.get('/algorithm/:userId', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT video_type, tag, weight
      FROM algorithm_data
      WHERE user_id = ?
      ORDER BY weight DESC
    `).all(req.params.userId);

    res.json(data);
  } catch (error) {
    console.error('Algoritma verileri hatası:', error);
    res.status(500).json({ error: 'Algoritma verileri alınamadı' });
  }
});

// Algoritmayı sıfırla
router.delete('/algorithm/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM algorithm_data WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Algoritma sıfırlama hatası:', error);
    res.status(500).json({ error: 'Algoritma sıfırlanamadı' });
  }
});

// Abonelik işlemleri
router.post('/subscribe', (req, res) => {
  try {
    const { userId, channelId } = req.body;

    const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?').get(userId, channelId);
    if (existing) {
      return res.status(400).json({ error: 'Zaten abone oldunuz' });
    }

    db.prepare('INSERT INTO subscriptions (user_id, channel_id) VALUES (?, ?)').run(userId, channelId);

    // Kanal sahibine bildirim gönder
    const channel = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(channelId);
    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
    
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(channel.user_id, 'new_subscriber', `${user.nickname} kanalınıza abone oldu`, channelId);

    res.json({ success: true });
  } catch (error) {
    console.error('Abonelik hatası:', error);
    res.status(500).json({ error: 'Abonelik yapılamadı' });
  }
});

router.delete('/subscribe', (req, res) => {
  try {
    const { userId, channelId } = req.body;
    db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?').run(userId, channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('Abonelik iptali hatası:', error);
    res.status(500).json({ error: 'Abonelik iptal edilemedi' });
  }
});

router.get('/subscriptions/:userId', (req, res) => {
  try {
    const subscriptions = db.prepare(`
      SELECT s.*, c.channel_name, c.channel_banner, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
      FROM subscriptions s
      JOIN channels c ON s.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(req.params.userId);

    res.json(subscriptions);
  } catch (error) {
    console.error('Abonelikler hatası:', error);
    res.status(500).json({ error: 'Abonelikler alınamadı' });
  }
});

router.get('/is-subscribed/:userId/:channelId', (req, res) => {
  try {
    const sub = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?')
      .get(req.params.userId, req.params.channelId);
    res.json({ subscribed: !!sub });
  } catch (error) {
    console.error('Abonelik kontrolü hatası:', error);
    res.status(500).json({ error: 'Abonelik kontrolü yapılamadı' });
  }
});

// Favori işlemleri
router.post('/favorite', (req, res) => {
  try {
    const { userId, videoId } = req.body;

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND video_id = ?').get(userId, videoId);
    if (existing) {
      return res.status(400).json({ error: 'Zaten favorilerde' });
    }

    db.prepare('INSERT INTO favorites (user_id, video_id) VALUES (?, ?)').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('Favori ekleme hatası:', error);
    res.status(500).json({ error: 'Favorilere eklenemedi' });
  }
});

router.delete('/favorite', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND video_id = ?').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('Favori silme hatası:', error);
    res.status(500).json({ error: 'Favorilerden silinemedi' });
  }
});

router.get('/favorites/:userId', (req, res) => {
  try {
    const favorites = db.prepare(`
      SELECT f.*, v.title, v.banner_url, v.video_url, v.views, v.created_at,
             c.channel_name, u.nickname, u.profile_photo
      FROM favorites f
      JOIN videos v ON f.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.params.userId);

    res.json(favorites);
  } catch (error) {
    console.error('Favoriler hatası:', error);
    res.status(500).json({ error: 'Favoriler alınamadı' });
  }
});

// Kaydedilen videolar
router.post('/saved', (req, res) => {
  try {
    const { userId, videoId } = req.body;

    const existing = db.prepare('SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?').get(userId, videoId);
    if (existing) {
      return res.status(400).json({ error: 'Zaten kaydedildi' });
    }

    db.prepare('INSERT INTO saved_videos (user_id, video_id) VALUES (?, ?)').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    res.status(500).json({ error: 'Video kaydedilemedi' });
  }
});

router.delete('/saved', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    db.prepare('DELETE FROM saved_videos WHERE user_id = ? AND video_id = ?').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('Kayıt silme hatası:', error);
    res.status(500).json({ error: 'Kayıt silinemedi' });
  }
});

router.get('/saved/:userId', (req, res) => {
  try {
    const saved = db.prepare(`
      SELECT s.*, v.title, v.banner_url, v.video_url, v.views, v.created_at,
             c.channel_name, u.nickname, u.profile_photo
      FROM saved_videos s
      JOIN videos v ON s.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(req.params.userId);

    res.json(saved);
  } catch (error) {
    console.error('Kaydedilenler hatası:', error);
    res.status(500).json({ error: 'Kaydedilenler alınamadı' });
  }
});

// Yorum işlemleri
router.post('/comment', (req, res) => {
  try {
    const { videoId, userId, commentText, parentId } = req.body;

    const result = db.prepare('INSERT INTO comments (video_id, user_id, comment_text, parent_id) VALUES (?, ?, ?, ?)')
      .run(videoId, userId, commentText, parentId || null);

    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);

    if (parentId) {
      // Yanıt bildirimi - üst yorumun sahibine
      const parentComment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId);
      if (parentComment && parentComment.user_id !== userId) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(parentComment.user_id, 'comment_reply', `${user.nickname} yorumunuza yanıt verdi: "${commentText.substring(0, 40)}"`, videoId);
      }
    } else {
      // Video sahibine bildirim
      const video = db.prepare('SELECT title, channel_id FROM videos WHERE id = ?').get(videoId);
      const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
      if (channel.user_id !== userId) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(channel.user_id, 'new_comment', `${user.nickname} videonuza yorum yaptı: ${video.title}`, videoId);
      }
    }

    res.json({ success: true, commentId: result.lastInsertRowid });
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

router.get('/comments/:videoId', (req, res) => {
  try {
    const { userId } = req.query;
    // Ana yorumlar + yanıt sayısı + beğeni sayısı
    const comments = db.prepare(`
      SELECT c.*, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as reply_count,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = 1) as likes,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = -1) as dislikes,
             (SELECT like_type FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as user_like
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `).all(userId || 0, req.params.videoId);

    res.json(comments);
  } catch (error) {
    console.error('Yorumlar hatası:', error);
    res.status(500).json({ error: 'Yorumlar alınamadı' });
  }
});

// Yorum yanıtlarını getir
router.get('/comment-replies/:commentId', (req, res) => {
  try {
    const { userId } = req.query;
    const replies = db.prepare(`
      SELECT c.*, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = 1) as likes,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = -1) as dislikes,
             (SELECT like_type FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as user_like
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `).all(userId || 0, req.params.commentId);
    res.json(replies);
  } catch(e) {
    res.status(500).json({ error: 'Yanıtlar alınamadı' });
  }
});

// Yorum beğen/beğenme
router.post('/comment-like', (req, res) => {
  try {
    const { commentId, userId, likeType } = req.body;
    const existing = db.prepare('SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?').get(commentId, userId);

    if (existing) {
      if (existing.like_type === likeType) {
        db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existing.id);
      } else {
        db.prepare('UPDATE comment_likes SET like_type = ? WHERE id = ?').run(likeType, existing.id);
      }
    } else {
      db.prepare('INSERT INTO comment_likes (comment_id, user_id, like_type) VALUES (?, ?, ?)').run(commentId, userId, likeType);
      
      // Beğeni bildirimi gönder (sadece like için, kendi yorumuna değil)
      if (likeType === 1) {
        const comment = db.prepare('SELECT user_id, comment_text FROM comments WHERE id = ?').get(commentId);
        if (comment && comment.user_id !== userId) {
          const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
          db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
            .run(comment.user_id, 'comment_like', `${liker.nickname} yorumunuzu beğendi: "${comment.comment_text.substring(0, 30)}..."`, commentId);
        }
      }
    }

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Beğeni işlemi başarısız' });
  }
});

router.delete('/comment/:commentId', (req, res) => {
  try {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Yorum silme hatası:', error);
    res.status(500).json({ error: 'Yorum silinemedi' });
  }
});

// Beğeni işlemleri
router.post('/like', (req, res) => {
  try {
    const { videoId, userId, likeType } = req.body; // likeType: 1 = beğen, -1 = beğenme

    const existing = db.prepare('SELECT * FROM video_likes WHERE video_id = ? AND user_id = ?').get(videoId, userId);

    if (existing) {
      if (existing.like_type === likeType) {
        // Aynı beğeniyi kaldır
        db.prepare('DELETE FROM video_likes WHERE id = ?').run(existing.id);
        db.prepare(`UPDATE videos SET ${likeType === 1 ? 'likes' : 'dislikes'} = ${likeType === 1 ? 'likes' : 'dislikes'} - 1 WHERE id = ?`)
          .run(videoId);
      } else {
        // Beğeni türünü değiştir
        db.prepare('UPDATE video_likes SET like_type = ? WHERE id = ?').run(likeType, existing.id);
        db.prepare(`UPDATE videos SET likes = likes ${likeType === 1 ? '+ 1' : '- 1'}, dislikes = dislikes ${likeType === 1 ? '- 1' : '+ 1'} WHERE id = ?`)
          .run(videoId);
      }
    } else {
      // Yeni beğeni ekle
      db.prepare('INSERT INTO video_likes (video_id, user_id, like_type) VALUES (?, ?, ?)').run(videoId, userId, likeType);
      db.prepare(`UPDATE videos SET ${likeType === 1 ? 'likes' : 'dislikes'} = ${likeType === 1 ? 'likes' : 'dislikes'} + 1 WHERE id = ?`)
        .run(videoId);

      // Video sahibine bildirim gönder (sadece beğeni için)
      if (likeType === 1) {
        const video = db.prepare('SELECT title, channel_id FROM videos WHERE id = ?').get(videoId);
        const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
        const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);

        if (channel.user_id !== userId) {
          db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
            .run(channel.user_id, 'new_like', `${user.nickname} videonuzu beğendi: ${video.title}`, videoId);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Beğeni hatası:', error);
    res.status(500).json({ error: 'Beğeni işlemi yapılamadı' });
  }
});

router.get('/like-status/:videoId/:userId', (req, res) => {
  try {
    const like = db.prepare('SELECT like_type FROM video_likes WHERE video_id = ? AND user_id = ?')
      .get(req.params.videoId, req.params.userId);
    res.json({ likeType: like ? like.like_type : 0 });
  } catch (error) {
    console.error('Beğeni durumu hatası:', error);
    res.status(500).json({ error: 'Beğeni durumu alınamadı' });
  }
});

// Bildirimler
router.get('/notifications/:userId', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(req.params.userId);

    res.json(notifications);
  } catch (error) {
    console.error('Bildirimler hatası:', error);
    res.status(500).json({ error: 'Bildirimler alınamadı' });
  }
});

router.put('/notification/:notificationId/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.notificationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Bildirim güncellenemedi' });
  }
});

// Tüm bildirimleri okundu yap
router.put('/notifications/:userId/read-all', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Bildirimler güncellenemedi' });
  }
});

// Destekçi kanal işlemleri
router.post('/supporter-channel', (req, res) => {
  try {
    const { channelId, supporterChannelId } = req.body;

    if (channelId === supporterChannelId) {
      return res.status(400).json({ error: 'Kendi kanalınızı ekleyemezsiniz' });
    }

    const existing = db.prepare('SELECT id FROM supporter_channels WHERE channel_id = ? AND supporter_channel_id = ?')
      .get(channelId, supporterChannelId);
    
    if (existing) {
      return res.status(400).json({ error: 'Bu kanal zaten eklendi' });
    }

    db.prepare('INSERT INTO supporter_channels (channel_id, supporter_channel_id) VALUES (?, ?)').run(channelId, supporterChannelId);

    // Destekçi kanal sahibine bildirim gönder
    const channel = db.prepare('SELECT channel_name, user_id FROM channels WHERE id = ?').get(channelId);
    const supporterChannel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(supporterChannelId);

    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(supporterChannel.user_id, 'supporter_request', `${channel.channel_name} sizi destekçi kanal olarak eklemek istiyor`, channelId);

    res.json({ success: true });
  } catch (error) {
    console.error('Destekçi kanal ekleme hatası:', error);
    res.status(500).json({ error: 'Destekçi kanal eklenemedi' });
  }
});

// Bekleyen partner isteklerini getir (bana gelen)
router.get('/partner-requests/:channelId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT sc.*, c.channel_name as requester_name, c.channel_banner as requester_banner,
             u.username, u.profile_photo,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM supporter_channels sc
      JOIN channels c ON sc.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE sc.supporter_channel_id = ? AND sc.status = 'pending'
      ORDER BY sc.created_at DESC
    `).all(req.params.channelId);
    res.json(requests);
  } catch(e) {
    res.status(500).json({ error: 'İstekler alınamadı' });
  }
});
router.get('/partner-sent/:channelId', (req, res) => {
  try {
    const sent = db.prepare(`
      SELECT sc.*, c.channel_name as target_name, c.channel_banner as target_banner,
             u.username, u.profile_photo,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM supporter_channels sc
      JOIN channels c ON sc.supporter_channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE sc.channel_id = ?
      ORDER BY sc.created_at DESC
    `).all(req.params.channelId);
    res.json(sent);
  } catch(e) {
    res.status(500).json({ error: 'Gönderilen istekler alınamadı' });
  }
});

// Bildirimden partner isteğini kabul/red et
router.put('/partner-respond', (req, res) => {
  try {
    const { fromChannelId, toChannelId, action } = req.body;
    const request = db.prepare(
      "SELECT id FROM supporter_channels WHERE channel_id = ? AND supporter_channel_id = ? AND status = 'pending'"
    ).get(fromChannelId, toChannelId);

    if (!request) return res.status(404).json({ error: 'Bekleyen istek bulunamadı' });

    if (action === 'accept') {
      db.prepare("UPDATE supporter_channels SET status = 'accepted' WHERE id = ?").run(request.id);
      const fromCh = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(fromChannelId);
      const toCh = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(toChannelId);
      if (fromCh && toCh) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(fromCh.user_id, 'supporter_accepted', `${toCh.channel_name} partner isteğinizi kabul etti`, toChannelId);
      }
    } else {
      db.prepare('DELETE FROM supporter_channels WHERE id = ?').run(request.id);
    }

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

router.put('/supporter-channel/:id/accept', (req, res) => {
  try {
    const id = req.params.id;
    const supporter = db.prepare('SELECT channel_id, supporter_channel_id FROM supporter_channels WHERE id = ?').get(id);
    
    if (!supporter) return res.status(404).json({ error: 'İstek bulunamadı' });

    db.prepare("UPDATE supporter_channels SET status = 'accepted' WHERE id = ?").run(id);

    // Bildirimi güvenli şekilde gönder
    try {
      const channel = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(supporter.channel_id);
      const supporterChannel = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(supporter.supporter_channel_id);
      if (channel && supporterChannel) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(channel.user_id, 'supporter_accepted', `${supporterChannel.channel_name} partner isteğinizi kabul etti`, supporter.supporter_channel_id);
      }
    } catch(notifErr) { console.error('Bildirim hatası:', notifErr); }

    res.json({ success: true });
  } catch (error) {
    console.error('Partner kabul hatası:', error);
    res.status(500).json({ error: 'Kabul edilemedi: ' + error.message });
  }
});

router.put('/supporter-channel/:id/reject', (req, res) => {
  try {
    const id = req.params.id;
    const supporter = db.prepare('SELECT channel_id, supporter_channel_id FROM supporter_channels WHERE id = ?').get(id);
    
    if (!supporter) return res.status(404).json({ error: 'İstek bulunamadı' });

    db.prepare('DELETE FROM supporter_channels WHERE id = ?').run(id);

    // Bildirimi güvenli şekilde gönder
    try {
      const channel = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(supporter.channel_id);
      const supporterChannel = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(supporter.supporter_channel_id);
      if (channel && supporterChannel) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(channel.user_id, 'supporter_rejected', `${supporterChannel.channel_name} partner isteğinizi reddetti`, supporter.supporter_channel_id);
      }
    } catch(notifErr) { console.error('Bildirim hatası:', notifErr); }

    res.json({ success: true });
  } catch (error) {
    console.error('Partner red hatası:', error);
    res.status(500).json({ error: 'Reddedilemedi: ' + error.message });
  }
});

router.get('/supporter-channels/:channelId', (req, res) => {
  try {
    const channelId = req.params.channelId;
    // İki yönlü: hem isteği alan hem gönderen taraf olarak kabul edilmiş partnerler
    const supporters = db.prepare(`
      SELECT sc.id, sc.status,
             c.id as supporter_channel_id, c.channel_name, c.channel_banner,
             u.username, u.nickname, u.profile_photo
      FROM supporter_channels sc
      JOIN channels c ON (
        CASE WHEN sc.channel_id = ? THEN sc.supporter_channel_id ELSE sc.channel_id END = c.id
      )
      JOIN users u ON c.user_id = u.id
      WHERE (sc.channel_id = ? OR sc.supporter_channel_id = ?) AND sc.status = 'accepted'
    `).all(channelId, channelId, channelId);

    res.json(supporters);
  } catch (error) {
    console.error('Destekçi kanallar hatası:', error);
    res.status(500).json({ error: 'Destekçi kanallar alınamadı' });
  }
});

// Shorts / Reals listesi
router.get('/shorts', (req, res) => {
  try {
    const shorts = db.prepare(`
      SELECT v.*, c.channel_name, c.id as channel_id, c.user_id, u.profile_photo, u.nickname,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE v.is_short = 1
        AND COALESCE(us.is_private, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT 50
    `).all();
    res.json(shorts);
  } catch(e) {
    res.status(500).json({ error: 'Reals alınamadı' });
  }
});

// Chat fotoğraf yükleme
router.post('/upload-chat-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf gerekli' });
    const url = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    res.json({ url });
  } catch(e) {
    console.error('Chat foto yükleme hatası:', e);
    res.status(500).json({ error: 'Fotoğraf yüklenemedi' });
  }
});

// Fotoğraf paylaşımı (kanal gönderisi olarak)
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    const { channelId, title, description, isAd } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf gerekli' });

    const photoUrl = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0)'
    ).run(channelId, title || 'Fotoğraf', description || '', photoUrl, photoUrl, 'Fotoğraf', 'foto');

    res.json({ success: true, photoId: result.lastInsertRowid });
  } catch(e) {
    console.error('Fotoğraf yükleme hatası:', e);
    res.status(500).json({ error: 'Fotoğraf yüklenemedi' });
  }
});

// ==================== ARKADAŞLIK SİSTEMİ ====================

// Arkadaş isteği gönder
router.post('/friend-request', (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (senderId === receiverId) return res.status(400).json({ error: 'Kendinize istek gönderemezsiniz' });

    const existing = db.prepare('SELECT * FROM friendships WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').get(senderId, receiverId, receiverId, senderId);
    if (existing) return res.status(400).json({ error: 'Zaten istek var veya arkadaşsınız' });

    db.prepare("INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, 'pending')").run(senderId, receiverId);

    const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(senderId);
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(receiverId, 'friend_request', `${sender.nickname} size arkadaşlık isteği gönderdi`, senderId);

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Arkadaşlık isteğini kabul et
router.put('/friend-request/:id/accept', (req, res) => {
  try {
    const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(req.params.id);
    if (!friendship) return res.status(404).json({ error: 'İstek bulunamadı' });

    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(req.params.id);

    const receiver = db.prepare('SELECT nickname FROM users WHERE id = ?').get(friendship.receiver_id);
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(friendship.sender_id, 'friend_accepted', `${receiver.nickname} arkadaşlık isteğinizi kabul etti`, friendship.receiver_id);

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Arkadaşlık isteğini reddet / arkadaşlıktan çıkar
router.delete('/friendship/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM friendships WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Arkadaş listesi
router.get('/friends/:userId', (req, res) => {
  try {
    const friends = db.prepare(`
      SELECT f.id, f.status, f.created_at,
             CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END as friend_id,
             u.username, u.nickname, u.profile_photo
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END
      WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = 'accepted'
      ORDER BY u.nickname ASC
    `).all(req.params.userId, req.params.userId, req.params.userId, req.params.userId);
    res.json(friends);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Gelen arkadaşlık istekleri
router.get('/friend-requests/incoming/:userId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT f.id, f.created_at, u.id as sender_id, u.username, u.nickname, u.profile_photo
      FROM friendships f
      JOIN users u ON u.id = f.sender_id
      WHERE f.receiver_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(req.params.userId);
    res.json(requests);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Gönderilen arkadaşlık istekleri
router.get('/friend-requests/sent/:userId', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT f.id, f.status, f.created_at, u.id as receiver_id, u.username, u.nickname, u.profile_photo
      FROM friendships f
      JOIN users u ON u.id = f.receiver_id
      WHERE f.sender_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(req.params.userId);
    res.json(requests);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Kullanıcı ara (arkadaş eklemek için)
router.get('/search-users', (req, res) => {
  try {
    const { q, userId } = req.query;
    if (!q) return res.json([]);
    const users = db.prepare(`
      SELECT id, username, nickname, profile_photo
      FROM users
      WHERE (username LIKE ? OR nickname LIKE ?) AND id != ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, userId || 0);
    res.json(users);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Arkadaşlık durumu kontrol
router.get('/friendship-status/:userId/:targetId', (req, res) => {
  try {
    const f = db.prepare('SELECT * FROM friendships WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').get(req.params.userId, req.params.targetId, req.params.targetId, req.params.userId);
    if (!f) return res.json({ status: 'none' });
    res.json({ status: f.status, id: f.id, isSender: f.sender_id == req.params.userId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Kanal ara
router.get('/search-channels', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const channels = db.prepare(`
      SELECT c.id, c.channel_name, c.channel_banner, u.username, u.profile_photo,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM channels c
      JOIN users u ON c.user_id = u.id
      WHERE c.channel_name LIKE ? OR u.username LIKE ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`);
    res.json(channels);
  } catch(e) {
    res.status(500).json({ error: 'Arama başarısız' });
  }
});

// Video türleri listesi
router.get('/video-types', (req, res) => {
  res.json(VIDEO_TYPES);
});

// Cloudinary upload signature (frontend direkt yükleme için)
router.get('/upload-signature/:type', (req, res) => {
  try {
    const type = req.params.type;
    const folderMap = {
      video: 'teatube/videos',
      banner: 'teatube/banners',
      profile: 'teatube/profiles',
      channel_banner: 'teatube/channel_banners'
    };
    const folder = folderMap[type] || 'teatube/misc';
    const sig = cloudinary.generateUploadSignature(folder, type === 'video' ? 'video' : 'image');
    res.json(sig);
  } catch (error) {
    console.error('Signature hatası:', error);
    res.status(500).json({ error: 'Signature oluşturulamadı' });
  }
});

// Banner yükleme (server üzerinden)
router.post('/upload-banner', upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Banner gerekli' });
    const url = await cloudinary.uploadBanner(req.file.buffer, req.file.originalname);
    res.json({ url });
  } catch (error) {
    console.error('Banner yükleme hatası:', error);
    res.status(500).json({ error: 'Banner yüklenemedi' });
  }
});

// Video URL'lerini kaydet (frontend Cloudinary'e yükledikten sonra)
router.post('/video-save', (req, res) => {
  try {
    const { channelId, title, description, videoType, tags, videoUrl, bannerUrl, commentsEnabled, likesVisible, isShort } = req.body;

    if (!channelId || !title || !videoUrl || !bannerUrl) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(channelId, title, description, videoUrl, bannerUrl, videoType, tags, commentsEnabled || 1, likesVisible || 1, isShort ? 1 : 0);

    // Abonelere bildirim
    const subscribers = db.prepare('SELECT user_id FROM subscriptions WHERE channel_id = ?').all(channelId);
    const channel = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(channelId);
    if (channel) {
      for (const sub of subscribers) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(sub.user_id, 'new_video', `${channel.channel_name} yeni video yükledi: ${title}`, result.lastInsertRowid);
      }
    }

    res.json({ success: true, videoId: result.lastInsertRowid });
  } catch (error) {
    console.error('Video kayıt hatası:', error);
    res.status(500).json({ error: 'Video kaydedilemedi' });
  }
});


// ==================== REKLAM SİSTEMİ ====================

// BCİCS kodu doğrula
router.post('/ad-code/verify', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kod gerekli' });
    const row = db.prepare('SELECT * FROM ad_codes WHERE code = ?').get(code);
    if (!row) return res.status(404).json({ error: 'Geçersiz kod' });
    if (row.used) return res.status(400).json({ error: 'Bu kod daha önce kullanılmış' });
    res.json({ valid: true });
  } catch(e) {
    res.status(500).json({ error: 'Doğrulama başarısız' });
  }
});

// Reklam oluştur (kod kullanarak)
router.post('/ad', (req, res) => {
  try {
    const { videoId, channelId, adTitle, adDescription, code, userId } = req.body;
    if (!videoId || !channelId || !adTitle || !code) {
      return res.status(400).json({ error: 'Eksik alan' });
    }

    // Kodu kontrol et
    const codeRow = db.prepare('SELECT * FROM ad_codes WHERE code = ?').get(code);
    if (!codeRow) return res.status(404).json({ error: 'Geçersiz kod' });
    if (codeRow.used) return res.status(400).json({ error: 'Bu kod daha önce kullanılmış' });

    // Kodu kullanıldı olarak işaretle
    db.prepare('UPDATE ad_codes SET used = 1, used_by = ?, used_at = datetime("now") WHERE code = ?').run(userId || null, code);

    // Reklamı kaydet
    const result = db.prepare(
      'INSERT INTO ads (video_id, channel_id, ad_title, ad_description) VALUES (?, ?, ?, ?)'
    ).run(videoId, channelId, adTitle, adDescription || '');

    res.json({ success: true, adId: result.lastInsertRowid });
  } catch(e) {
    console.error('Reklam oluşturma hatası:', e);
    res.status(500).json({ error: 'Reklam oluşturulamadı' });
  }
});

// Rastgele reklam getir (izleyiciye gösterilecek)
// Kanalın kendi reklamları ve anasayfada o kanala ait reklamlar gösterilmez
router.get('/ad/random', (req, res) => {
  try {
    const { channelId } = req.query;
    let ad;
    if (channelId) {
      ad = db.prepare(`
        SELECT a.*, v.video_url, v.banner_url, v.video_type, v.is_short
        FROM ads a
        JOIN videos v ON a.video_id = v.id
        WHERE a.is_active = 1 AND a.channel_id != ?
        ORDER BY RANDOM() LIMIT 1
      `).get(channelId);
    } else {
      ad = db.prepare(`
        SELECT a.*, v.video_url, v.banner_url, v.video_type, v.is_short
        FROM ads a
        JOIN videos v ON a.video_id = v.id
        WHERE a.is_active = 1
        ORDER BY RANDOM() LIMIT 1
      `).get();
    }
    res.json(ad || null);
  } catch(e) {
    res.status(500).json({ error: 'Reklam alınamadı' });
  }
});

// Kanalın reklamlarını getir
router.get('/ads/channel/:channelId', (req, res) => {
  try {
    const ads = db.prepare(`
      SELECT a.*, v.title as video_title, v.banner_url
      FROM ads a
      JOIN videos v ON a.video_id = v.id
      WHERE a.channel_id = ?
      ORDER BY a.created_at DESC
    `).all(req.params.channelId);
    res.json(ads);
  } catch(e) {
    res.status(500).json({ error: 'Reklamlar alınamadı' });
  }
});

// Reklamı sil/deaktif et
router.delete('/ad/:adId', (req, res) => {
  try {
    db.prepare('UPDATE ads SET is_active = 0 WHERE id = ?').run(req.params.adId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Reklam silinemedi' });
  }
});

// ==================== VİDEO YÖNETİM ====================

// Video sil
router.delete('/video/:videoId', (req, res) => {
  try {
    const { channelId } = req.body;
    // Sahiplik kontrolü
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (channelId && video.channel_id != channelId) return res.status(403).json({ error: 'Yetkisiz' });
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Video silinemedi' });
  }
});

// Video güncelle (başlık, açıklama, yorumlar, beğeniler, gizlilik)
router.put('/video/:videoId', (req, res) => {
  try {
    const { title, description, commentsEnabled, likesVisible, isHidden, channelId } = req.body;
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (channelId && video.channel_id != channelId) return res.status(403).json({ error: 'Yetkisiz' });

    // is_hidden kolonu yoksa ekle
    try { db.prepare('ALTER TABLE videos ADD COLUMN is_hidden INTEGER DEFAULT 0').run(); } catch(e) {}

    db.prepare(`
      UPDATE videos SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        comments_enabled = COALESCE(?, comments_enabled),
        likes_visible = COALESCE(?, likes_visible),
        is_hidden = COALESCE(?, is_hidden)
      WHERE id = ?
    `).run(title ?? null, description ?? null, commentsEnabled ?? null, likesVisible ?? null, isHidden ?? null, req.params.videoId);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Video güncellenemedi' });
  }
});

// ==================== ENGELLEME SİSTEMİ ====================

// Kullanıcı engelle
router.post('/block-user', (req, res) => {
  try {
    const { blockerId, blockedId, blockedIp, blockedDevice } = req.body;
    
    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'Kendinizi engelleyemezsiniz' });
    }

    db.prepare('INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, blocked_ip, blocked_device) VALUES (?, ?, ?, ?)')
      .run(blockerId, blockedId, blockedIp, blockedDevice);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Engelleme başarısız' });
  }
});

// Engeli kaldır
router.delete('/block-user/:blockerId/:blockedId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .run(req.params.blockerId, req.params.blockedId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Engel kaldırılamadı' });
  }
});

// Engellenen kullanıcıları getir
router.get('/blocked-users/:userId', (req, res) => {
  try {
    const blocked = db.prepare(`
      SELECT ub.*, u.username, u.nickname, u.profile_photo
      FROM user_blocks ub
      JOIN users u ON ub.blocked_id = u.id
      WHERE ub.blocker_id = ?
      ORDER BY ub.created_at DESC
    `).all(req.params.userId);
    res.json(blocked);
  } catch(e) {
    res.status(500).json({ error: 'Engellenenler alınamadı' });
  }
});

// Engel kontrolü
router.get('/is-blocked/:userId/:targetId', (req, res) => {
  try {
    const block = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .get(req.params.userId, req.params.targetId);
    res.json({ isBlocked: !!block });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol edilemedi' });
  }
});

// IP/Cihaz bazlı engel kontrolü
router.post('/check-block', (req, res) => {
  try {
    const { userId, targetId, ip, device } = req.body;
    
    // Direkt engel kontrolü
    const directBlock = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .get(targetId, userId);
    
    if (directBlock) {
      return res.json({ isBlocked: true, reason: 'user' });
    }

    // IP bazlı engel kontrolü
    if (ip) {
      const ipBlock = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_ip = ?')
        .get(targetId, ip);
      if (ipBlock) {
        return res.json({ isBlocked: true, reason: 'ip' });
      }
    }

    // Cihaz bazlı engel kontrolü
    if (device) {
      const deviceBlock = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_device = ?')
        .get(targetId, device);
      if (deviceBlock) {
        return res.json({ isBlocked: true, reason: 'device' });
      }
    }

    res.json({ isBlocked: false });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol edilemedi' });
  }
});

// ==================== YORUM YÖNETİMİ ====================

// Yorumu sabitle/sabitlemeyi kaldır
router.put('/comment/:commentId/pin', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    // Video sahibi mi kontrol et
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(videoId);
    const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
    
    if (channel.user_id !== userId) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    // Diğer sabitlemeleri kaldır
    db.prepare('UPDATE comments SET is_pinned = 0 WHERE video_id = ?').run(videoId);
    
    // Bu yorumu sabitle
    db.prepare('UPDATE comments SET is_pinned = 1 WHERE id = ?').run(req.params.commentId);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Sabitleme başarısız' });
  }
});

// Yorumu askıya al/geri al
router.put('/comment/:commentId/hide', (req, res) => {
  try {
    const { userId, videoId, isHidden } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    // Video sahibi mi kontrol et
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(videoId);
    const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
    
    if (channel.user_id !== userId) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    db.prepare('UPDATE comments SET is_hidden = ? WHERE id = ?').run(isHidden ? 1 : 0, req.params.commentId);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// Yorumu video sahibi beğendi olarak işaretle
router.put('/comment/:commentId/owner-like', (req, res) => {
  try {
    const { userId, videoId, liked } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    // Video sahibi mi kontrol et
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(videoId);
    const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
    
    if (channel.user_id !== userId) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    db.prepare('UPDATE comments SET liked_by_owner = ? WHERE id = ?').run(liked ? 1 : 0, req.params.commentId);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

