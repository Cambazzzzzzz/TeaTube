const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'teatube.db');
const db = new Database(dbPath);

// Random ID oluştur
function generateShareId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

console.log('🔧 Share ID kolonu ekleniyor...');

try {
  // Share ID kolonunu ekle (UNIQUE olmadan)
  try {
    db.prepare(`ALTER TABLE videos ADD COLUMN share_id TEXT`).run();
    console.log('✅ Share ID kolonu eklendi');
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('ℹ️ Share ID kolonu zaten mevcut');
    } else {
      throw err;
    }
  }
  
  // Mevcut videolara random ID ekle
  const videos = db.prepare(`SELECT id FROM videos WHERE share_id IS NULL`).all();
  
  console.log(`📹 ${videos.length} videoya share ID ekleniyor...`);
  
  const updateStmt = db.prepare(`UPDATE videos SET share_id = ? WHERE id = ?`);
  
  videos.forEach((video, index) => {
    const shareId = generateShareId();
    updateStmt.run(shareId, video.id);
    
    if ((index + 1) % 10 === 0) {
      console.log(`✅ ${index + 1}/${videos.length} video güncellendi...`);
    }
  });
  
  if (videos.length === 0) {
    console.log('ℹ️ Güncellenecek video yok');
  } else {
    console.log('🎉 Tüm videolar güncellendi!');
  }
  
  // UNIQUE index oluştur
  try {
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_share_id ON videos(share_id)`).run();
    console.log('✅ Share ID için UNIQUE index oluşturuldu');
  } catch (err) {
    console.log('ℹ️ UNIQUE index zaten mevcut veya oluşturulamadı:', err.message);
  }
  
} catch (err) {
  console.error('❌ Hata:', err);
} finally {
  db.close();
}
