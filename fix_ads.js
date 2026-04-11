const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

console.log('Tüm videoların is_ad değeri 0 yapılıyor...');

const result = db.prepare('UPDATE videos SET is_ad = 0').run();

console.log(`✅ ${result.changes} video güncellendi!`);
console.log('Artık sadece reklam olarak işaretlenen videolar AD badge gösterecek.');

db.close();
