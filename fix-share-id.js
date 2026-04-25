const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'teatube.db');
const db = new Database(dbPath);

console.log('🔍 Veritabanı kontrol ediliyor...');

// Videos tablosundaki kolonları kontrol et
const columns = db.prepare("PRAGMA table_info(videos)").all();
console.log('\n📋 Videos tablosundaki kolonlar:');
columns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

// share_id kolonu var mı?
const hasShareId = columns.some(col => col.name === 'share_id');

if (hasShareId) {
  console.log('\n✅ share_id kolonu zaten mevcut!');
} else {
  console.log('\n❌ share_id kolonu bulunamadı, ekleniyor...');
  try {
    db.exec('ALTER TABLE videos ADD COLUMN share_id TEXT UNIQUE');
    console.log('✅ share_id kolonu başarıyla eklendi!');
  } catch(e) {
    console.error('❌ Hata:', e.message);
  }
}

// Tekrar kontrol et
const columnsAfter = db.prepare("PRAGMA table_info(videos)").all();
const hasShareIdAfter = columnsAfter.some(col => col.name === 'share_id');

if (hasShareIdAfter) {
  console.log('\n✅ Veritabanı hazır! share_id kolonu mevcut.');
} else {
  console.log('\n❌ share_id kolonu hala yok!');
}

db.close();
