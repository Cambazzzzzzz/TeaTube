const express = require('express');
const router = express.Router();
const db = require('./database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Token storage (in-memory, basit çözüm)
const validTokens = new Set();

// ==================== HELPER FUNCTIONS ====================

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
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

function logAction(userId, username, ipAddress, action, details = null) {
  try {
    db.prepare('INSERT INTO system_logs (user_id, username, ip_address, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(userId, username, ipAddress, action, details);
  } catch(e) {
    console.error('Log kayıt hatası:', e);
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }
  next();
}

// ==================== AUTH ====================

// Admin giriş
router.post('/teatube-admin/giris', async (req, res) => {
  try {
    const { sifre } = req.body;
    const clientIP = getClientIP(req);
    
    if (!sifre) {
      return res.status(400).json({ error: 'Şifre gerekli' });
    }
    
    // Şifreyi kontrol et
    const adminPw = db.prepare('SELECT password FROM admin_password WHERE id = 1').get();
    if (!adminPw) {
      return res.status(500).json({ error: 'Admin şifresi bulunamadı' });
    }
    
    const valid = await bcrypt.compare(sifre, adminPw.password);
    if (!valid) {
      logAction(null, 'Admin', clientIP, 'admin_login_failed', 'Yanlış şifre');
      return res.status(401).json({ error: 'Yanlış şifre' });
    }
    
    // Token oluştur
    const token = generateToken();
    validTokens.add(token);
    
    logAction(null, 'Admin', clientIP, 'admin_login_success', 'Başarılı giriş');
    
    res.json({ success: true, token });
  } catch(e) {
    console.error('Admin giriş hatası:', e);
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

// ==================== DASHBOARD ====================

// İstatistikler
router.get('/teatube-admin/stats', requireAuth, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const totalVideos = db.prepare('SELECT COUNT(*) as cnt FROM videos').get().cnt;
    
    // Mesajlar - Firebase'de olduğu için 0 döndürüyoruz
    const totalMessages = 0;
    
    // Arkadaşlıklar
    const totalFriendships = db.prepare("SELECT COUNT(*) as cnt FROM friendships WHERE status = 'accepted'").get().cnt;
    
    res.json({
      totalUsers,
      totalVideos,
      totalMessages,
      totalFriendships
    });
  } catch(e) {
    console.error('İstatistik hatası:', e);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ==================== ŞİFRE YÖNETİMİ ====================

// Şifre değiştir
router.post('/teatube-admin/change-password', requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const clientIP = getClientIP(req);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }
    
    const hashedPw = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE admin_password SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .run(hashedPw);
    
    logAction(null, 'Admin', clientIP, 'admin_password_changed', 'Şifre değiştirildi');
    
    res.json({ success: true });
  } catch(e) {
    console.error('Şifre değiştirme hatası:', e);
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

// ==================== SİSTEM LOGLARI ====================

// Logları getir
router.get('/teatube-admin/logs', requireAuth, (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch(e) {
    console.error('Log getirme hatası:', e);
    res.status(500).json({ error: 'Loglar getirilemedi' });
  }
});

// ==================== YEDEK YÖNETİMİ ====================

// Yedek oluştur
router.get('/teatube-admin/backup', requireAuth, (req, res) => {
  try {
    const clientIP = getClientIP(req);
    
    // Tüm videoları al
    const videos = db.prepare('SELECT * FROM videos').all();
    
    // Tüm arkadaşlıkları al
    const friendships = db.prepare('SELECT * FROM friendships').all();
    
    // Kullanıcıları al (şifreler hariç)
    const users = db.prepare('SELECT id, username, nickname, profile_photo, created_at, balance FROM users').all();
    
    // Grupları al
    const groups = db.prepare('SELECT * FROM groups').all();
    const groupMembers = db.prepare('SELECT * FROM group_members').all();
    
    // HİSSE SİSTEMİ - Hisse senetleri
    const stocks = db.prepare('SELECT * FROM stocks').all();
    
    // HİSSE SİSTEMİ - Kullanıcı portföyleri
    const userPortfolios = db.prepare('SELECT * FROM user_portfolios').all();
    
    // HİSSE SİSTEMİ - Hisse işlem geçmişi
    const stockTransactions = db.prepare('SELECT * FROM stock_transactions').all();
    
    const backup = {
      version: '1.0',
      created_at: new Date().toISOString(),
      data: {
        videos,
        friendships,
        users,
        groups,
        groupMembers,
        // HİSSE SİSTEMİ
        stocks,
        userPortfolios,
        stockTransactions
      }
    };
    
    logAction(null, 'Admin', clientIP, 'backup_created', 
      `${videos.length} video, ${friendships.length} arkadaşlık, ${stocks.length} hisse, ${userPortfolios.length} portföy`);
    
    res.json(backup);
  } catch(e) {
    console.error('Yedek oluşturma hatası:', e);
    res.status(500).json({ error: 'Yedek oluşturulamadı' });
  }
});

// Yedek geri yükle
router.post('/teatube-admin/restore', requireAuth, (req, res) => {
  try {
    const backup = req.body;
    const clientIP = getClientIP(req);
    
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Geçersiz yedek dosyası' });
    }
    
    // Transaction başlat
    const restore = db.transaction(() => {
      // Mevcut verileri sil (kullanıcılar hariç - şifreler kaybolmasın)
      db.prepare('DELETE FROM videos').run();
      db.prepare('DELETE FROM friendships').run();
      db.prepare('DELETE FROM groups').run();
      db.prepare('DELETE FROM group_members').run();
      
      // HİSSE SİSTEMİ - Hisse verilerini sil
      db.prepare('DELETE FROM stocks').run();
      db.prepare('DELETE FROM user_portfolios').run();
      db.prepare('DELETE FROM stock_transactions').run();
      
      // Videoları geri yükle
      if (backup.data.videos && backup.data.videos.length > 0) {
        const insertVideo = db.prepare(`
          INSERT INTO videos (id, channel_id, title, description, video_url, banner_url, video_type, tags, 
                             comments_enabled, likes_visible, views, likes, dislikes, duration, created_at, 
                             is_short, text_content, text_type, is_hidden, is_ad, suspended_by_admin, is_suspended)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const video of backup.data.videos) {
          insertVideo.run(
            video.id, video.channel_id, video.title, video.description, video.video_url, 
            video.banner_url, video.video_type, video.tags, video.comments_enabled, 
            video.likes_visible, video.views, video.likes, video.dislikes, video.duration, 
            video.created_at, video.is_short, video.text_content, video.text_type, 
            video.is_hidden, video.is_ad, video.suspended_by_admin, video.is_suspended
          );
        }
      }
      
      // Arkadaşlıkları geri yükle
      if (backup.data.friendships && backup.data.friendships.length > 0) {
        const insertFriendship = db.prepare(`
          INSERT INTO friendships (id, sender_id, receiver_id, status, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const friendship of backup.data.friendships) {
          insertFriendship.run(
            friendship.id, friendship.sender_id, friendship.receiver_id, 
            friendship.status, friendship.created_at
          );
        }
      }
      
      // Kullanıcı bakiyelerini geri yükle
      if (backup.data.users && backup.data.users.length > 0) {
        const updateUserBalance = db.prepare(`
          UPDATE users SET balance = ? WHERE id = ?
        `);
        
        for (const user of backup.data.users) {
          if (user.balance !== undefined) {
            updateUserBalance.run(user.balance, user.id);
          }
        }
      }
      
      // Grupları geri yükle
      if (backup.data.groups && backup.data.groups.length > 0) {
        const insertGroup = db.prepare(`
          INSERT INTO groups (id, name, description, photo, is_private, owner_id, 
                             allow_members_write, allow_members_photo, created_at, photo_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const group of backup.data.groups) {
          insertGroup.run(
            group.id, group.name, group.description, group.photo, group.is_private, 
            group.owner_id, group.allow_members_write, group.allow_members_photo, 
            group.created_at, group.photo_url
          );
        }
      }
      
      // Grup üyelerini geri yükle
      if (backup.data.groupMembers && backup.data.groupMembers.length > 0) {
        const insertMember = db.prepare(`
          INSERT INTO group_members (id, group_id, user_id, role, permissions, 
                                     is_muted, muted_until, is_banned, joined_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const member of backup.data.groupMembers) {
          insertMember.run(
            member.id, member.group_id, member.user_id, member.role, 
            member.permissions, member.is_muted, member.muted_until, 
            member.is_banned, member.joined_at
          );
        }
      }
      
      // HİSSE SİSTEMİ - Hisse senetlerini geri yükle
      if (backup.data.stocks && backup.data.stocks.length > 0) {
        const insertStock = db.prepare(`
          INSERT INTO stocks (id, symbol, name, current_price, change_percent, volume, 
                             market_cap, description, logo_url, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const stock of backup.data.stocks) {
          insertStock.run(
            stock.id, stock.symbol, stock.name, stock.current_price, stock.change_percent,
            stock.volume, stock.market_cap, stock.description, stock.logo_url, 
            stock.is_active, stock.created_at, stock.updated_at
          );
        }
      }
      
      // HİSSE SİSTEMİ - Kullanıcı portföylerini geri yükle
      if (backup.data.userPortfolios && backup.data.userPortfolios.length > 0) {
        const insertPortfolio = db.prepare(`
          INSERT INTO user_portfolios (id, user_id, stock_id, shares_owned, average_price, 
                                      total_invested, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const portfolio of backup.data.userPortfolios) {
          insertPortfolio.run(
            portfolio.id, portfolio.user_id, portfolio.stock_id, portfolio.shares_owned,
            portfolio.average_price, portfolio.total_invested, portfolio.created_at, portfolio.updated_at
          );
        }
      }
      
      // HİSSE SİSTEMİ - Hisse işlem geçmişini geri yükle
      if (backup.data.stockTransactions && backup.data.stockTransactions.length > 0) {
        const insertTransaction = db.prepare(`
          INSERT INTO stock_transactions (id, user_id, stock_id, transaction_type, shares, 
                                         price_per_share, total_amount, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const transaction of backup.data.stockTransactions) {
          insertTransaction.run(
            transaction.id, transaction.user_id, transaction.stock_id, transaction.transaction_type,
            transaction.shares, transaction.price_per_share, transaction.total_amount, transaction.created_at
          );
        }
      }
    });
    
    restore();
    
    logAction(null, 'Admin', clientIP, 'backup_restored', 
      `${backup.data.videos?.length || 0} video, ${backup.data.friendships?.length || 0} arkadaşlık, ${backup.data.stocks?.length || 0} hisse geri yüklendi`);
    
    res.json({ success: true });
  } catch(e) {
    console.error('Yedek geri yükleme hatası:', e);
    res.status(500).json({ error: 'Yedek geri yüklenemedi: ' + e.message });
  }
});

module.exports = router;
