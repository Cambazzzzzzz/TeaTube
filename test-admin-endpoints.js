const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'teatube.db');
const db = new Database(dbPath);

console.log('🧪 Admin endpoint sorgularını test ediyoruz...\n');

// Test 1: Admin stats sorgusu
console.log('1️⃣ Admin Stats Sorgusu:');
try {
  const totalVideos = db.prepare('SELECT COUNT(*) as cnt FROM videos').get().cnt;
  console.log(`   ✅ Toplam video: ${totalVideos}`);
} catch(e) {
  console.log(`   ❌ Hata: ${e.message}`);
}

// Test 2: Video listesi sorgusu (admin panel)
console.log('\n2️⃣ Video Listesi Sorgusu:');
try {
  const videos = db.prepare(`
    SELECT v.*, c.channel_name, u.username, u.nickname
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    ORDER BY v.created_at DESC
    LIMIT 5
  `).all();
  console.log(`   ✅ ${videos.length} video bulundu`);
  if (videos.length > 0) {
    console.log(`   📹 İlk video: "${videos[0].title}"`);
    console.log(`   🔗 share_id: ${videos[0].share_id || 'NULL'}`);
  }
} catch(e) {
  console.log(`   ❌ Hata: ${e.message}`);
}

// Test 3: SELECT * FROM videos sorgusu
console.log('\n3️⃣ SELECT * FROM videos Sorgusu:');
try {
  const video = db.prepare('SELECT * FROM videos LIMIT 1').get();
  if (video) {
    console.log(`   ✅ Video bulundu`);
    console.log(`   📋 Kolonlar: ${Object.keys(video).join(', ')}`);
    console.log(`   🔗 share_id değeri: ${video.share_id || 'NULL'}`);
  } else {
    console.log(`   ⚠️  Hiç video yok`);
  }
} catch(e) {
  console.log(`   ❌ Hata: ${e.message}`);
}

// Test 4: Fotoğraf sorgusu (admin panel)
console.log('\n4️⃣ Fotoğraf Listesi Sorgusu:');
try {
  const photos = db.prepare(`
    SELECT v.*, c.channel_name, u.username, u.nickname
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE v.video_type = 'photo'
    ORDER BY v.created_at DESC
    LIMIT 5
  `).all();
  console.log(`   ✅ ${photos.length} fotoğraf bulundu`);
} catch(e) {
  console.log(`   ❌ Hata: ${e.message}`);
}

console.log('\n✅ Tüm testler tamamlandı!');
db.close();
