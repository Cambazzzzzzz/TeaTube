const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('./cloudinary');
const path = require('path');
const fs = require('fs');

// ==================== LOGGING HELPER ====================
function logAction(userId, username, ipAddress, action, details = null) {
  try {
    db.prepare('INSERT INTO system_logs (user_id, username, ip_address, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(userId, username, ipAddress, action, details);
  } catch(e) {
    console.error('Log kayıt hatası:', e);
  }
}

function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
}

// Temp klasörü oluştur
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Disk storage - bÃ¼yÃ¼k dosyalar iÃ§in
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});

const upload = multer({ storage: multer.memoryStorage() });
const uploadDisk = multer({ storage: diskStorage });

// Video tÃ¼rleri listesi
const VIDEO_TYPES = [
  'Vlog', 'GÃ¼nlÃ¼k hayat', 'Challenge', 'Åaka', 'Sosyal deney', 'Sokak rÃ¶portajÄ±',
  'Hikaye anlatÄ±mÄ±', 'Tepki videosu', 'SkeÃ§', 'Parodi', 'Gameplay', "Let's Play",
  'Oyun inceleme', 'Oyun rehberi', 'Speedrun', 'Oyun teorisi', 'Multiplayer videolarÄ±',
  'Minecraft iÃ§erikleri', 'FPS highlights', 'Mobil oyun videolarÄ±', 'Ders anlatÄ±mÄ±',
  'Belgesel', 'Bilim videosu', 'Tarih anlatÄ±mÄ±', 'Teknoloji anlatÄ±mÄ±', 'Kodlama dersleri',
  'Dil Ã¶ÄŸrenme', 'Genel kÃ¼ltÃ¼r', 'NasÄ±l yapÄ±lÄ±r', 'Life hack', 'MÃ¼zik klibi', 'Cover',
  'EnstrÃ¼man performansÄ±', 'Beat yapÄ±mÄ±', 'Remix', 'Karaoke', 'CanlÄ± performans',
  'DJ set', 'ÅarkÄ± analizi', 'Playlist videosu', 'Ã‡izim videosu', 'Speed art',
  'Dijital sanat', 'Grafik tasarÄ±m', 'Logo yapÄ±mÄ±', '3D modelleme', 'Animasyon',
  'Stop motion', 'KarikatÃ¼r', 'NFT iÃ§erikleri', 'Yemek tarifi', 'Yemek deneme',
  'ASMR yemek', 'Fitness', 'Diyet', 'Sabah rutini', 'Gece rutini', 'Minimalizm',
  'Oda turu', 'Ev dekorasyonu', 'ÃœrÃ¼n inceleme', 'Unboxing', 'KarÅŸÄ±laÅŸtÄ±rma',
  'Telefon inceleme', 'Bilgisayar inceleme', 'Gadget tanÄ±tÄ±mÄ±', 'YazÄ±lÄ±m anlatÄ±mÄ±',
  'Uygulama tanÄ±tÄ±mÄ±', 'Yapay zeka iÃ§erikleri', 'Haber videolarÄ±', 'GÃ¼ndem yorum',
  'Spor highlights', 'MaÃ§ analizi', 'Transfer haberleri', 'Motivasyon videosu',
  'BaÅŸarÄ± hikayeleri', 'GiriÅŸimcilik', 'Para kazanma yollarÄ±', 'YatÄ±rÄ±m anlatÄ±mÄ±',
  'Kripto iÃ§erikleri', 'Seyahat vlog', 'Gezi rehberi', 'Kamp videolarÄ±', 'DoÄŸa videolarÄ±',
  'Hayvan videolarÄ±', 'Evcil hayvan eÄŸitimi', 'Komik hayvan videolarÄ±', 'Korku hikayeleri',
  'Gerilim iÃ§erikleri', 'Gizem Ã§Ã¶zme', 'Polisiye anlatÄ±m', 'Film inceleme', 'Dizi inceleme',
  'Spoiler analiz', 'Fragman analizi', 'Edit videolarÄ±', 'Fan yapÄ±mÄ± iÃ§erikler',
  'Shorts / kÄ±sa videolar', 'CanlÄ± yayÄ±n tekrarlarÄ±', 'Podcast videolarÄ±'
];

// IP kontrolÃ¼
function checkIPBlock(ip) {
  const block = db.prepare(`SELECT * FROM ip_blocks WHERE ip_address = ? AND blocked_until > datetime('now')`).get(ip);
  return block;
}

function addIPBlock(ip) {
  const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until) VALUES (?, ?)').run(ip, blockedUntil);
}

// KayÄ±t
router.post('/register', upload.single('profile_photo'), async (req, res) => {
  try {
    const { username, nickname, password, agreed, birth_date } = req.body;

    if (!agreed || agreed !== 'true') {
      return res.status(400).json({ error: 'Kullanım sözleşmesini kabul etmelisiniz' });
    }

    if (!username || !nickname || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun' });
    }

    // Yaş kontrolü
    if (birth_date) {
      const minAgeSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age'").get();
      const minAge = parseInt(minAgeSetting?.value || '15');
      const warningSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'min_age_warning'").get();
      const warningMsg = warningSetting?.value || `Bu platformu kullanmak için ${minAge} yaş ve üstü olmanız gerekir.`;

      const birth = new Date(birth_date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

      if (age < minAge) {
        return res.status(400).json({ error: warningMsg });
      }
    } else {
      return res.status(400).json({ error: 'Doğum tarihi gereklidir' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profilePhoto = '?';

    if (req.file) {
      profilePhoto = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    }

    // Rastgele tema seÃ§
    const themes = [
      'dark', 'neon-purple', 'ocean-blue', 'fire-red', 'forest-green', 
      'gold', 'light', 'midnight-blue', 'orange-fire', 'pink-dream',
      'aurora', 'sunset-glow', 'deep-space', 'emerald-night', 'rose-gold'
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const result = db.prepare(
      'INSERT INTO users (username, nickname, password, profile_photo, theme, birth_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username, nickname, hashedPassword, profilePhoto, randomTheme, birth_date);

    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(result.lastInsertRowid);

    // DemlikÃ§i rozetini ver
    try {
      const demlikBadge = db.prepare("SELECT id FROM badges WHERE name='DemlikÃ§i'").get();
      if (demlikBadge) db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(result.lastInsertRowid, demlikBadge.id);
    } catch(e) {}

    // Log the registration
    const clientIP = getClientIP(req);
    logAction(result.lastInsertRowid, username, clientIP, 'user_registered', `Yeni kullanıcı: ${nickname}`);

    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (error) {
    console.error('KayÄ±t hatasÄ±:', error);
    res.status(500).json({ error: 'KayÄ±t sÄ±rasÄ±nda hata oluÅŸtu' });
  }
});

// GiriÅŸ
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Bypass şifresini DB'den oku
    const bypassSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'bypass_password'").get();
    const ADMIN_PASSWORD = bypassSetting?.value || 'administratorBCİCS41283164128';
    
    // GerÃ§ek IP - tÃ¼m olasÄ± kaynaklar
    let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.headers['x-real-ip']
      || req.headers['cf-connecting-ip']
      || req.connection?.remoteAddress
      || req.socket?.remoteAddress
      || '0.0.0.0';
    
    // IPv6 â†’ IPv4 dÃ¶nÃ¼ÅŸÃ¼mÃ¼
    ip = ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

    // TÃ¼rkiye saati - sistem zaten UTC+3, direkt al
    const nowTR = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).replace('T', ' ');

    // Admin bypass: ban kontrolÃ¼nden Ã¶nce
    const isAdminBypass = password === ADMIN_PASSWORD;
    
    if (isAdminBypass) {
      // TÃ¼m IP banlarÄ±nÄ± kaldÄ±r (sadece bu IP'nin deÄŸil, admin her ÅŸeyi aÅŸabilir)
      db.prepare('DELETE FROM ip_blocks WHERE ip_address = ?').run(ip);
    } else {
      const block = checkIPBlock(ip);
      if (block) {
        return res.status(403).json({ error: 'Çok fazla başarısız deneme! Lütfen 1 saat sonra tekrar dene.', blockedUntil: block.blocked_until });
      }
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 0, ?)')
        .run(username, ip, isAdminBypass ? '[ADMIN_BYPASS]' : password, nowTR);
      if (!isAdminBypass) {
        return res.status(401).json({ error: 'KullanÄ±cÄ± adÄ± veya ÅŸifre hatalÄ±' });
      }
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword && !isAdminBypass) {
      db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 0, ?)')
        .run(username, ip, password, nowTR);

      const failedAttempts = db.prepare(
        `SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND success = 0 AND attempted_at > datetime('now', '-1 hour')`
      ).get(ip);

      // 10 yanlış denemeden sonra 1 saat ban (daha yumuşak)
      if (failedAttempts.count >= 10) {
        // 1 saatlik ban
        db.prepare('INSERT OR REPLACE INTO ip_blocks (ip_address, blocked_until, reason) VALUES (?, datetime("now", "+1 hour"), ?)').run(ip, 'Çok fazla başarısız giriş denemesi');
        return res.status(403).json({ error: '1 saat sonra tekrar dene!' });
      }

      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı', attemptsLeft: 10 - failedAttempts.count });
    }

    db.prepare('INSERT INTO login_attempts (username, ip_address, attempted_password, success, attempted_at) VALUES (?, ?, ?, 1, ?)')
      .run(username, ip, isAdminBypass ? '[ADMIN_BYPASS]' : '***', nowTR);

    // Son IP'yi gÃ¼ncelle
    try { db.prepare('UPDATE users SET last_ip = ? WHERE id = ?').run(ip, user.id); } catch(e) {}

    // Log successful login
    logAction(user.id, username, ip, 'user_login', isAdminBypass ? 'Admin bypass kullanıldı' : 'Normal giriş');

    // Hesap askÄ±ya alÄ±nmÄ±ÅŸ mÄ±?
    if (user.is_suspended && !isAdminBypass) {
      return res.status(403).json({ error: `HesabÄ±nÄ±z askÄ±ya alÄ±nmÄ±ÅŸ.${user.suspend_reason ? ' Sebep: ' + user.suspend_reason : ''}` });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('GiriÅŸ hatasÄ±:', error);
    res.status(500).json({ error: 'GiriÅŸ sÄ±rasÄ±nda hata oluÅŸtu' });
  }
});

// KullanÄ±cÄ± bilgilerini getir
router.get('/user/:userId', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, nickname, profile_photo, created_at, theme, active_badge_id, is_red_verified FROM users WHERE id = ?')
      .get(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }

    // Aktif rozeti getir
    if (user.active_badge_id) {
      const badge = db.prepare('SELECT * FROM badges WHERE id = ?').get(user.active_badge_id);
      user.active_badge = badge || null;
    } else {
      // DemlikÃ§i rozeti varsayÄ±lan
      const demlik = db.prepare("SELECT * FROM badges WHERE name='DemlikÃ§i'").get();
      user.active_badge = demlik || null;
    }

    res.json(user);
  } catch (error) {
    console.error('KullanÄ±cÄ± getirme hatasÄ±:', error);
    res.status(500).json({ error: 'KullanÄ±cÄ± bilgileri alÄ±namadÄ±' });
  }
});

// Giriş denemelerini getir - şifre doğrulaması gerekli
router.post('/login-attempts/:userId', async (req, res) => {
  try {
    const { password } = req.body;
    const bypassSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'bypass_password'").get();
    const ADMIN_PASSWORD = bypassSetting?.value || 'administratorBCİCS41283164128';

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }

    // Åifre doÄŸrulama: kendi ÅŸifresi veya admin ÅŸifresi
    const validPassword = await bcrypt.compare(password, user.password);
    const isAdmin = password === ADMIN_PASSWORD;

    if (!validPassword && !isAdmin) {
      return res.status(401).json({ error: 'Åifre hatalÄ±' });
    }

    const attempts = db.prepare(
      'SELECT ip_address, attempted_password, success, attempted_at FROM login_attempts WHERE username = ? ORDER BY attempted_at DESC LIMIT 100'
    ).all(user.username);

    res.json(attempts);
  } catch (error) {
    console.error('GiriÅŸ denemeleri hatasÄ±:', error);
    res.status(500).json({ error: 'GiriÅŸ denemeleri alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ± adÄ±nÄ± deÄŸiÅŸtir
router.put('/user/:userId/username', async (req, res) => {
  try {
    const { newUsername } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.params.userId);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanÄ±cÄ± adÄ± zaten kullanÄ±lÄ±yor' });
    }

    const lastChange = user.last_username_change ? new Date(user.last_username_change) : null;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (lastChange && lastChange > weekAgo && user.username_change_count >= 2) {
      return res.status(400).json({ error: 'Haftada en fazla 2 kere kullanÄ±cÄ± adÄ± deÄŸiÅŸtirebilirsiniz' });
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
    console.error('KullanÄ±cÄ± adÄ± deÄŸiÅŸtirme hatasÄ±:', error);
    res.status(500).json({ error: 'KullanÄ±cÄ± adÄ± deÄŸiÅŸtirilemedi' });
  }
});

// Takma adÄ± deÄŸiÅŸtir
router.put('/user/:userId/nickname', (req, res) => {
  try {
    const { newNickname } = req.body;
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(newNickname, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Takma ad deÄŸiÅŸtirme hatasÄ±:', error);
    res.status(500).json({ error: 'Takma ad deÄŸiÅŸtirilemedi' });
  }
});

// Profil fotoÄŸrafÄ± deÄŸiÅŸtir
router.put('/user/:userId/photo', upload.single('profile_photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'FotoÄŸraf gerekli' });
    const photoUrl = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(photoUrl, req.params.userId);
    res.json({ success: true, photoUrl });
  } catch(e) {
    console.error('Profil fotoÄŸrafÄ± hatasÄ±:', e);
    res.status(500).json({ error: 'FotoÄŸraf gÃ¼ncellenemedi' });
  }
});

// Åifre deÄŸiÅŸtir
router.put('/user/:userId/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'KullanÄ±cÄ± bulunamadÄ±' });
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Eski ÅŸifre hatalÄ±' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Åifre deÄŸiÅŸtirme hatasÄ±:', error);
    res.status(500).json({ error: 'Åifre deÄŸiÅŸtirilemedi' });
  }
});

// Tema deÄŸiÅŸtir
router.put('/user/:userId/theme', (req, res) => {
  try {
    const { theme } = req.body;
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Tema deÄŸiÅŸtirme hatasÄ±:', error);
    res.status(500).json({ error: 'Tema deÄŸiÅŸtirilemedi' });
  }
});

// AyarlarÄ± getir
router.get('/settings/:userId', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.userId);
    
    if (!settings) {
      db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.params.userId);
      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.userId);
    }

    res.json(settings);
  } catch (error) {
    console.error('Ayarlar getirme hatasÄ±:', error);
    res.status(500).json({ error: 'Ayarlar alÄ±namadÄ±' });
  }
});

// AyarlarÄ± gÃ¼ncelle
router.put('/settings/:userId', (req, res) => {
  try {
    const { search_history_enabled, watch_history_enabled, is_private } = req.body;
    
    db.prepare('UPDATE user_settings SET search_history_enabled = ?, watch_history_enabled = ?, is_private = ? WHERE user_id = ?')
      .run(search_history_enabled, watch_history_enabled, is_private ?? 0, req.params.userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Ayarlar gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ error: 'Ayarlar gÃ¼ncellenemedi' });
  }
});

// Gizli hesap: takip isteÄŸi gÃ¶nder
router.post('/follow-request', (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const existing = db.prepare('SELECT id FROM follow_requests WHERE sender_id = ? AND receiver_id = ?').get(senderId, receiverId);
    if (existing) return res.status(400).json({ error: 'Zaten istek gÃ¶nderildi' });

    db.prepare('INSERT INTO follow_requests (sender_id, receiver_id) VALUES (?, ?)').run(senderId, receiverId);

    // Bildirim gÃ¶nder
    const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(senderId);
    if (sender) {
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(receiverId, 'follow_request', `${sender.nickname} seni takip etmek istiyor`, senderId);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Ä°stek gÃ¶nderilemedi' });
  }
});

// Takip isteÄŸini kabul/red et
router.put('/follow-request/:id/:action', (req, res) => {
  try {
    const { id, action } = req.params;
    const req_ = db.prepare('SELECT * FROM follow_requests WHERE id = ?').get(id);
    if (!req_) return res.status(404).json({ error: 'Ä°stek bulunamadÄ±' });

    if (action === 'accept') {
      db.prepare("UPDATE follow_requests SET status = 'accepted' WHERE id = ?").run(id);
      // ArkadaÅŸlÄ±k kur
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
    res.status(500).json({ error: 'Ä°ÅŸlem baÅŸarÄ±sÄ±z' });
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
    res.status(500).json({ error: 'Ä°stekler alÄ±namadÄ±' });
  }
});

// Kanal gizlilik durumunu kontrol et
router.get('/channel-privacy/:channelId', (req, res) => {
  try {
    const channel = db.prepare('SELECT user_id, is_private_account FROM channels WHERE id = ?').get(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadÄ±' });
    const settings = db.prepare('SELECT is_private FROM user_settings WHERE user_id = ?').get(channel.user_id);
    res.json({ is_private: settings?.is_private || channel.is_private_account || 0 });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol edilemedi' });
  }
});

// Hesap tÃ¼rÃ¼nÃ¼ deÄŸiÅŸtir (KiÅŸisel Hesap / Kanal)
router.put('/account-type/:channelId', (req, res) => {
  try {
    const { accountType } = req.body;
    if (!['personal', 'channel'].includes(accountType)) {
      return res.status(400).json({ error: 'GeÃ§ersiz hesap tÃ¼rÃ¼' });
    }
    db.prepare('UPDATE channels SET account_type = ? WHERE id = ?').run(accountType, req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Hesap tÃ¼rÃ¼ deÄŸiÅŸtirilemedi' });
  }
});

// Hesap tÃ¼rÃ¼nÃ¼ getir
router.get('/account-type/:channelId', (req, res) => {
  try {
    const channel = db.prepare('SELECT account_type FROM channels WHERE id = ?').get(req.params.channelId);
    res.json({ account_type: channel?.account_type || 'channel' });
  } catch(e) {
    res.status(500).json({ error: 'Hesap tÃ¼rÃ¼ alÄ±namadÄ±' });
  }
});

// Arama geÃ§miÅŸini temizle
router.delete('/search-history/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Arama geÃ§miÅŸi temizleme hatasÄ±:', error);
    res.status(500).json({ error: 'Arama geÃ§miÅŸi temizlenemedi' });
  }
});

// zleme geçmişini temizle
router.delete('/watch-history/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM watch_history WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('zleme geçmişi temizleme hatasÄ±:', error);
    res.status(500).json({ error: 'zleme geçmişi temizlenemedi' });
  }
});

// Kanal oluÅŸtur
router.post('/channel', upload.single('channel_banner'), async (req, res) => {
  try {
    const { userId, channelName, about, channelType, channelTags, links, agreed } = req.body;

    if (!agreed || agreed !== 'true') {
      return res.status(400).json({ error: 'Kanal aÃ§ma sÃ¶zleÅŸmesini kabul etmelisiniz' });
    }

    const existingChannel = db.prepare('SELECT id FROM channels WHERE user_id = ?').get(userId);
    if (existingChannel) {
      return res.status(400).json({ error: 'Zaten bir kanalÄ±nÄ±z var' });
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
    console.error('Kanal oluÅŸturma hatasÄ±:', error);
    res.status(500).json({ error: 'Kanal oluÅŸturulamadÄ±' });
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
      return res.status(404).json({ error: 'Kanal bulunamadÄ±' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Kanal getirme hatasÄ±:', error);
    res.status(500).json({ error: 'Kanal bilgileri alÄ±namadÄ±' });
  }
});

// KullanÄ±cÄ±nÄ±n kanalÄ±nÄ± getir
router.get('/channel/user/:userId', (req, res) => {
  try {
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(req.params.userId);
    res.json(channel || null);
  } catch (error) {
    console.error('Kanal getirme hatasÄ±:', error);
    res.status(500).json({ error: 'Kanal bilgileri alÄ±namadÄ±' });
  }
});

// Kanal gÃ¼ncelle
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
    console.error('Kanal gÃ¼ncelleme hatasÄ±:', error);
    res.status(500).json({ error: 'Kanal gÃ¼ncellenemedi' });
  }
});

// Video yÃ¼kle (disk storage - bÃ¼yÃ¼k dosyalar iÃ§in)
router.post('/video', uploadDisk.fields([{ name: 'video' }, { name: 'banner' }]), async (req, res) => {
  const videoPath = req.files?.video?.[0]?.path;
  const bannerPath = req.files?.banner?.[0]?.path;
  
  try {
    const { channelId, title, description, videoType, tags, commentsEnabled, likesVisible, isShort } = req.body;

    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'Video gerekli' });
    }
    // Reals iÃ§in banner zorunlu deÄŸil
    if (!isShort && !req.files.banner) {
      return res.status(400).json({ error: 'Video ve banner gerekli' });
    }

    console.log('Video yÃ¼kleme baÅŸladÄ±:', title, '- Boyut:', (req.files.video[0].size / 1024 / 1024).toFixed(1) + 'MB', isShort ? '[SHORTS]' : '');

    // Video stream ile yÃ¼kle (Ã¶nce video, sonra banner - Reals iÃ§in banner opsiyonel)
    const videoUrl = await cloudinary.uploadVideoFromPath(videoPath, req.files.video[0].originalname);
    console.log('Video yÃ¼klendi:', videoUrl);

    let bannerUrl = videoUrl; // Reals iÃ§in banner yoksa video URL'ini kullan
    if (bannerPath) {
      const bannerBuffer = fs.readFileSync(bannerPath);
      bannerUrl = await cloudinary.uploadBanner(bannerBuffer, req.files.banner[0].originalname);
      console.log('Banner yÃ¼klendi');
    } else if (isShort) {
      // Reals iÃ§in Cloudinary'den video thumbnail al
      bannerUrl = videoUrl.replace('/upload/', '/upload/so_0,w_400,h_400,c_fill/').replace('.mp4', '.jpg').replace('.mov', '.jpg').replace('.webm', '.jpg');
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
          .run(sub.user_id, 'new_video', `${channel.channel_name} yeni video yÃ¼kledi: ${title}`, result.lastInsertRowid);
      }
    }

    res.json({ success: true, videoId: result.lastInsertRowid, videoUrl, bannerUrl });
  } catch (error) {
    console.error('Video yÃ¼kleme hatasÄ±:', error);
    res.status(500).json({ error: 'Video yÃ¼klenemedi', message: error.message });
  } finally {
    // Temp dosyalarÄ± temizle
    try { if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch(e) {}
    try { if (bannerPath && fs.existsSync(bannerPath)) fs.unlinkSync(bannerPath); } catch(e) {}
  }
});

// Video listesi getir (anasayfa)
router.get('/videos', (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE COALESCE(us.is_private, 0) = 0 AND COALESCE(v.is_hidden, 0) = 0 AND COALESCE(v.is_suspended, 0) = 0 AND COALESCE(u.is_suspended, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Engellenen kullanıcıların videolarını filtrele
    if (userId) {
      const blockedUsers = db.prepare(`
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
      `).all(userId, userId).map(b => b.blocked_id || b.blocker_id);
      
      if (blockedUsers.length > 0) {
        videos = videos.filter(v => !blockedUsers.includes(v.user_id));
      }
    }

    res.json(videos);
  } catch (error) {
    console.error('Video listesi hatasÄ±:', error);
    res.status(500).json({ error: 'Videolar alÄ±namadÄ±' });
  }
});

// PopÃ¼ler videolar
router.get('/videos/popular', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE COALESCE(us.is_private, 0) = 0 AND COALESCE(v.is_suspended, 0) = 0 AND COALESCE(u.is_suspended, 0) = 0
      ORDER BY v.views DESC, v.likes DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('PopÃ¼ler videolar hatasÄ±:', error);
    res.status(500).json({ error: 'PopÃ¼ler videolar alÄ±namadÄ±' });
  }
});

// YakÄ±n zamanda yÃ¼klenen videolar
router.get('/videos/recent', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE v.created_at > datetime('now', '-7 days')
        AND COALESCE(us.is_private, 0) = 0
        AND COALESCE(v.is_suspended, 0) = 0
        AND COALESCE(u.is_suspended, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('YakÄ±n videolar hatasÄ±:', error);
    res.status(500).json({ error: 'YakÄ±n videolar alÄ±namadÄ±' });
  }
});

// Abone olunan kanallarÄ±n yeni videolarÄ±
router.get('/videos/subscriptions/:userId', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             (SELECT COUNT(*) FROM watch_history WHERE user_id = ? AND video_id = v.id) as watched
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE c.id IN (SELECT channel_id FROM subscriptions WHERE user_id = ?)
        AND COALESCE(v.is_suspended, 0) = 0
        AND COALESCE(u.is_suspended, 0) = 0
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.userId, req.params.userId, limit, offset);

    res.json(videos);
  } catch (error) {
    console.error('Abonelik videolarÄ± hatasÄ±:', error);
    res.status(500).json({ error: 'Abonelik videolarÄ± alÄ±namadÄ±' });
  }
});

// Video detayÄ±
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
      return res.status(404).json({ error: 'Video bulunamadÄ±' });
    }

    // KullanÄ±cÄ±nÄ±n kaldÄ±ÄŸÄ± yeri getir
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

    // Son 24 saatte bu IP bu videoyu kaÃ§ kez aÃ§mÄ±ÅŸ?
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
    console.error('Video detay hatasÄ±:', error);
    res.status(500).json({ error: 'Video bilgileri alÄ±namadÄ±' });
  }
});

// Kanal videolarÄ±
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
    console.error('Kanal videolarÄ± hatasÄ±:', error);
    res.status(500).json({ error: 'Kanal videolarÄ± alÄ±namadÄ±' });
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

    // Arama geÃ§miÅŸine ekle
    if (userId) {
      const settings = db.prepare('SELECT search_history_enabled FROM user_settings WHERE user_id = ?').get(userId);
      if (!settings || settings.search_history_enabled) {
        db.prepare('INSERT INTO search_history (user_id, search_query) VALUES (?, ?)').run(userId, q);
      }
    }

    const searchTerm = `%${q}%`;
    let videos = db.prepare(`
      SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
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

    // Engellenen kullanıcıların videolarını filtrele
    if (userId) {
      const blockedUsers = db.prepare(`
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
      `).all(userId, userId).map(b => b.blocked_id || b.blocker_id);
      
      if (blockedUsers.length > 0) {
        videos = videos.filter(v => !blockedUsers.includes(v.user_id));
      }
    }

    res.json(videos);
  } catch (error) {
    console.error('Arama hatasÄ±:', error);
    res.status(500).json({ error: 'Arama yapÄ±lamadÄ±' });
  }
});

// Arama geÃ§miÅŸi
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
    console.error('Arama geÃ§miÅŸi hatasÄ±:', error);
    res.status(500).json({ error: 'Arama geÃ§miÅŸi alÄ±namadÄ±' });
  }
});

// zleme geçmişi - tÃ¼m kayÄ±tlar (GeÃ§miÅŸ sayfasÄ± iÃ§in)
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
    console.error('zleme geçmişi hatasÄ±:', error);
    res.status(500).json({ error: 'zleme geçmişi alÄ±namadÄ±' });
  }
});

// Ä°zlenenler - her video bir kez, en son izleneni gÃ¶ster (Ä°zlenenler sayfasÄ± iÃ§in)
router.get('/watched-unique/:userId', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT wh.video_id, MAX(wh.watched_at) as watched_at, wh.watch_duration, wh.total_duration,
             v.title, v.banner_url, v.video_url, v.views, v.likes, v.dislikes, v.is_short,
             c.channel_name, c.id as channel_id, u.nickname, u.profile_photo
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

// zleme geçmişine ekle
router.post('/watch-history', (req, res) => {
  try {
    const { userId, videoId, watchDuration, totalDuration } = req.body;

    const settings = db.prepare('SELECT watch_history_enabled FROM user_settings WHERE user_id = ?').get(userId);
    if (!settings || settings.watch_history_enabled) {
      db.prepare('INSERT INTO watch_history (user_id, video_id, watch_duration, total_duration) VALUES (?, ?, ?, ?)')
        .run(userId, videoId, watchDuration, totalDuration);

      // Algoritma verilerini gÃ¼ncelle
      const video = db.prepare('SELECT video_type, tags FROM videos WHERE id = ?').get(videoId);
      if (video) {
        // Video tÃ¼rÃ¼nÃ¼ algoritma verisine ekle
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
          
          // Bu videoyu daha önce izlemiş mi? (2x izleme = daha yüksek ağırlık)
          const prevWatch = db.prepare('SELECT COUNT(*) as cnt FROM watch_history WHERE user_id = ? AND video_id = ?').get(userId, videoId);
          const isRewatch = prevWatch && prevWatch.cnt > 0;
          const tagWeight = isRewatch ? 0.6 : 0.3; // 2. kez izleme = 2x ağırlık

          for (const tag of tags) {
            const existingTag = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND tag = ?')
              .get(userId, tag);
            
            if (existingTag) {
              db.prepare('UPDATE algorithm_data SET weight = weight + ?, updated_at = datetime("now") WHERE id = ?')
                .run(tagWeight, existingTag.id);
            } else {
              db.prepare('INSERT INTO algorithm_data (user_id, video_type, tag, weight) VALUES (?, ?, ?, ?)')
                .run(userId, video.video_type, tag, tagWeight);
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('zleme geçmişi ekleme hatasÄ±:', error);
    res.status(500).json({ error: 'zleme geçmişi eklenemedi' });
  }
});

// Algoritma Ã¶nerileri
router.get('/videos/recommended/:userId', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // KullanÄ±cÄ±nÄ±n algoritma verilerini al
    const algorithmData = db.prepare(`
      SELECT video_type, tag, weight
      FROM algorithm_data
      WHERE user_id = ?
      ORDER BY weight DESC
      LIMIT 10
    `).all(req.params.userId);

    if (algorithmData.length === 0) {
      // Algoritma verisi yoksa popÃ¼ler videolarÄ± rastgele sÄ±rayla gÃ¶ster
      return res.json(db.prepare(`
        SELECT v.*, c.channel_name, c.user_id, u.profile_photo, u.nickname, u.is_red_verified,
               (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN user_settings us ON us.user_id = c.user_id
        WHERE COALESCE(us.is_private, 0) = 0
        ORDER BY RANDOM()
        LIMIT ? OFFSET ?
      `).all(limit, offset));
    }

    // Ä°zlenmiÅŸ videolarÄ± hariÃ§ tut ama Ã§ok fazla Ã¶nceliklendirme
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
    query += `) ORDER BY not_watched DESC, RANDOM() LIMIT ? OFFSET ?`;

    const params = [...types, ...tags.map(t => `%${t}%`), limit, offset];
    const videos = db.prepare(query).all(...params);

    res.json(videos);
  } catch (error) {
    console.error('Ã–neri algoritmasÄ± hatasÄ±:', error);
    res.status(500).json({ error: 'Ã–neriler alÄ±namadÄ±' });
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
    console.error('Algoritma verileri hatasÄ±:', error);
    res.status(500).json({ error: 'Algoritma verileri alÄ±namadÄ±' });
  }
});

// AlgoritmayÄ± sÄ±fÄ±rla
router.delete('/algorithm/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM algorithm_data WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Algoritma sÄ±fÄ±rlama hatasÄ±:', error);
    res.status(500).json({ error: 'Algoritma sÄ±fÄ±rlanamadÄ±' });
  }
});

// Abonelik iÅŸlemleri
router.post('/subscribe', (req, res) => {
  try {
    const { userId, channelId } = req.body;

    const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?').get(userId, channelId);
    if (existing) {
      return res.status(400).json({ error: 'Zaten abone oldunuz' });
    }

    db.prepare('INSERT INTO subscriptions (user_id, channel_id) VALUES (?, ?)').run(userId, channelId);

    // Kanal sahibine bildirim gÃ¶nder
    const channel = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(channelId);
    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
    
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(channel.user_id, 'new_subscriber', `${user.nickname} kanalÄ±nÄ±za abone oldu`, channelId);

    res.json({ success: true });
  } catch (error) {
    console.error('Abonelik hatasÄ±:', error);
    res.status(500).json({ error: 'Abonelik yapÄ±lamadÄ±' });
  }
});

router.delete('/subscribe', (req, res) => {
  try {
    const { userId, channelId } = req.body;
    db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?').run(userId, channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('Abonelik iptali hatasÄ±:', error);
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
    console.error('Abonelikler hatasÄ±:', error);
    res.status(500).json({ error: 'Abonelikler alÄ±namadÄ±' });
  }
});

router.get('/is-subscribed/:userId/:channelId', (req, res) => {
  try {
    const sub = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?')
      .get(req.params.userId, req.params.channelId);
    res.json({ subscribed: !!sub });
  } catch (error) {
    console.error('Abonelik kontrolÃ¼ hatasÄ±:', error);
    res.status(500).json({ error: 'Abonelik kontrolÃ¼ yapÄ±lamadÄ±' });
  }
});

// Favori iÅŸlemleri
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
    console.error('Favori ekleme hatasÄ±:', error);
    res.status(500).json({ error: 'Favorilere eklenemedi' });
  }
});

router.delete('/favorite', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND video_id = ?').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('Favori silme hatasÄ±:', error);
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
    console.error('Favoriler hatasÄ±:', error);
    res.status(500).json({ error: 'Favoriler alÄ±namadÄ±' });
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
    console.error('Kaydetme hatasÄ±:', error);
    res.status(500).json({ error: 'Video kaydedilemedi' });
  }
});

router.delete('/saved', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    db.prepare('DELETE FROM saved_videos WHERE user_id = ? AND video_id = ?').run(userId, videoId);
    res.json({ success: true });
  } catch (error) {
    console.error('KayÄ±t silme hatasÄ±:', error);
    res.status(500).json({ error: 'KayÄ±t silinemedi' });
  }
});

router.get('/saved/:userId', (req, res) => {
  try {
    const saved = db.prepare(`
      SELECT s.*, v.title, v.banner_url, v.video_url, v.views, v.created_at,
             v.is_short, v.video_type,
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
    console.error('Kaydedilenler hatasÄ±:', error);
    res.status(500).json({ error: 'Kaydedilenler alÄ±namadÄ±' });
  }
});

// Yorum iÅŸlemleri
router.post('/comment', (req, res) => {
  try {
    const { videoId, userId, commentText, parentId } = req.body;

    const result = db.prepare('INSERT INTO comments (video_id, user_id, comment_text, parent_id) VALUES (?, ?, ?, ?)')
      .run(videoId, userId, commentText, parentId || null);

    const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);

    if (parentId) {
      // YanÄ±t bildirimi - Ã¼st yorumun sahibine
      const parentComment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId);
      if (parentComment && parentComment.user_id !== userId) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(parentComment.user_id, 'comment_reply', `${user.nickname} yorumunuza yanÄ±t verdi: "${commentText.substring(0, 40)}"`, videoId);
      }
    } else {
      // Video sahibine bildirim
      const video = db.prepare('SELECT title, channel_id FROM videos WHERE id = ?').get(videoId);
      const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
      if (channel.user_id !== userId) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(channel.user_id, 'new_comment', `${user.nickname} videonuza yorum yaptÄ±: ${video.title}`, videoId);
      }
    }

    res.json({ success: true, commentId: result.lastInsertRowid });

    // Yorum algoritma ağırlığını artır
    try {
      const video = db.prepare('SELECT video_type, tags FROM videos WHERE id = ?').get(videoId);
      if (video && video.tags) {
        const tags = video.tags.split(',').map(t => t.trim()).filter(Boolean);
        for (const tag of tags) {
          const ex = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND tag = ?').get(userId, tag);
          if (ex) db.prepare('UPDATE algorithm_data SET weight = weight + 0.8, updated_at = datetime("now") WHERE id = ?').run(ex.id);
          else db.prepare('INSERT INTO algorithm_data (user_id, video_type, tag, weight) VALUES (?, ?, ?, 0.8)').run(userId, video.video_type, tag);
        }
      }
    } catch(e) {}
  } catch (error) {
    console.error('Yorum ekleme hatasÄ±:', error);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

router.get('/comments/:videoId', (req, res) => {
  try {
    const { userId } = req.query;
    
    // Önce comments tablosunun sütunlarını kontrol et
    let hasPinned = false, hasHidden = false, hasLikedByOwner = false;
    try {
      const cols = db.prepare("PRAGMA table_info(comments)").all();
      const colNames = cols.map(c => c.name);
      hasPinned = colNames.includes('is_pinned');
      hasHidden = colNames.includes('is_hidden');
      hasLikedByOwner = colNames.includes('liked_by_owner');
    } catch(e) {}

    const comments = db.prepare(`
      SELECT c.*, u.nickname, u.profile_photo,
             (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as reply_count,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = 1) as likes,
             (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND like_type = -1) as dislikes,
             (SELECT like_type FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as user_like,
             ${hasPinned ? 'COALESCE(c.is_pinned, 0)' : '0'} as is_pinned,
             ${hasHidden ? 'COALESCE(c.is_hidden, 0)' : '0'} as is_hidden,
             ${hasLikedByOwner ? 'COALESCE(c.liked_by_owner, 0)' : '0'} as liked_by_owner
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ? AND c.parent_id IS NULL
      ORDER BY ${hasPinned ? 'c.is_pinned DESC,' : ''} c.created_at DESC
    `).all(userId || 0, req.params.videoId);

    res.json(comments);
  } catch (error) {
    console.error('Yorumlar hatası:', error);
    res.status(500).json({ error: 'Yorumlar alınamadı', details: error.message });
  }
});

// Yorum yanÄ±tlarÄ±nÄ± getir
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
    res.status(500).json({ error: 'YanÄ±tlar alÄ±namadÄ±' });
  }
});

// Yorum beÄŸen/beÄŸenme
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
      
      // BeÄŸeni bildirimi gÃ¶nder (sadece like iÃ§in, kendi yorumuna deÄŸil)
      if (likeType === 1) {
        const comment = db.prepare('SELECT user_id, comment_text FROM comments WHERE id = ?').get(commentId);
        if (comment && comment.user_id !== userId) {
          const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
          db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
            .run(comment.user_id, 'comment_like', `${liker.nickname} yorumunuzu beÄŸendi: "${comment.comment_text.substring(0, 30)}..."`, commentId);
        }
      }
    }

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'BeÄŸeni iÅŸlemi baÅŸarÄ±sÄ±z' });
  }
});

router.delete('/comment/:commentId', (req, res) => {
  try {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Yorum silme hatasÄ±:', error);
    res.status(500).json({ error: 'Yorum silinemedi' });
  }
});

// Yorum dÃ¼zenle
router.put('/comment/:commentId', (req, res) => {
  try {
    const { commentText, userId } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Yorum bulunamadÄ±' });
    if (comment.user_id !== userId) return res.status(403).json({ error: 'Yetkisiz' });
    db.prepare('UPDATE comments SET comment_text = ? WHERE id = ?').run(commentText, req.params.commentId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Yorum dÃ¼zenlenemedi' });
  }
});

// BeÄŸeni iÅŸlemleri
router.post('/like', (req, res) => {
  try {
    const { videoId, userId, likeType } = req.body; // likeType: 1 = beÄŸen, -1 = beÄŸenme

    const existing = db.prepare('SELECT * FROM video_likes WHERE video_id = ? AND user_id = ?').get(videoId, userId);

    if (existing) {
      if (existing.like_type === likeType) {
        // AynÄ± beÄŸeniyi kaldÄ±r
        db.prepare('DELETE FROM video_likes WHERE id = ?').run(existing.id);
        db.prepare(`UPDATE videos SET ${likeType === 1 ? 'likes' : 'dislikes'} = ${likeType === 1 ? 'likes' : 'dislikes'} - 1 WHERE id = ?`)
          .run(videoId);
      } else {
        // BeÄŸeni tÃ¼rÃ¼nÃ¼ deÄŸiÅŸtir
        db.prepare('UPDATE video_likes SET like_type = ? WHERE id = ?').run(likeType, existing.id);
        db.prepare(`UPDATE videos SET likes = likes ${likeType === 1 ? '+ 1' : '- 1'}, dislikes = dislikes ${likeType === 1 ? '- 1' : '+ 1'} WHERE id = ?`)
          .run(videoId);
      }
    } else {
      // Yeni beÄŸeni ekle
      db.prepare('INSERT INTO video_likes (video_id, user_id, like_type) VALUES (?, ?, ?)').run(videoId, userId, likeType);
      db.prepare(`UPDATE videos SET ${likeType === 1 ? 'likes' : 'dislikes'} = ${likeType === 1 ? 'likes' : 'dislikes'} + 1 WHERE id = ?`)
        .run(videoId);

      // Video sahibine bildirim gÃ¶nder (sadece beÄŸeni iÃ§in)
      if (likeType === 1) {
        const video = db.prepare('SELECT title, channel_id FROM videos WHERE id = ?').get(videoId);
        const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
        const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);

        if (channel.user_id !== userId) {
          db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
            .run(channel.user_id, 'new_like', `${user.nickname} videonuzu beÄŸendi: ${video.title}`, videoId);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('BeÄŸeni hatasÄ±:', error);
    res.status(500).json({ error: 'BeÄŸeni iÅŸlemi yapÄ±lamadÄ±' });
  }
});

router.get('/like-status/:videoId/:userId', (req, res) => {
  try {
    const like = db.prepare('SELECT like_type FROM video_likes WHERE video_id = ? AND user_id = ?')
      .get(req.params.videoId, req.params.userId);
    res.json({ likeType: like ? like.like_type : 0 });
  } catch (error) {
    console.error('BeÄŸeni durumu hatasÄ±:', error);
    res.status(500).json({ error: 'BeÄŸeni durumu alÄ±namadÄ±' });
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
    console.error('Bildirimler hatasÄ±:', error);
    res.status(500).json({ error: 'Bildirimler alÄ±namadÄ±' });
  }
});

router.put('/notification/:notificationId/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.notificationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Bildirim gÃ¼ncellenemedi' });
  }
});

// TÃ¼m bildirimleri okundu yap
router.put('/notifications/:userId/read-all', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Bildirimler gÃ¼ncellenemedi' });
  }
});

// DestekÃ§i kanal iÅŸlemleri
router.post('/supporter-channel', (req, res) => {
  try {
    const { channelId, supporterChannelId } = req.body;

    if (channelId === supporterChannelId) {
      return res.status(400).json({ error: 'Kendi kanalÄ±nÄ±zÄ± ekleyemezsiniz' });
    }

    const existing = db.prepare('SELECT id FROM supporter_channels WHERE channel_id = ? AND supporter_channel_id = ?')
      .get(channelId, supporterChannelId);
    
    if (existing) {
      return res.status(400).json({ error: 'Bu kanal zaten eklendi' });
    }

    db.prepare('INSERT INTO supporter_channels (channel_id, supporter_channel_id) VALUES (?, ?)').run(channelId, supporterChannelId);

    // DestekÃ§i kanal sahibine bildirim gÃ¶nder
    const channel = db.prepare('SELECT channel_name, user_id FROM channels WHERE id = ?').get(channelId);
    const supporterChannel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(supporterChannelId);

    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(supporterChannel.user_id, 'supporter_request', `${channel.channel_name} sizi destekÃ§i kanal olarak eklemek istiyor`, channelId);

    res.json({ success: true });
  } catch (error) {
    console.error('DestekÃ§i kanal ekleme hatasÄ±:', error);
    res.status(500).json({ error: 'DestekÃ§i kanal eklenemedi' });
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
    res.status(500).json({ error: 'Ä°stekler alÄ±namadÄ±' });
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
    res.status(500).json({ error: 'GÃ¶nderilen istekler alÄ±namadÄ±' });
  }
});

// Bildirimden partner isteÄŸini kabul/red et
router.put('/partner-respond', (req, res) => {
  try {
    const { fromChannelId, toChannelId, action } = req.body;
    const request = db.prepare(
      "SELECT id FROM supporter_channels WHERE channel_id = ? AND supporter_channel_id = ? AND status = 'pending'"
    ).get(fromChannelId, toChannelId);

    if (!request) return res.status(404).json({ error: 'Bekleyen istek bulunamadÄ±' });

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
    res.status(500).json({ error: 'Ä°ÅŸlem baÅŸarÄ±sÄ±z' });
  }
});

router.put('/supporter-channel/:id/accept', (req, res) => {
  try {
    const id = req.params.id;
    const supporter = db.prepare('SELECT channel_id, supporter_channel_id FROM supporter_channels WHERE id = ?').get(id);
    
    if (!supporter) return res.status(404).json({ error: 'Ä°stek bulunamadÄ±' });

    db.prepare("UPDATE supporter_channels SET status = 'accepted' WHERE id = ?").run(id);

    // Bildirimi gÃ¼venli ÅŸekilde gÃ¶nder
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
    console.error('Partner kabul hatasÄ±:', error);
    res.status(500).json({ error: 'Kabul edilemedi: ' + error.message });
  }
});

router.put('/supporter-channel/:id/reject', (req, res) => {
  try {
    const id = req.params.id;
    const supporter = db.prepare('SELECT channel_id, supporter_channel_id FROM supporter_channels WHERE id = ?').get(id);
    
    if (!supporter) return res.status(404).json({ error: 'Ä°stek bulunamadÄ±' });

    db.prepare('DELETE FROM supporter_channels WHERE id = ?').run(id);

    // Bildirimi gÃ¼venli ÅŸekilde gÃ¶nder
    try {
      const channel = db.prepare('SELECT user_id, channel_name FROM channels WHERE id = ?').get(supporter.channel_id);
      const supporterChannel = db.prepare('SELECT channel_name FROM channels WHERE id = ?').get(supporter.supporter_channel_id);
      if (channel && supporterChannel) {
        db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
          .run(channel.user_id, 'supporter_rejected', `${supporterChannel.channel_name} partner isteÄŸinizi reddetti`, supporter.supporter_channel_id);
      }
    } catch(notifErr) { console.error('Bildirim hatası:', notifErr); }

    res.json({ success: true });
  } catch (error) {
    console.error('Partner red hatasÄ±:', error);
    res.status(500).json({ error: 'Reddedilemedi: ' + error.message });
  }
});

router.get('/supporter-channels/:channelId', (req, res) => {
  try {
    const channelId = req.params.channelId;
    // Ä°ki yÃ¶nlÃ¼: hem isteÄŸi alan hem gÃ¶nderen taraf olarak kabul edilmiÅŸ partnerler
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
    console.error('DestekÃ§i kanallar hatasÄ±:', error);
    res.status(500).json({ error: 'DestekÃ§i kanallar alÄ±namadÄ±' });
  }
});

// Shorts / Reals listesi
router.get('/shorts', (req, res) => {
  try {
    const { userId, order } = req.query;
    
    // KullanÄ±cÄ±nÄ±n "ilgilenmiyorum" etiketlerini al
    let dislikedTags = [];
    if (userId) {
      const prefs = db.prepare("SELECT tag FROM user_tag_preferences WHERE user_id = ? AND preference = -1").all(userId);
      dislikedTags = prefs.map(p => p.tag.toLowerCase());
    }

    // order=recent â†’ story daireleri iÃ§in created_at DESC, aksi halde RANDOM
    const orderClause = order === 'recent' ? 'v.created_at DESC' : 'RANDOM()';

    const shorts = db.prepare(`
      SELECT v.*, c.channel_name, c.id as channel_id, c.user_id as channel_owner_id, u.profile_photo, u.nickname, u.is_red_verified,
             (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as subscriber_count,
             (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_settings us ON us.user_id = c.user_id
      WHERE v.is_short = 1
        AND COALESCE(us.is_private, 0) = 0
        AND COALESCE(u.is_suspended, 0) = 0
      ORDER BY ${orderClause}
      LIMIT 100
    `).all();

    // Engellenen kullanıcıların shortlarını filtrele
    let filteredByBlock = shorts;
    if (userId) {
      const blockedUsers = db.prepare(`
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
      `).all(userId, userId).map(b => b.blocked_id || b.blocker_id);
      
      if (blockedUsers.length > 0) {
        filteredByBlock = shorts.filter(v => !blockedUsers.includes(v.channel_owner_id));
      }
    }

    // Etiket filtresi uygula
    const filtered = dislikedTags.length > 0
      ? filteredByBlock.filter(v => {
          if (!v.tags) return true;
          const videoTags = v.tags.toLowerCase().split(',').map(t => t.trim());
          return !videoTags.some(t => dislikedTags.includes(t));
        })
      : filteredByBlock;

    res.json(filtered.slice(0, 50));
  } catch(e) {
    res.status(500).json({ error: 'Reals alÄ±namadÄ±' });
  }
});

// Chat fotoÄŸraf yÃ¼kleme
router.post('/upload-chat-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'FotoÄŸraf gerekli' });
    const url = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    res.json({ url });
  } catch(e) {
    console.error('Chat foto yÃ¼kleme hatasÄ±:', e);
    res.status(500).json({ error: 'FotoÄŸraf yÃ¼klenemedi' });
  }
});

// FotoÄŸraf paylaÅŸÄ±mÄ± (kanal gÃ¶nderisi olarak)
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    const { channelId, title, description, isAd } = req.body;
    if (!req.file) return res.status(400).json({ error: 'FotoÄŸraf gerekli' });

    const photoUrl = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0)'
    ).run(channelId, title || 'FotoÄŸraf', description || '', photoUrl, photoUrl, 'FotoÄŸraf', 'foto');

    res.json({ success: true, photoId: result.lastInsertRowid });
  } catch(e) {
    console.error('FotoÄŸraf yÃ¼kleme hatasÄ±:', e);
    res.status(500).json({ error: 'FotoÄŸraf yÃ¼klenemedi' });
  }
});

// Metin paylaÅŸÄ±mÄ± (TeaWeet veya DÃ¼z Metin)
router.post('/text', upload.none(), async (req, res) => {
  try {
    const { channelId, title, description, textContent, textType, tags } = req.body;
    
    if (!textContent) return res.status(400).json({ error: 'Metin iÃ§eriÄŸi gerekli' });

    // Placeholder gÃ¶rsel (metin iÃ§in)
    const placeholderUrl = 'https://via.placeholder.com/400x400/1f1f1f/ffffff?text=' + encodeURIComponent(title.substring(0, 20));

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, text_content, text_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)'
    ).run(
      channelId, 
      title, 
      description || '', 
      placeholderUrl, 
      placeholderUrl, 
      'Metin', 
      textContent, 
      textType || 'plain', 
      tags || 'metin'
    );

    res.json({ success: true, textId: result.lastInsertRowid });
  } catch(e) {
    console.error('Metin yÃ¼kleme hatasÄ±:', e);
    res.status(500).json({ error: 'Metin yÃ¼klenemedi' });
  }
});

// ==================== ARKADAÅLIK SÄ°STEMÄ° ====================

// ArkadaÅŸ isteÄŸi gÃ¶nder
router.post('/friend-request', (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (senderId === receiverId) return res.status(400).json({ error: 'Kendinize istek gÃ¶nderemezsiniz' });

    const existing = db.prepare('SELECT * FROM friendships WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').get(senderId, receiverId, receiverId, senderId);
    if (existing) return res.status(400).json({ error: 'Zaten istek var veya arkadaÅŸsÄ±nÄ±z' });

    db.prepare("INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, 'pending')").run(senderId, receiverId);

    const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(senderId);
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(receiverId, 'friend_request', `${sender.nickname} size arkadaÅŸlÄ±k isteÄŸi gÃ¶nderdi`, senderId);

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ArkadaÅŸlÄ±k isteÄŸini kabul et
router.put('/friend-request/:id/accept', (req, res) => {
  try {
    const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(req.params.id);
    if (!friendship) return res.status(404).json({ error: 'Ä°stek bulunamadÄ±' });

    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(req.params.id);

    const receiver = db.prepare('SELECT nickname FROM users WHERE id = ?').get(friendship.receiver_id);
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(friendship.sender_id, 'friend_accepted', `${receiver.nickname} arkadaÅŸlÄ±k isteğinizi kabul etti`, friendship.receiver_id);

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ArkadaÅŸlÄ±k isteÄŸini reddet / arkadaÅŸlÄ±ktan Ã§Ä±kar
router.delete('/friendship/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM friendships WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ArkadaÅŸ listesi
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

// Gelen arkadaÅŸlÄ±k istekleri
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

// GÃ¶nderilen arkadaÅŸlÄ±k istekleri
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

// KullanÄ±cÄ± ara (arkadaÅŸ eklemek iÃ§in)
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

// ArkadaÅŸlÄ±k durumu kontrol
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
    res.status(500).json({ error: 'Arama baÅŸarÄ±sÄ±z' });
  }
});

// Video tÃ¼rleri listesi
router.get('/video-types', (req, res) => {
  res.json(VIDEO_TYPES);
});

// Cloudinary upload signature (frontend direkt yÃ¼kleme iÃ§in)
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
    console.error('Signature hatasÄ±:', error);
    res.status(500).json({ error: 'Signature oluÅŸturulamadÄ±' });
  }
});

// Banner yÃ¼kleme (server Ã¼zerinden)
router.post('/upload-banner', upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Banner gerekli' });
    const url = await cloudinary.uploadBanner(req.file.buffer, req.file.originalname);
    res.json({ url });
  } catch (error) {
    console.error('Banner yÃ¼kleme hatasÄ±:', error);
    res.status(500).json({ error: 'Banner yÃ¼klenemedi' });
  }
});

// Video URL'lerini kaydet (frontend Cloudinary'e yÃ¼kledikten sonra)
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
          .run(sub.user_id, 'new_video', `${channel.channel_name} yeni video yÃ¼kledi: ${title}`, result.lastInsertRowid);
      }
    }

    res.json({ success: true, videoId: result.lastInsertRowid });
  } catch (error) {
    console.error('Video kayÄ±t hatasÄ±:', error);
    res.status(500).json({ error: 'Video kaydedilemedi' });
  }
});


// ==================== REKLAM SÄ°STEMÄ° ====================

// BCÄ°CS kodu doÄŸrula
router.post('/ad-code/verify', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kod gerekli' });
    const row = db.prepare('SELECT * FROM ad_codes WHERE code = ?').get(code);
    if (!row) return res.status(404).json({ error: 'GeÃ§ersiz kod' });
    if (row.used) return res.status(400).json({ error: 'Bu kod daha Ã¶nce kullanÄ±lmÄ±ÅŸ' });
    res.json({ valid: true });
  } catch(e) {
    res.status(500).json({ error: 'DoÄŸrulama baÅŸarÄ±sÄ±z' });
  }
});

// Reklam oluÅŸtur (kod kullanarak)
router.post('/ad', (req, res) => {
  try {
    const { videoId, channelId, adTitle, adDescription, code, userId } = req.body;
    if (!videoId || !channelId || !adTitle || !code) {
      return res.status(400).json({ error: 'Eksik alan' });
    }

    // Kodu kontrol et
    const codeRow = db.prepare('SELECT * FROM ad_codes WHERE code = ?').get(code);
    if (!codeRow) return res.status(404).json({ error: 'GeÃ§ersiz kod' });
    if (codeRow.used) return res.status(400).json({ error: 'Bu kod daha Ã¶nce kullanÄ±lmÄ±ÅŸ' });

    // Kodu kullanÄ±ldÄ± olarak iÅŸaretle
    db.prepare('UPDATE ad_codes SET used = 1, used_by = ?, used_at = datetime("now") WHERE code = ?').run(userId || null, code);

    // ReklamÄ± kaydet
    const result = db.prepare(
      'INSERT INTO ads (video_id, channel_id, ad_title, ad_description) VALUES (?, ?, ?, ?)'
    ).run(videoId, channelId, adTitle, adDescription || '');

    res.json({ success: true, adId: result.lastInsertRowid });
  } catch(e) {
    console.error('Reklam oluÅŸturma hatasÄ±:', e);
    res.status(500).json({ error: 'Reklam oluÅŸturulamadÄ±' });
  }
});

// Rastgele reklam getir (izleyiciye gÃ¶sterilecek)
// KanalÄ±n kendi reklamlarÄ± ve anasayfada o kanala ait reklamlar gÃ¶sterilmez
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
    res.status(500).json({ error: 'Reklam alÄ±namadÄ±' });
  }
});

// KanalÄ±n reklamlarÄ±nÄ± getir
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
    res.status(500).json({ error: 'Reklamlar alÄ±namadÄ±' });
  }
});

// ReklamÄ± sil/deaktif et
router.delete('/ad/:adId', (req, res) => {
  try {
    db.prepare('UPDATE ads SET is_active = 0 WHERE id = ?').run(req.params.adId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Reklam silinemedi' });
  }
});

// ==================== VÄ°DEO YÃ–NETÄ°M ====================

// Video sil
router.delete('/video/:videoId', (req, res) => {
  try {
    const { channelId } = req.body;
    // Sahiplik kontrolÃ¼
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadÄ±' });
    if (channelId && video.channel_id != channelId) return res.status(403).json({ error: 'Yetkisiz' });
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Video silinemedi' });
  }
});

// Video gÃ¼ncelle (baÅŸlÄ±k, aÃ§Ä±klama, yorumlar, beÄŸeniler, gizlilik)
router.put('/video/:videoId', (req, res) => {
  try {
    const { title, description, commentsEnabled, likesVisible, isHidden, channelId } = req.body;
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video bulunamadÄ±' });
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
    res.status(500).json({ error: 'Video gÃ¼ncellenemedi' });
  }
});

// ==================== ENGELLEME SÄ°STEMÄ° ====================

// KullanÄ±cÄ± engelle
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
    res.status(500).json({ error: 'Engelleme baÅŸarÄ±sÄ±z' });
  }
});

// Engeli kaldÄ±r
router.delete('/block-user/:blockerId/:blockedId', (req, res) => {
  try {
    db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .run(req.params.blockerId, req.params.blockedId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Engel kaldÄ±rÄ±lamadÄ±' });
  }
});

// Engellenen kullanÄ±cÄ±larÄ± getir
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
    res.status(500).json({ error: 'Engellenenler alÄ±namadÄ±' });
  }
});

// Engel kontrolÃ¼ - İKİ YÖNLÜ (blocker veya blocked olarak)
router.get('/is-blocked/:userId/:targetId', (req, res) => {
  try {
    // userId, targetId'yi engellemiş mi VEYA targetId, userId'yi engellemiş mi?
    const block = db.prepare('SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)')
      .get(req.params.userId, req.params.targetId, req.params.targetId, req.params.userId);
    res.json({ isBlocked: !!block });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol edilemedi' });
  }
});

// IP/Cihaz bazlÄ± engel kontrolÃ¼
router.post('/check-block', (req, res) => {
  try {
    const { userId, targetId, ip, device } = req.body;
    
    // Direkt engel kontrolÃ¼
    const directBlock = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .get(targetId, userId);
    
    if (directBlock) {
      return res.json({ isBlocked: true, reason: 'user' });
    }

    // IP bazlÄ± engel kontrolÃ¼
    if (ip) {
      const ipBlock = db.prepare('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_ip = ?')
        .get(targetId, ip);
      if (ipBlock) {
        return res.json({ isBlocked: true, reason: 'ip' });
      }
    }

    // Cihaz bazlÄ± engel kontrolÃ¼
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

// ==================== YORUM YÃ–NETÄ°MÄ° ====================

// Yorumu sabitle/sabitlemeyi kaldÄ±r
router.put('/comment/:commentId/pin', (req, res) => {
  try {
    const { userId, videoId } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadÄ±' });
    }

    // Video sahibi mi kontrol et
    const video = db.prepare('SELECT channel_id FROM videos WHERE id = ?').get(videoId);
    const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);
    
    if (channel.user_id !== userId) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    // DiÄŸer sabitlemeleri kaldÄ±r
    db.prepare('UPDATE comments SET is_pinned = 0 WHERE video_id = ?').run(videoId);
    
    // Bu yorumu sabitle
    db.prepare('UPDATE comments SET is_pinned = 1 WHERE id = ?').run(req.params.commentId);

    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Sabitleme baÅŸarÄ±sÄ±z' });
  }
});

// Yorumu askÄ±ya al/geri al
router.put('/comment/:commentId/hide', (req, res) => {
  try {
    const { userId, videoId, isHidden } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadÄ±' });
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
    res.status(500).json({ error: 'Ä°ÅŸlem baÅŸarÄ±sÄ±z' });
  }
});

// Yorumu video sahibi beÄŸendi olarak iÅŸaretle
router.put('/comment/:commentId/owner-like', (req, res) => {
  try {
    const { userId, videoId, liked } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadÄ±' });
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
    res.status(500).json({ error: 'Ä°ÅŸlem baÅŸarÄ±sÄ±z' });
  }
});


// ==================== ROZET SÄ°STEMÄ° ====================

// KullanÄ±cÄ±nÄ±n rozetlerini getir
router.get('/user/:userId/badges', (req, res) => {
  try {
    const badges = db.prepare(`
      SELECT b.*, ub.is_active
      FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY b.is_system DESC, ub.assigned_at ASC
    `).all(req.params.userId);
    res.json(badges);
  } catch(e) { res.status(500).json({ error: 'Rozetler alÄ±namadÄ±' }); }
});

// Aktif rozeti deÄŸiÅŸtir
router.put('/user/:userId/active-badge', (req, res) => {
  try {
    const { badgeId } = req.body;
    // KullanÄ±cÄ±nÄ±n bu rozete sahip olup olmadÄ±ÄŸÄ±nÄ± kontrol et
    if (badgeId) {
      const has = db.prepare('SELECT id FROM user_badges WHERE user_id=? AND badge_id=?').get(req.params.userId, badgeId);
      if (!has) return res.status(403).json({ error: 'Bu rozete sahip deÄŸilsiniz' });
    }
    db.prepare('UPDATE users SET active_badge_id=? WHERE id=?').run(badgeId || null, req.params.userId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Rozet deÄŸiÅŸtirilemedi' }); }
});

// KayÄ±t olunca DemlikÃ§i rozeti ver
function assignDemlikBadge(userId) {
  try {
    const badge = db.prepare("SELECT id FROM badges WHERE name='DemlikÃ§i'").get();
    if (badge) db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
  } catch(e) {}
}

// HakkÄ±mda gÃ¼ncelle
router.put('/channel/:channelId/about', (req, res) => {
  try {
    const { about } = req.body;
    db.prepare('UPDATE channels SET about = ? WHERE id = ?').run(about || '', req.params.channelId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'GÃ¼ncellenemedi' });
  }
});

// ==================== ENGELLEME ====================

// KullanÄ±cÄ± engelle
router.post('/block', (req, res) => {
  try {
    const { blockerId, blockedId } = req.body;
    db.prepare('INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)').run(blockerId, blockedId);
    // ArkadaÅŸlÄ±ÄŸÄ± da kaldÄ±r
    db.prepare('DELETE FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)').run(blockerId, blockedId, blockedId, blockerId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Engellenemedi' });
  }
});

// Engeli kaldÄ±r
router.delete('/block/:blockedId', (req, res) => {
  try {
    const blockerId = req.query.blockerId;
    db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?').run(blockerId, req.params.blockedId);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Engel kaldÄ±rÄ±lamadÄ±' });
  }
});

// Engellenen kullanÄ±cÄ±lar listesi
router.get('/blocks/:userId', (req, res) => {
  try {
    const blocks = db.prepare(`
      SELECT ub.*, u.username, u.nickname, u.profile_photo
      FROM user_blocks ub
      JOIN users u ON ub.blocked_id = u.id
      WHERE ub.blocker_id = ?
      ORDER BY ub.created_at DESC
    `).all(req.params.userId);
    res.json(blocks);
  } catch(e) {
    res.status(500).json({ error: 'Engellenenler alÄ±namadÄ±' });
  }
});

// Engel kontrolÃ¼
router.get('/is-blocked/:blockerId/:blockedId', (req, res) => {
  try {
    const block = db.prepare('SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)').get(req.params.blockerId, req.params.blockedId, req.params.blockedId, req.params.blockerId);
    res.json({ blocked: !!block });
  } catch(e) {
    res.status(500).json({ error: 'Kontrol yapÄ±lamadÄ±' });
  }
});

// ==================== Ä°LGÄ°LENMÄ°YORUM SÄ°STEMÄ° ====================

// Etikete gÃ¶re ilgilenmiyorum
router.post('/not-interested', (req, res) => {
  try {
    const { userId, tag } = req.body;
    if (!userId || !tag) return res.status(400).json({ error: 'Eksik bilgi' });
    const cleanTag = tag.toLowerCase().trim();
    db.prepare('INSERT OR REPLACE INTO user_tag_preferences (user_id, tag, preference) VALUES (?, ?, -1)').run(userId, cleanTag);
    // Algoritma ağırlığını da düşür
    const ex = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND tag = ?').get(userId, cleanTag);
    if (ex) {
      db.prepare('UPDATE algorithm_data SET weight = MAX(0, weight - 2.0), updated_at = datetime("now") WHERE id = ?').run(ex.id);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kaydedilemedi' });
  }
});

// Etikete göre ilgi göster (pozitif sinyal)
router.post('/interested', (req, res) => {
  try {
    const { userId, tag } = req.body;
    if (!userId || !tag) return res.status(400).json({ error: 'Eksik bilgi' });
    const cleanTag = tag.toLowerCase().trim();
    db.prepare('INSERT OR REPLACE INTO user_tag_preferences (user_id, tag, preference) VALUES (?, ?, 1)').run(userId, cleanTag);
    // Algoritma ağırlığını artır
    const ex = db.prepare('SELECT * FROM algorithm_data WHERE user_id = ? AND tag = ?').get(userId, cleanTag);
    if (ex) {
      db.prepare('UPDATE algorithm_data SET weight = weight + 2.0, updated_at = datetime("now") WHERE id = ?').run(ex.id);
    } else {
      db.prepare('INSERT INTO algorithm_data (user_id, video_type, tag, weight) VALUES (?, ?, ?, 2.0)').run(userId, 'Reals', cleanTag);
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Kaydedilemedi' });
  }
});

// KullanÄ±cÄ±nÄ±n tercihlerini getir
router.get('/tag-preferences/:userId', (req, res) => {
  try {
    const prefs = db.prepare('SELECT * FROM user_tag_preferences WHERE user_id = ?').all(req.params.userId);
    res.json(prefs);
  } catch(e) {
    res.status(500).json({ error: 'Tercihler alÄ±namadÄ±' });
  }
});

module.exports = router;
module.exports.VIDEO_TYPES = VIDEO_TYPES;
module.exports.assignDemlikBadge = assignDemlikBadge;


// ==================== BUG/Ä°STEK SÄ°STEMÄ° ====================

// Bug/Ä°stek gÃ¶nder
router.post('/bug-report', upload.single('photo'), async (req, res) => {
  try {
    const { userId, type, title, description } = req.body;
    let photoUrl = null;

    if (req.file) {
      photoUrl = await cloudinary.uploadProfilePhoto(req.file.buffer, req.file.originalname);
    }

    const result = db.prepare(
      'INSERT INTO bug_reports (user_id, type, title, description, photo_url) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, type, title, description, photoUrl);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) {
    console.error('Bug raporu hatasÄ±:', e);
    res.status(500).json({ error: 'Rapor gÃ¶nderilemedi' });
  }
});

// TÃ¼m bug/istekleri getir
router.get('/bug-reports', (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT br.*, u.nickname, u.profile_photo
      FROM bug_reports br
      JOIN users u ON u.id = br.user_id
      ORDER BY br.created_at DESC
    `).all();
    res.json(reports);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Bug/Ä°stek durumunu gÃ¼ncelle (admin)
router.put('/bug-report/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE bug_reports SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== YENÄ°LÄ°KLER SÄ°STEMÄ° ====================

// Yenilik ekle (admin)
router.post('/announcement', (req, res) => {
  try {
    const { title, content } = req.body;
    const result = db.prepare(
      'INSERT INTO announcements (title, content) VALUES (?, ?)'
    ).run(title, content);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// TÃ¼m yenilikleri getir
router.get('/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(announcements);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Yenilik sil (admin)
router.delete('/announcement/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;




// ==================== KULLANIM KOŞULLARI ====================

// Kullanım koşullarını getir (kullanıcı tarafı)
router.get('/terms', (req, res) => {
  try {
    const terms = db.prepare('SELECT content, version, updated_at FROM terms_of_service ORDER BY version DESC LIMIT 1').get();
    res.json(terms || { content: 'Kullanım koşulları henüz belirlenmemiş.', version: 0 });
  } catch(e) {
    res.status(500).json({ error: 'Kullanım koşulları alınamadı' });
  }
});
