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
    
    const result = db.prepare('UPDATE admins SET password = ? WHERE username = ?')
      .run(hashed, 'AdminTeaS');
    
    if (result.changes > 0) {
      console.log('✅ Admin şifresi başarıyla güncellendi!');
      console.log('   Şifre: admin123');
    } else {
      console.log('⚠️  Admin kullanıcısı bulunamadı veya zaten güncel');
    }
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
