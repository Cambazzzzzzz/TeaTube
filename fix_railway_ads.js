// Railway'deki tüm videoların is_ad değerini 0 yap
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

try {
  const result = db.prepare('UPDATE videos SET is_ad = 0').run();
  console.log(`✅ ${result.changes} video güncellendi - Tüm AD badge'ler kaldırıldı`);
} catch(e) {
  console.error('❌ Hata:', e.message);
}

db.close();
