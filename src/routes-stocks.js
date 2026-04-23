const express = require('express');
const router = express.Router();
const db = require('./database');

// ==================== HİSSE SENETLERİ ====================

// Tüm hisse senetlerini getir
router.get('/stocks', (req, res) => {
  try {
    const stocks = db.prepare('SELECT * FROM stocks WHERE is_active = 1 ORDER BY symbol').all();
    res.json(stocks);
  } catch(e) {
    console.error('Hisse senetleri getirme hatası:', e);
    res.status(500).json({ error: 'Hisse senetleri getirilemedi' });
  }
});

// Kullanıcının portföyünü getir
router.get('/stocks/portfolio/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const portfolio = db.prepare(`
      SELECT p.*, s.symbol, s.name, s.current_price, s.logo_url,
             (p.shares_owned * s.current_price) as current_value,
             ((p.shares_owned * s.current_price) - p.total_invested) as profit_loss,
             (((p.shares_owned * s.current_price) - p.total_invested) / p.total_invested * 100) as profit_loss_percent
      FROM user_portfolios p
      JOIN stocks s ON p.stock_id = s.id
      WHERE p.user_id = ? AND p.shares_owned > 0
      ORDER BY current_value DESC
    `).all(userId);
    
    res.json(portfolio);
  } catch(e) {
    console.error('Portföy getirme hatası:', e);
    res.status(500).json({ error: 'Portföy getirilemedi' });
  }
});

// Kullanıcının bakiyesini getir
router.get('/stocks/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    res.json({ balance: user.balance || 0 });
  } catch(e) {
    console.error('Bakiye getirme hatası:', e);
    res.status(500).json({ error: 'Bakiye getirilemedi' });
  }
});

// Hisse satın al
router.post('/stocks/buy', (req, res) => {
  try {
    const { userId, stockId, shares, pricePerShare } = req.body;
    
    if (!userId || !stockId || !shares || !pricePerShare || shares <= 0) {
      return res.status(400).json({ error: 'Geçersiz parametreler' });
    }
    
    const totalCost = shares * pricePerShare;
    
    // Transaction başlat
    const buyStock = db.transaction(() => {
      // Kullanıcının bakiyesini kontrol et
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
      if (!user || user.balance < totalCost) {
        throw new Error('Yetersiz bakiye');
      }
      
      // Bakiyeyi düş
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(totalCost, userId);
      
      // Portföyü güncelle veya oluştur
      const existingPortfolio = db.prepare('SELECT * FROM user_portfolios WHERE user_id = ? AND stock_id = ?').get(userId, stockId);
      
      if (existingPortfolio) {
        // Mevcut portföyü güncelle
        const newTotalShares = existingPortfolio.shares_owned + shares;
        const newTotalInvested = existingPortfolio.total_invested + totalCost;
        const newAveragePrice = newTotalInvested / newTotalShares;
        
        db.prepare(`
          UPDATE user_portfolios 
          SET shares_owned = ?, total_invested = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND stock_id = ?
        `).run(newTotalShares, newTotalInvested, newAveragePrice, userId, stockId);
      } else {
        // Yeni portföy oluştur
        db.prepare(`
          INSERT INTO user_portfolios (user_id, stock_id, shares_owned, average_price, total_invested)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, stockId, shares, pricePerShare, totalCost);
      }
      
      // İşlem geçmişine ekle
      db.prepare(`
        INSERT INTO stock_transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount)
        VALUES (?, ?, 'buy', ?, ?, ?)
      `).run(userId, stockId, shares, pricePerShare, totalCost);
    });
    
    buyStock();
    
    res.json({ success: true, message: 'Hisse başarıyla satın alındı' });
  } catch(e) {
    console.error('Hisse satın alma hatası:', e);
    res.status(500).json({ error: e.message || 'Hisse satın alınamadı' });
  }
});

// Hisse sat
router.post('/stocks/sell', (req, res) => {
  try {
    const { userId, stockId, shares, pricePerShare } = req.body;
    
    if (!userId || !stockId || !shares || !pricePerShare || shares <= 0) {
      return res.status(400).json({ error: 'Geçersiz parametreler' });
    }
    
    const totalRevenue = shares * pricePerShare;
    
    // Transaction başlat
    const sellStock = db.transaction(() => {
      // Kullanıcının portföyünü kontrol et
      const portfolio = db.prepare('SELECT * FROM user_portfolios WHERE user_id = ? AND stock_id = ?').get(userId, stockId);
      
      if (!portfolio || portfolio.shares_owned < shares) {
        throw new Error('Yetersiz hisse');
      }
      
      // Bakiyeyi artır
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalRevenue, userId);
      
      // Portföyü güncelle
      const newShares = portfolio.shares_owned - shares;
      const soldRatio = shares / portfolio.shares_owned;
      const newTotalInvested = portfolio.total_invested * (1 - soldRatio);
      
      if (newShares > 0) {
        db.prepare(`
          UPDATE user_portfolios 
          SET shares_owned = ?, total_invested = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND stock_id = ?
        `).run(newShares, newTotalInvested, userId, stockId);
      } else {
        // Tüm hisseler satıldı, portföyden kaldır
        db.prepare('DELETE FROM user_portfolios WHERE user_id = ? AND stock_id = ?').run(userId, stockId);
      }
      
      // İşlem geçmişine ekle
      db.prepare(`
        INSERT INTO stock_transactions (user_id, stock_id, transaction_type, shares, price_per_share, total_amount)
        VALUES (?, ?, 'sell', ?, ?, ?)
      `).run(userId, stockId, shares, pricePerShare, totalRevenue);
    });
    
    sellStock();
    
    res.json({ success: true, message: 'Hisse başarıyla satıldı' });
  } catch(e) {
    console.error('Hisse satma hatası:', e);
    res.status(500).json({ error: e.message || 'Hisse satılamadı' });
  }
});

// İşlem geçmişini getir
router.get('/stocks/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const transactions = db.prepare(`
      SELECT t.*, s.symbol, s.name
      FROM stock_transactions t
      JOIN stocks s ON t.stock_id = s.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 50
    `).all(userId);
    
    res.json(transactions);
  } catch(e) {
    console.error('İşlem geçmişi getirme hatası:', e);
    res.status(500).json({ error: 'İşlem geçmişi getirilemedi' });
  }
});

// Hisse fiyatlarını güncelle (simülasyon)
router.post('/stocks/update-prices', (req, res) => {
  try {
    const stocks = db.prepare('SELECT * FROM stocks WHERE is_active = 1').all();
    
    const updatePrice = db.prepare(`
      UPDATE stocks 
      SET current_price = ?, change_percent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const updateTransaction = db.transaction(() => {
      for (const stock of stocks) {
        // %5 ile %5 arasında rastgele değişim
        const changePercent = (Math.random() - 0.5) * 10; // -5% ile +5% arası
        const newPrice = stock.current_price * (1 + changePercent / 100);
        
        // Minimum 1 TL
        const finalPrice = Math.max(1, Math.round(newPrice * 100) / 100);
        const finalChangePercent = ((finalPrice - stock.current_price) / stock.current_price) * 100;
        
        updatePrice.run(finalPrice, finalChangePercent, stock.id);
      }
    });
    
    updateTransaction();
    
    res.json({ success: true, message: 'Hisse fiyatları güncellendi' });
  } catch(e) {
    console.error('Fiyat güncelleme hatası:', e);
    res.status(500).json({ error: 'Fiyatlar güncellenemedi' });
  }
});

module.exports = router;