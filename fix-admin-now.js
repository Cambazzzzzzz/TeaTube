// ACIL FIX - Admin şifresini direkt güncelle
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'teatube.db'));

// Yeni şifrenin hash'i (bcics31622.4128)
const newHash = '$2b$10$2voHDveRpQaEf9cvX/rp/.9WNi3lpTzXmoS71hl8TcuW.RAZLLWxu';

try {
  const result = db.prepare('UPDATE admins SET password = ? WHERE username = ?')
    .run(newHash, 'AdminTeaS');
  
  console.log('✅ BAŞARILI! Admin şifresi güncellendi');
  console.log('Şifre: bcics31622.4128');
  console.log('Değişen satır:', result.changes);
  
  // Kontrol et
  const admin = db.prepare('SELECT username, password FROM admins WHERE username = ?').get('AdminTeaS');
  console.log('\nAdmin bilgileri:');
  console.log('Username:', admin.username);
  console.log('Password hash:', admin.password);
  
} catch (error) {
  console.error('❌ HATA:', error.message);
} finally {
  db.close();
}
