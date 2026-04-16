const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('./data/teatube.db');

console.log('=== TESTUSER ŞİFRESİNİ DÜZELT ===');

const newPassword = 'test123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

try {
  const update = db.prepare('UPDATE users SET password = ? WHERE username = ?');
  const result = update.run(hashedPassword, 'testuser');
  
  if (result.changes > 0) {
    console.log('✅ testuser şifresi güncellendi!');
    console.log('Username: testuser');
    console.log('Password: test123');
  } else {
    console.log('❌ testuser bulunamadı, yeni oluşturuluyor...');
    
    const insert = db.prepare(`
      INSERT INTO users (username, nickname, password, birth_date, created_at)
      VALUES (?, ?, ?, '2000-01-01', datetime('now'))
    `);
    
    insert.run('testuser', 'Test User', hashedPassword);
    console.log('✅ testuser oluşturuldu!');
    console.log('Username: testuser');
    console.log('Password: test123');
  }
} catch (e) {
  console.error('Hata:', e.message);
}

db.close();