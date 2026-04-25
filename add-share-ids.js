// Database.js'den db'yi al
const db = require('./src/database');

console.log('🔄 Eski videolara share_id ekleniyor...\n');

// Random share_id oluştur
const generateShareId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 11; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// share_id olmayan videoları bul
try {
  const videosWithoutShareId = db.prepare('SELECT id, title FROM videos WHERE share_id IS NULL OR share_id = ""').all();

  console.log(`📹 ${videosWithoutShareId.length} video bulundu\n`);

  let updated = 0;
  for (const video of videosWithoutShareId) {
    let shareId = generateShareId();
    
    // Benzersiz olduğundan emin ol
    let existing = db.prepare('SELECT id FROM videos WHERE share_id = ?').get(shareId);
    while (existing) {
      shareId = generateShareId();
      existing = db.prepare('SELECT id FROM videos WHERE share_id = ?').get(shareId);
    }
    
    db.prepare('UPDATE videos SET share_id = ? WHERE id = ?').run(shareId, video.id);
    console.log(`✅ Video #${video.id} "${video.title}" → ${shareId}`);
    updated++;
  }

  console.log(`\n✅ ${updated} video güncellendi!`);
} catch(e) {
  console.error('❌ Hata:', e.message);
  console.log('\n💡 Sunucuyu yeniden başlatmayı deneyin!');
}
