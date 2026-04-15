// Script to update admin password
// Run with: node update-admin-password.js

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

async function updateAdminPassword() {
  const newPassword = 'bcics31622.4128';
  const hashed = await bcrypt.hash(newPassword, 10);
  
  try {
    const result = db.prepare('UPDATE admins SET password = ? WHERE username = ?')
      .run(hashed, 'AdminTeaS');
    
    if (result.changes > 0) {
      console.log('✅ Admin şifresi başarıyla güncellendi!');
      console.log('Yeni şifre: bcics31622.4128');
      console.log('Kullanıcı adı: AdminTeaS');
    } else {
      console.log('❌ Admin kullanıcısı bulunamadı');
    }
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    db.close();
  }
}

updateAdminPassword();
