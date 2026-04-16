const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

console.log('📊 Veritabanı Tabloları:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(table => console.log(`  - ${table.name}`));

console.log('\n📈 İstatistikler:');
try {
  const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  console.log(`  👥 Toplam kullanıcı: ${totalUsers}`);
} catch(e) {
  console.log(`  ❌ Users tablosu hatası: ${e.message}`);
}

try {
  const totalVideos = db.prepare('SELECT COUNT(*) as cnt FROM videos').get().cnt;
  console.log(`  🎥 Toplam video: ${totalVideos}`);
} catch(e) {
  console.log(`  ❌ Videos tablosu hatası: ${e.message}`);
}

try {
  const totalChannels = db.prepare('SELECT COUNT(*) as cnt FROM channels WHERE account_type = "channel"').get().cnt;
  console.log(`  📺 Kanal sayısı: ${totalChannels}`);
} catch(e) {
  console.log(`  ❌ Channels tablosu hatası: ${e.message}`);
}

db.close();