// Tüm kullanıcılardan rozetleri kaldır
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

try {
  console.log('🔧 Rozetler kaldırılıyor...');
  
  // Tüm kullanıcıların active_badge_id'sini NULL yap
  const result = db.prepare('UPDATE users SET active_badge_id = NULL').run();
  
  console.log(`✅ ${result.changes} kullanıcıdan rozet kaldırıldı`);
  
  // Kontrol
  const withBadge = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE active_badge_id IS NOT NULL').get();
  console.log(`Rozeti olan kullanıcı sayısı: ${withBadge.cnt}`);
  
} catch (error) {
  console.error('❌ HATA:', error.message);
} finally {
  db.close();
}
