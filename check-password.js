const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('./data/teatube.db');

const user = db.prepare('SELECT username, password FROM users WHERE username = ?').get('Salako');
console.log('Kullanıcı:', user.username);

// Test şifresi
const testPassword = 'test';
bcrypt.compare(testPassword, user.password).then(result => {
  console.log('test şifresi doğru mu?', result);
  
  // Başka şifreler deneyelim
  const passwords = ['123', '1234', 'salako', 'Salako'];
  passwords.forEach(async (pwd) => {
    const match = await bcrypt.compare(pwd, user.password);
    if (match) console.log(`Şifre bulundu: ${pwd}`);
  });
  
  db.close();
});