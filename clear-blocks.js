const Database = require('better-sqlite3');
const db = new Database('./data/teatube.db');

console.log('=== IP BLOKLARINI TEMİZLE ===');

try {
  // IP blocks tablosunu temizle
  db.prepare('DELETE FROM ip_blocks').run();
  console.log('✅ IP blokları temizlendi');
  
  // Login attempts tablosunu temizle
  db.prepare('DELETE FROM login_attempts').run();
  console.log('✅ Login attempt kayıtları temizlendi');
  
  console.log('\n✅ Artık giriş yapabilirsin!');
} catch (e) {
  console.error('Hata:', e.message);
}

db.close();