const express = require('express');
const router = express.Router();
const db = require('./database');
const multer = require('multer');
const upload = multer();

// Metin paylaşımı (kullanıcı kanalı otomatik)
router.post('/text-posts', upload.none(), async (req, res) => {
  try {
    const { user_id, title, content } = req.body;
    
    if (!content) return res.status(400).json({ error: 'Metin içeriği gerekli' });

    // Kullanıcının kanalını bul veya oluştur
    let channel = db.prepare('SELECT id FROM channels WHERE user_id = ?').get(user_id);
    
    if (!channel) {
      // Kullanıcı bilgilerini al
      const user = db.prepare('SELECT nickname, username FROM users WHERE id = ?').get(user_id);
      
      // Otomatik kanal oluştur
      const channelResult = db.prepare(
        'INSERT INTO channels (user_id, channel_name, about, channel_type, agreed) VALUES (?, ?, ?, ?, 1)'
      ).run(user_id, user.nickname || user.username, 'Kişisel kanal', 'Kişisel');
      
      channel = { id: channelResult.lastInsertRowid };
    }

    // Placeholder görsel
    const placeholderUrl = 'https://via.placeholder.com/400x400/1d9bf0/ffffff?text=' + encodeURIComponent((title || content).substring(0, 20));

    const result = db.prepare(
      'INSERT INTO videos (channel_id, title, description, video_url, banner_url, video_type, text_content, text_type, tags, comments_enabled, likes_visible, is_short) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)'
    ).run(
      channel.id, 
      title || 'Metin Paylaşımı', 
      '', 
      placeholderUrl, 
      placeholderUrl, 
      'Metin', 
      content, 
      'plain', 
      'metin,paylaşım'
    );

    res.json({ success: true, postId: result.lastInsertRowid });
  } catch(e) {
    console.error('Metin paylaşma hatası:', e);
    res.status(500).json({ error: 'Metin paylaşılamadı: ' + e.message });
  }
});

module.exports = router;
