const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('./data/teatube.db');

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('test', 10);
  
  try {
    // Test kullanıcısını sil (varsa)
    db.prepare('DELETE FROM users WHERE username = ?').run('testuser');
    
    // Yeni test kullanıcısı oluştur
    const result = db.prepare(`
      INSERT INTO users (username, nickname, password, created_at) 
      VALUES (?, ?, ?, datetime('now'))
    `).run('testuser', 'Test User', hashedPassword);
    
    console.log('Test kullanıcısı oluşturuldu:', result.lastInsertRowid);
    
    // Kanal da oluştur
    db.prepare(`
      INSERT INTO channels (user_id, channel_name, account_type, created_at)
      VALUES (?, ?, 'personal', datetime('now'))
    `).run(result.lastInsertRowid, 'Test User');
    
    console.log('Test kanalı oluşturuldu');
    
  } catch (error) {
    console.error('Hata:', error);
  }
  
  db.close();
}

createTestUser();