// Migration script - Railway'de çalışacak
// Bu script server başlarken otomatik çalışacak

const bcrypt = require('bcrypt');
const db = require('./src/database');

async function migrateAdminPassword() {
  try {
    console.log('🔧 Admin şifresi migration başlatılıyor...');
    
    // Yeni şifre: admin123
    const newPassword = 'admin123';
    const hashed = await bcrypt.hash(newPassword, 10);
    
    // admin_password tablosunu güncelle (/admin sayfası bunu kullanıyor)
    const existing = db.prepare('SELECT id FROM admin_password WHERE id = 1').get();
    if (existing) {
      db.prepare('UPDATE admin_password SET password = ? WHERE id = 1').run(hashed);
    } else {
      db.prepare('INSERT INTO admin_password (id, password) VALUES (1, ?)').run(hashed);
    }
    
    // admins tablosunu da güncelle (eski sistem için)
    db.prepare('UPDATE admins SET password = ? WHERE username = ?').run(hashed, 'AdminTeaS');
    
    console.log('✅ Admin şifresi başarıyla güncellendi!');
    console.log('   Şifre: admin123');
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
  }
}

// Export et ki server.js'den çağırabilelim
module.exports = migrateAdminPassword;

// Direkt çalıştırılırsa
if (require.main === module) {
  migrateAdminPassword().then(() => {
    console.log('Migration tamamlandı');
    process.exit(0);
  });
}
