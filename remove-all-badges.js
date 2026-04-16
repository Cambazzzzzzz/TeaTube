const Database = require('better-sqlite3');
const path = require('path');

// Veritabanı bağlantısı
const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

console.log('🔧 Tüm kullanıcılardan rozetler kaldırılıyor...');

try {
  // Tüm kullanıcıların aktif rozet ID'sini NULL yap
  const result = db.prepare('UPDATE users SET active_badge_id = NULL').run();
  
  console.log('✅ BAŞARILI! Tüm rozetler kaldırıldı');
  console.log(`📊 Güncellenen kullanıcı sayısı: ${result.changes}`);
  
  // Kontrol için kaç kullanıcının rozeti kaldırıldığını göster
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.log(`👥 Toplam kullanıcı sayısı: ${totalUsers}`);
  
  // Hala rozeti olan kullanıcı var mı kontrol et
  const usersWithBadges = db.prepare('SELECT COUNT(*) as count FROM users WHERE active_badge_id IS NOT NULL').get().count;
  console.log(`🏷️  Hala rozeti olan kullanıcı: ${usersWithBadges}`);
  
} catch (error) {
  console.error('❌ HATA:', error.message);
} finally {
  db.close();
}