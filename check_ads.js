const db = require('./src/database');

console.log('\n=== VİDEO REKLAM KONTROLÜ ===\n');

// Tüm videoları kontrol et
const videos = db.prepare('SELECT id, title, is_ad FROM videos ORDER BY id DESC LIMIT 20').all();

console.log('Son 20 video:');
videos.forEach(v => {
  const badge = v.is_ad == 1 ? '🟡 AD' : '⚪ Normal';
  console.log(`${badge} | ID: ${v.id} | is_ad: ${v.is_ad} | ${v.title}`);
});

// İstatistikler
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_ad = 1 THEN 1 ELSE 0 END) as ads,
    SUM(CASE WHEN is_ad = 0 THEN 1 ELSE 0 END) as normal,
    SUM(CASE WHEN is_ad IS NULL THEN 1 ELSE 0 END) as null_count
  FROM videos
`).get();

console.log('\n=== İSTATİSTİKLER ===');
console.log(`Toplam video: ${stats.total}`);
console.log(`Reklam (is_ad=1): ${stats.ads}`);
console.log(`Normal (is_ad=0): ${stats.normal}`);
console.log(`NULL: ${stats.null_count}`);

process.exit(0);
