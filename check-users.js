const Database = require('better-sqlite3');
const db = new Database('./data/teatube.db');

console.log('=== KULLANICILAR ===');
const users = db.prepare('SELECT id, username, nickname, created_at FROM users LIMIT 10').all();
console.log('Toplam kullanıcı:', users.length);
users.forEach(u => {
  console.log(`- ${u.id}: ${u.username} (${u.nickname}) - ${u.created_at}`);
});

console.log('\n=== TEST KULLANICISI OLUŞTUR ===');
const bcrypt = require('bcrypt');
const hashedPassword = bcrypt.hashSync('test123', 10);

try {
  const insert = db.prepare(`
    INSERT INTO users (username, nickname, password, agreed, birth_date, created_at)
    VALUES (?, ?, ?, 1, '2000-01-01', datetime('now'))
  `);
  
  const result = insert.run('testuser', 'Test User', hashedPassword);
  console.log('✅ Test kullanıcısı oluşturuldu!');
  console.log('Username: testuser');
  console.log('Password: test123');
  console.log('ID:', result.lastInsertRowid);
} catch (e) {
  if (e.message.includes('UNIQUE')) {
    console.log('⚠️ testuser zaten var');
    const existing = db.prepare('SELECT id, username, nickname FROM users WHERE username = ?').get('testuser');
    console.log('Mevcut:', existing);
  } else {
    console.error('Hata:', e.message);
  }
}

db.close();